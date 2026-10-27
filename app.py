"""School-scoped CBT API.

Authentication uses an opaque, database-backed session in an HttpOnly cookie.
The cookie value is never included in JSON responses; each request resolves the
session and current user/role from the database.
"""
from datetime import datetime, timedelta
from functools import wraps
import hashlib
import json
import os
import secrets
import time

from flask import Flask, jsonify, request, send_from_directory, make_response, g
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func, or_
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

try:
    import cloudinary
    import cloudinary.uploader
    HAS_CLOUDINARY = True
    if os.environ.get("CLOUDINARY_CLOUD_NAME"):
        cloudinary.config(
            cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
            api_key=os.environ.get("CLOUDINARY_API_KEY"),
            api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
        )
except ImportError:
    HAS_CLOUDINARY = False


app = Flask(__name__)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", f"sqlite:///{os.path.join(os.path.abspath(os.path.dirname(__file__)), 'examcore.db')}"
).replace("postgres://", "postgresql://", 1)
app.config["SESSION_COOKIE_NAME"] = os.environ.get("SESSION_COOKIE_NAME", "school_admin_session")
app.config["SESSION_COOKIE_SECURE"] = os.environ.get(
    "COOKIE_SECURE", "true" if os.environ.get("APP_ENV") == "production" else "false"
).lower() == "true"
app.config["SESSION_COOKIE_SAMESITE"] = os.environ.get(
    "COOKIE_SAMESITE", "None" if os.environ.get("APP_ENV") == "production" else "Lax"
)
app.config["SESSION_TTL_HOURS"] = int(os.environ.get("SESSION_TTL_HOURS", "24"))

configured_origins = os.environ.get(
    "FRONTEND_ORIGINS", os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
)
FRONTEND_ORIGINS = [origin.strip() for origin in configured_origins.split(",") if origin.strip()]
CORS(app, resources={r"/api/*": {"origins": FRONTEND_ORIGINS}}, supports_credentials=True)

db = SQLAlchemy(app)
migrate = Migrate(app, db)

BASEDIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASEDIR, "uploads")
AVATAR_FOLDER = os.path.join(UPLOAD_FOLDER, "avatars")
QUESTION_FOLDER = os.path.join(UPLOAD_FOLDER, "questions")
os.makedirs(AVATAR_FOLDER, exist_ok=True)
os.makedirs(QUESTION_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "jfif"}
VALID_ROLES = {"school_admin", "teacher", "exam_officer", "student"}
ADMIN_ROLES = {"school_admin", "teacher", "exam_officer"}


def utcnow():
    return datetime.utcnow()


def iso_utc(value):
    return value.isoformat(timespec="seconds") + "Z" if value else None


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def upload_to_cloudinary(file, folder):
    if HAS_CLOUDINARY and os.environ.get("CLOUDINARY_CLOUD_NAME"):
        try:
            result = cloudinary.uploader.upload(file, folder=folder)
            return result["secure_url"]
        except Exception:
            app.logger.exception("Cloud image upload failed")
    return None


def get_image_url(path):
    if not path:
        return None
    if path.startswith("http"):
        return path
    return f"/uploads/{path}"


class School(db.Model):
    __tablename__ = "schools"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)


class SchoolClass(db.Model):
    __tablename__ = "school_classes"
    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    __table_args__ = (db.UniqueConstraint("school_id", "name", name="uq_school_class_name"),)


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password = db.Column(db.String(200), nullable=False)
    profile_image = db.Column(db.String(1000), nullable=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True)
    role = db.Column(db.String(32), nullable=False, default="student", index=True)
    class_id = db.Column(db.Integer, db.ForeignKey("school_classes.id"), nullable=True, index=True)
    account_status = db.Column(db.String(20), nullable=False, default="active", index=True)
    last_seen_at = db.Column(db.DateTime, nullable=True, index=True)


class Exam(db.Model):
    __tablename__ = "exams"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200))
    examType = db.Column(db.String(80))
    # Retained for compatibility with existing records and frontend payloads.
    subject = db.Column(db.String(500))
    year = db.Column(db.Integer)
    duration = db.Column(db.Integer)
    totalQuestions = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=utcnow)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True)


class ExamSubject(db.Model):
    __tablename__ = "exam_subjects"
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    __table_args__ = (db.UniqueConstraint("exam_id", "name", name="uq_exam_subject_name"),)


class Question(db.Model):
    __tablename__ = "questions"
    id = db.Column(db.Integer, primary_key=True)
    examId = db.Column(db.Integer, db.ForeignKey("exams.id"), nullable=True, index=True)
    examType = db.Column(db.String(80))
    subject = db.Column(db.String(100))
    question = db.Column(db.Text)
    options = db.Column(db.JSON)
    answer = db.Column(db.String(10))
    explanation = db.Column(db.Text)
    year = db.Column(db.Integer, default=2024)
    image_path = db.Column(db.String(1000), nullable=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True)


class CBTResult(db.Model):
    """Legacy personal history record; only visible to its authenticated owner."""
    __tablename__ = "results"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    email = db.Column(db.String(120))
    title = db.Column(db.String(200), default="Practice Test")
    score = db.Column(db.Integer)
    total = db.Column(db.Integer)
    duration = db.Column(db.String(20), default="0m")
    status = db.Column(db.String(20), default="Failed")
    mode = db.Column(db.String(20), default="exam")
    examType = db.Column(db.String(80))
    date = db.Column(db.DateTime, default=utcnow)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True)
    exam_id = db.Column(db.Integer, db.ForeignKey("exams.id"), nullable=True, index=True)
    subject_name = db.Column(db.String(120), nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True, index=True)


class Attempt(db.Model):
    __tablename__ = "attempts"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"), nullable=False, index=True)
    exam_id = db.Column(db.Integer, db.ForeignKey("exams.id"), nullable=False, index=True)
    subject = db.Column(db.String(120), nullable=False, index=True)
    score = db.Column(db.Float, nullable=False)
    total = db.Column(db.Float, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=False, default=utcnow, index=True)

    @property
    def percentage(self):
        return round((self.score / self.total) * 100, 2) if self.total else None


class AuthToken(db.Model):
    __tablename__ = "auth_tokens"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    revoked_at = db.Column(db.DateTime, nullable=True)


def api_error(message, status=400, code=None):
    payload = {"success": False, "error": message}
    if code:
        payload["code"] = code
    return jsonify(payload), status


def json_body():
    return request.get_json(silent=True) or {}


def require_auth(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        raw_token = request.cookies.get(app.config["SESSION_COOKIE_NAME"])
        if not raw_token:
            return api_error("Authentication required.", 401, "unauthenticated")
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        session = AuthToken.query.filter_by(token_hash=token_hash, revoked_at=None).first()
        if not session or session.expires_at <= utcnow():
            return api_error("Session is invalid or expired. Please sign in again.", 401, "invalid_session")
        user = db.session.get(User, session.user_id)
        if not user or user.account_status != "active" or not user.school_id:
            return api_error("This account is not active or assigned to a school.", 403, "account_unavailable")
        g.current_user = user
        g.auth_session = session
        return fn(*args, **kwargs)
    return wrapped


def roles_required(*roles):
    def decorate(fn):
        @wraps(fn)
        @require_auth
        def wrapped(*args, **kwargs):
            if g.current_user.role not in roles:
                return api_error("Your account role cannot access this endpoint.", 403, "forbidden")
            return fn(*args, **kwargs)
        return wrapped
    return decorate


def cookie_response(payload, raw_token=None, clear=False):
    response = make_response(jsonify(payload))
    cookie_name = app.config["SESSION_COOKIE_NAME"]
    if clear:
        response.delete_cookie(cookie_name, path="/", secure=app.config["SESSION_COOKIE_SECURE"], httponly=True,
                               samesite=app.config["SESSION_COOKIE_SAMESITE"])
    elif raw_token:
        response.set_cookie(cookie_name, raw_token, max_age=app.config["SESSION_TTL_HOURS"] * 3600,
                            httponly=True, secure=app.config["SESSION_COOKIE_SECURE"],
                            samesite=app.config["SESSION_COOKIE_SAMESITE"], path="/")
    return response


def issue_session(user):
    raw = secrets.token_urlsafe(40)
    db.session.add(AuthToken(user_id=user.id, token_hash=hashlib.sha256(raw.encode("utf-8")).hexdigest(),
                             expires_at=utcnow() + timedelta(hours=app.config["SESSION_TTL_HOURS"])))
    db.session.commit()
    return raw


def student_payload(user):
    class_row = db.session.get(SchoolClass, user.class_id) if user.class_id else None
    return {"id": user.id, "displayName": user.username, "email": user.email,
            "class": class_row.name if class_row and class_row.school_id == user.school_id else None,
            "accountStatus": user.account_status, "lastSeenAt": iso_utc(user.last_seen_at)}


def subjects_for_exam(exam):
    names = [row.name for row in ExamSubject.query.filter_by(exam_id=exam.id).order_by(ExamSubject.name).all()]
    if not names and exam.subject:
        names = [value.strip() for value in exam.subject.split(",") if value.strip()]
    return names


@app.before_request
def enforce_cookie_origin_for_writes():
    # Cookie authentication on cross-origin requests is only accepted from the
    # configured frontend origins. Requests without Origin remain usable by CLI clients.
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.cookies.get(app.config["SESSION_COOKIE_NAME"]):
        origin = request.headers.get("Origin")
        if origin and origin not in FRONTEND_ORIGINS:
            return api_error("Request origin is not allowed.", 403, "invalid_origin")


@app.errorhandler(404)
def not_found(_error):
    return api_error("Resource not found.", 404, "not_found")


@app.errorhandler(500)
def internal_error(_error):
    db.session.rollback()
    return api_error("An internal server error occurred.", 500, "internal_error")


@app.route("/")
def home():
    return jsonify(message="CBT Backend is LIVE", status="ok", cloudinary=HAS_CLOUDINARY)


@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route("/api/register", methods=["POST"])
def register():
    data = json_body()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    school_id = data.get("schoolId") or os.environ.get("DEFAULT_SCHOOL_ID")
    if not email or not isinstance(password, str) or len(password) < 8 or not school_id:
        return api_error("email, schoolId, and a password of at least 8 characters are required.")
    try:
        school_id = int(school_id)
    except (TypeError, ValueError):
        return api_error("schoolId must be an integer.")
    if not db.session.get(School, school_id):
        return api_error("School not found.", 404, "school_not_found")
    if User.query.filter(func.lower(User.email) == email).first():
        return api_error("Email already exists.", 409, "email_exists")
    class_id = data.get("classId")
    if class_id:
        try:
            class_id = int(class_id)
            class_row = db.session.get(SchoolClass, class_id)
        except (TypeError, ValueError):
            class_row = None
        if not class_row or class_row.school_id != school_id:
            return api_error("classId must refer to a class in the selected school.")
    user = User(username=(data.get("name") or data.get("username") or email.split("@")[0]).strip(),
                email=email, password=generate_password_hash(password), school_id=school_id,
                role="student", class_id=class_id, account_status="active")
    db.session.add(user)
    db.session.commit()
    return jsonify(success=True, user_id=user.id, username=user.username, email=user.email, role=user.role), 201


def authenticate(data, admins_only=False):
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = User.query.filter(func.lower(User.email) == email).first() if email else None
    if not user or not check_password_hash(user.password, password):
        return api_error("Invalid email or password.", 401, "invalid_credentials")
    if user.account_status != "active" or not user.school_id:
        return api_error("This account is not active or assigned to a school.", 403, "account_unavailable")
    if admins_only and user.role not in ADMIN_ROLES:
        return api_error("This account does not have an admin workspace role.", 403, "forbidden")
    raw = issue_session(user)
    return cookie_response({"success": True, "user_id": user.id, "username": user.username,
                            "email": user.email, "role": user.role,
                            "profile_image": user.profile_image}, raw_token=raw)


@app.route("/api/login", methods=["POST"])
def login():
    return authenticate(json_body())


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    # The former hardcoded admin password has been removed. Admin users are provisioned
    # with the Flask CLI and authenticate with their own hashed account password.
    return authenticate(json_body(), admins_only=True)


@app.route("/api/logout", methods=["POST"])
@require_auth
def logout():
    g.auth_session.revoked_at = utcnow()
    db.session.commit()
    return cookie_response({"success": True}, clear=True)


@app.route("/api/user/upload-avatar/<int:user_id>", methods=["POST"])
@require_auth
def upload_avatar(user_id):
    if user_id != g.current_user.id:
        return api_error("You can only update your own profile image.", 403, "forbidden")
    file = request.files.get("avatar")
    if not file or not file.filename:
        return api_error("No image file was provided.")
    if not allowed_file(file.filename):
        return api_error("Invalid image type.")
    user = g.current_user
    cloud_url = upload_to_cloudinary(file, "examcore/avatars")
    if cloud_url:
        user.profile_image = cloud_url
    else:
        file.seek(0)
        filename = f"avatar_{user.id}_{int(time.time())}_{secure_filename(file.filename)}"
        file.save(os.path.join(AVATAR_FOLDER, filename))
        user.profile_image = f"avatars/{filename}"
    db.session.commit()
    return jsonify(success=True, profile_image=user.profile_image, url=get_image_url(user.profile_image))


@app.route("/api/update-user/<int:user_id>", methods=["PUT"])
@require_auth
def update_user(user_id):
    if user_id != g.current_user.id:
        return api_error("You can only update your own account.", 403, "forbidden")
    username = json_body().get("username")
    if username:
        g.current_user.username = str(username).strip()[:80]
        db.session.commit()
    return jsonify(success=True, username=g.current_user.username)


@app.route("/api/exams", methods=["GET"])
@require_auth
def get_exams():
    exams = Exam.query.filter_by(school_id=g.current_user.school_id).order_by(Exam.created_at.desc()).all()
    result = []
    for exam in exams:
        actual_questions = Question.query.filter_by(examId=exam.id, school_id=g.current_user.school_id).count()
        result.append({"id": exam.id, "title": exam.title, "examType": exam.examType,
                       "year": exam.year, "duration": exam.duration,
                       "subjects": subjects_for_exam(exam), "totalQuestions": actual_questions})
    return jsonify(result)


@app.route("/api/questions", methods=["GET"])
@require_auth
def get_questions():
    exam_id = request.args.get("examId", type=int)
    subject = (request.args.get("subject") or "").strip()
    if not exam_id or not subject:
        return api_error("Both examId and subject are required.")
    exam = Exam.query.filter_by(id=exam_id, school_id=g.current_user.school_id).first()
    if not exam:
        return api_error("Exam not found.", 404, "exam_not_found")
    if subject not in subjects_for_exam(exam):
        return api_error("Subject does not belong to this exam.", 404, "subject_not_found")
    questions = Question.query.filter_by(examId=exam.id, school_id=g.current_user.school_id,
                                         subject=subject).order_by(Question.id).all()
    return jsonify([{"id": q.id, "examId": q.examId, "examType": q.examType, "subject": q.subject,
                     "question": q.question, "options": q.options, "answer": q.answer,
                     "explanation": q.explanation, "year": q.year, "image_path": q.image_path,
                     "image_url": get_image_url(q.image_path)} for q in questions])


def validate_exam_payload(data):
    title = data.get("title")
    exam_type = data.get("examType")
    subjects = data.get("subjects")
    if not isinstance(title, str) or not title.strip() or not isinstance(exam_type, str) or not exam_type.strip():
        return None, "title and examType are required."
    if not isinstance(subjects, list) or not subjects or any(not isinstance(x, str) or not x.strip() for x in subjects):
        return None, "subjects must be a non-empty list of subject names."
    subjects = list(dict.fromkeys(x.strip() for x in subjects))
    try:
        year = int(data.get("year", datetime.utcnow().year))
        duration = int(data.get("duration", 60))
        if duration <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return None, "year and positive duration must be valid integers."
    return {"title": title.strip(), "examType": exam_type.strip(), "subjects": subjects,
            "year": year, "duration": duration}, None


@app.route("/api/admin/create-exam", methods=["POST"])
@roles_required("school_admin", "exam_officer")
def create_exam():
    incoming = json_body()
    data, error = validate_exam_payload(incoming)
    if error:
        return api_error(error)
    initial_questions = incoming.get("questions", [])
    if not isinstance(initial_questions, list):
        return api_error("questions must be a list when provided.")
    prepared_questions = []
    # Validate the whole payload before writing anything, so a bad CSV-like row
    # cannot leave a half-created exam behind.
    shell_exam = Exam(id=-1, title=data["title"], examType=data["examType"], subject=",".join(data["subjects"]))
    for index, question_data in enumerate(initial_questions, start=1):
        if not isinstance(question_data, dict):
            return api_error(f"Question {index} must be an object.")
        question_data = dict(question_data)
        opts = question_data.get("options")
        if isinstance(opts, list) and len(opts) == 4:
            question_data["options"] = dict(zip("ABCD", opts))
        validated, question_error = validate_question_payload(question_data, shell_exam)
        if question_error:
            return api_error(f"Question {index}: {question_error}")
        prepared_questions.append(validated)
    school_id = g.current_user.school_id
    exam = Exam(title=data["title"], examType=data["examType"], subject=",".join(data["subjects"]),
                year=data["year"], duration=data["duration"], totalQuestions=len(prepared_questions), school_id=school_id)
    db.session.add(exam)
    db.session.flush()
    for subject in data["subjects"]:
        db.session.add(ExamSubject(exam_id=exam.id, name=subject))
    for question in prepared_questions:
        db.session.add(Question(examId=exam.id, school_id=school_id, examType=exam.examType,
                                subject=question["subject"], question=question["question"],
                                options=question["options"], answer=question["answer"],
                                explanation=question["explanation"], year=exam.year,
                                image_path=question["image_path"]))
    db.session.commit()
    return jsonify(success=True, exam_id=exam.id, message=f"{exam.title} saved"), 201


@app.route("/api/admin/exam/<int:exam_id>", methods=["PUT", "DELETE"])
@roles_required("school_admin", "exam_officer")
def manage_exam(exam_id):
    exam = Exam.query.filter_by(id=exam_id, school_id=g.current_user.school_id).first()
    if not exam:
        return api_error("Exam not found.", 404, "exam_not_found")
    if request.method == "DELETE":
        Question.query.filter_by(examId=exam.id, school_id=g.current_user.school_id).delete(synchronize_session=False)
        ExamSubject.query.filter_by(exam_id=exam.id).delete(synchronize_session=False)
        db.session.delete(exam)
        db.session.commit()
        return jsonify(success=True, message="Exam deleted.")
    data = json_body()
    if "title" in data and isinstance(data["title"], str) and data["title"].strip():
        exam.title = data["title"].strip()
    if "examType" in data and isinstance(data["examType"], str) and data["examType"].strip():
        exam.examType = data["examType"].strip()
    for key in ("year", "duration"):
        if key in data:
            try:
                value = int(data[key])
                if key == "duration" and value <= 0:
                    raise ValueError
                setattr(exam, key, value)
            except (TypeError, ValueError):
                return api_error(f"{key} must be a valid integer" + (" greater than zero." if key == "duration" else "."))
    if "subjects" in data:
        if not isinstance(data["subjects"], list) or not data["subjects"] or any(not isinstance(x, str) or not x.strip() for x in data["subjects"]):
            return api_error("subjects must be a non-empty list of subject names.")
        names = list(dict.fromkeys(x.strip() for x in data["subjects"]))
        old_names = set(subjects_for_exam(exam))
        if old_names != set(names) and Question.query.filter_by(examId=exam.id, school_id=exam.school_id).count():
            return api_error("Subjects cannot be changed after questions have been added.")
        ExamSubject.query.filter_by(exam_id=exam.id).delete(synchronize_session=False)
        for name in names:
            db.session.add(ExamSubject(exam_id=exam.id, name=name))
        exam.subject = ",".join(names)
    db.session.commit()
    return jsonify(success=True)


def validate_question_payload(data, exam):
    subject = data.get("subject")
    question = data.get("question")
    options = data.get("options")
    answer = data.get("correctAnswer")
    if not isinstance(subject, str) or not subject.strip() or subject.strip() not in subjects_for_exam(exam):
        return None, "subject must be configured for this exam."
    if not isinstance(question, str) or not question.strip():
        return None, "question is required."
    if not isinstance(options, dict) or set(options.keys()) != {"A", "B", "C", "D"} or any(
        not isinstance(options.get(letter), str) or not options[letter].strip() for letter in "ABCD"
    ):
        return None, "options must contain non-empty A, B, C, and D values."
    if answer not in {"A", "B", "C", "D"}:
        return None, "correctAnswer must be A, B, C, or D."
    return {"subject": subject.strip(), "question": question.strip(),
            "options": {key: options[key].strip() for key in "ABCD"}, "answer": answer,
            "explanation": data.get("explanation", "") or "", "image_path": data.get("image_path")}, None


@app.route("/api/admin/add-question", methods=["POST"])
@roles_required("school_admin", "exam_officer")
def add_question():
    multipart = request.mimetype == "multipart/form-data"
    data = request.form.to_dict() if multipart else json_body()
    if multipart and isinstance(data.get("options"), str):
        try:
            data["options"] = json.loads(data["options"])
        except (TypeError, ValueError):
            return api_error("options must be valid JSON containing A, B, C, and D.")
    try:
        exam_id = int(data.get("examId"))
    except (TypeError, ValueError):
        return api_error("examId must be a valid integer.")
    exam = Exam.query.filter_by(id=exam_id, school_id=g.current_user.school_id).first()
    if not exam:
        return api_error("Exam not found in your school.", 404, "exam_not_found")
    file = request.files.get("image") if multipart else None
    image_path = data.get("image_path")
    if file and file.filename:
        if not allowed_file(file.filename):
            return api_error("Invalid image file type.")
        image_path = upload_to_cloudinary(file, "examcore/questions")
        if not image_path:
            file.seek(0)
            filename = f"q_{int(time.time())}_{secure_filename(file.filename)}"
            file.save(os.path.join(QUESTION_FOLDER, filename))
            image_path = f"questions/{filename}"
    data["image_path"] = image_path
    validated, error = validate_question_payload(data, exam)
    if error:
        return api_error(error)
    row = Question(examId=exam.id, school_id=exam.school_id, examType=exam.examType,
                   subject=validated["subject"], question=validated["question"],
                   options=validated["options"], answer=validated["answer"],
                   explanation=validated["explanation"], year=exam.year, image_path=validated["image_path"])
    db.session.add(row)
    db.session.flush()
    exam.totalQuestions = Question.query.filter_by(examId=exam.id, school_id=exam.school_id).count()
    db.session.commit()
    return jsonify(success=True, id=row.id, examId=exam.id, subject=row.subject,
                   image_path=row.image_path, image_url=get_image_url(row.image_path)), 201


@app.route("/api/upload/question-image", methods=["POST"])
@roles_required("school_admin", "exam_officer")
def upload_question_image():
    file = request.files.get("image")
    if not file or not file.filename:
        return api_error("No image file was provided.")
    if not allowed_file(file.filename):
        return api_error("Invalid image type.")
    cloud_url = upload_to_cloudinary(file, "examcore/questions")
    if cloud_url:
        return jsonify(success=True, image_path=cloud_url, image_url=cloud_url)
    filename = f"q_{int(time.time())}_{secure_filename(file.filename)}"
    file.save(os.path.join(QUESTION_FOLDER, filename))
    path = f"questions/{filename}"
    return jsonify(success=True, image_path=path, image_url=get_image_url(path))


@app.route("/api/admin/overview", methods=["GET"])
@roles_required("school_admin", "teacher", "exam_officer")
def admin_overview():
    school_id = g.current_user.school_id
    now = utcnow()
    exam_ids = db.session.query(Exam.id).filter_by(school_id=school_id).subquery()
    exams_count = Exam.query.filter_by(school_id=school_id).count()
    subjects_count = ExamSubject.query.filter(ExamSubject.exam_id.in_(exam_ids)).count()
    questions_count = Question.query.filter_by(school_id=school_id).count()
    students = User.query.filter_by(school_id=school_id, role="student")
    enrolled = students.count()
    active = students.filter(User.account_status == "active", User.last_seen_at >= now - timedelta(minutes=5)).count()
    attempts = Attempt.query.filter_by(school_id=school_id)
    attempt_count = attempts.count()
    average_score = db.session.query(func.avg((Attempt.score * 100.0) / Attempt.total)).filter(
        Attempt.school_id == school_id, Attempt.total > 0
    ).scalar() if attempt_count else None
    recent = []
    if attempt_count:
        rows = attempts.order_by(Attempt.completed_at.desc()).limit(10).all()
        for row in rows:
            exam = db.session.get(Exam, row.exam_id)
            student = db.session.get(User, row.student_id)
            if exam and exam.school_id == school_id and student and student.school_id == school_id:
                recent.append({"attemptId": row.id, "studentId": row.student_id,
                               "studentName": student.username, "examId": exam.id,
                               "examTitle": exam.title, "subject": row.subject,
                               "score": row.score, "total": row.total,
                               "percentage": row.percentage, "completedAt": iso_utc(row.completed_at)})
    return jsonify({"counts": {"exams": exams_count, "configuredSubjects": subjects_count,
                               "questions": questions_count, "enrolledStudents": enrolled,
                               "activeStudents": active},
                    "performance": {"averageScore": round(float(average_score), 2) if average_score is not None else None,
                                    "attemptCount": attempt_count,
                                    "available": attempt_count > 0},
                    "recentExamActivity": recent if attempt_count else None})


@app.route("/api/admin/students", methods=["GET"])
@roles_required("school_admin", "teacher", "exam_officer")
def admin_students():
    try:
        page = max(1, int(request.args.get("page", "1")))
        limit = min(200, max(1, int(request.args.get("limit", "50"))))
    except ValueError:
        return api_error("page and limit must be integers.")
    query = User.query.filter_by(school_id=g.current_user.school_id, role="student")
    search = (request.args.get("search") or "").strip()
    if search:
        needle = f"%{search}%"
        query = query.filter(or_(User.username.ilike(needle), User.email.ilike(needle)))
    class_id = request.args.get("classId")
    if class_id:
        try:
            class_id = int(class_id)
        except ValueError:
            return api_error("classId must be an integer.")
        school_class = SchoolClass.query.filter_by(id=class_id, school_id=g.current_user.school_id).first()
        if not school_class:
            return api_error("Class not found.", 404, "class_not_found")
        query = query.filter(User.class_id == class_id)
    total = query.count()
    rows = query.order_by(User.username.asc(), User.id.asc()).offset((page - 1) * limit).limit(limit).all()
    return jsonify({"students": [student_payload(row) for row in rows],
                    "pagination": {"page": page, "limit": limit, "total": total,
                                   "pages": (total + limit - 1) // limit}})


def parse_iso_date(value, field):
    if not value:
        return None, None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None), None
    except (TypeError, ValueError):
        return None, f"{field} must be an ISO date or datetime."


@app.route("/api/admin/students/<int:student_id>/performance", methods=["GET"])
@roles_required("school_admin", "teacher", "exam_officer")
def student_performance(student_id):
    school_id = g.current_user.school_id
    student = User.query.filter_by(id=student_id, school_id=school_id, role="student").first()
    if not student:
        return api_error("Student not found.", 404, "student_not_found")
    start, error = parse_iso_date(request.args.get("from"), "from")
    if error:
        return api_error(error)
    end, error = parse_iso_date(request.args.get("to"), "to")
    if error:
        return api_error(error)
    query = Attempt.query.filter_by(student_id=student.id, school_id=school_id)
    if start:
        query = query.filter(Attempt.completed_at >= start)
    if end:
        query = query.filter(Attempt.completed_at <= end)
    rows = query.order_by(Attempt.completed_at.asc()).all()
    history = []
    grouped = {}
    for row in rows:
        exam = Exam.query.filter_by(id=row.exam_id, school_id=school_id).first()
        if not exam:
            continue
        history.append({"attemptId": row.id, "examId": exam.id, "examTitle": exam.title,
                        "subject": row.subject, "score": row.score, "total": row.total,
                        "percentage": row.percentage, "completedAt": iso_utc(row.completed_at)})
        grouped.setdefault(row.subject, []).append(row)
    by_subject = []
    for subject, subject_rows in sorted(grouped.items()):
        percentages = [row.percentage for row in subject_rows if row.percentage is not None]
        by_subject.append({"subject": subject, "completedAttempts": len(subject_rows),
                           "averageScore": round(sum(percentages) / len(percentages), 2) if percentages else None,
                           "scoreHistory": [{"score": row.score, "total": row.total,
                                             "percentage": row.percentage,
                                             "completedAt": iso_utc(row.completed_at)} for row in subject_rows]})
    return jsonify({"student": student_payload(student), "completedAttempts": len(history),
                    "scoreHistory": history, "resultsBySubject": by_subject})


@app.route("/api/students/me/heartbeat", methods=["POST"])
@roles_required("student")
def student_heartbeat():
    g.current_user.last_seen_at = utcnow()
    db.session.commit()
    return jsonify(success=True, lastSeenAt=iso_utc(g.current_user.last_seen_at))


@app.route("/api/attempts", methods=["POST"])
@roles_required("student")
def submit_attempt():
    data = json_body()
    try:
        exam_id = int(data.get("examId"))
        score = float(data.get("score"))
        total = float(data.get("total"))
    except (TypeError, ValueError):
        return api_error("examId, score, and total must be valid numbers.")
    subject = data.get("subject")
    if total <= 0 or score < 0 or score > total:
        return api_error("score must be between zero and a positive total.")
    exam = Exam.query.filter_by(id=exam_id, school_id=g.current_user.school_id).first()
    if not exam:
        return api_error("Exam not found.", 404, "exam_not_found")
    if not isinstance(subject, str) or subject.strip() not in subjects_for_exam(exam):
        return api_error("subject must be configured for this exam.")
    row = Attempt(student_id=g.current_user.id, school_id=g.current_user.school_id,
                  exam_id=exam.id, subject=subject.strip(), score=score, total=total, completed_at=utcnow())
    db.session.add(row)
    db.session.commit()
    return jsonify(success=True, attempt={"id": row.id, "examId": row.exam_id,
                                          "subject": row.subject, "score": row.score,
                                          "total": row.total, "percentage": row.percentage,
                                          "completedAt": iso_utc(row.completed_at)}), 201


# Legacy history routes are retained for the existing student client, but every read/write
# is tied to the current user. Only /api/attempts creates reportable exam attempts.
@app.route("/api/save-result", methods=["POST"])
@app.route("/api/history", methods=["POST"])
@roles_required("student")
def save_history_alias():
    data = json_body()
    try:
        score = int(data.get("score"))
        total = int(data.get("total"))
        if score < 0 or total <= 0 or score > total:
            raise ValueError
    except (TypeError, ValueError):
        return api_error("score and positive total must be valid; score cannot exceed total.")
    attempt = None
    if data.get("examId") is not None or data.get("subject") is not None:
        try:
            exam_id = int(data.get("examId"))
        except (TypeError, ValueError):
            return api_error("examId must be a valid integer when recording an exam attempt.")
        exam = Exam.query.filter_by(id=exam_id, school_id=g.current_user.school_id).first()
        if not exam:
            return api_error("Exam not found.", 404, "exam_not_found")
        subject = data.get("subject")
        if not isinstance(subject, str) or subject.strip() not in subjects_for_exam(exam):
            return api_error("subject must be configured for this exam.")
        attempt = Attempt(student_id=g.current_user.id, school_id=g.current_user.school_id,
                          exam_id=exam.id, subject=subject.strip(), score=score, total=total, completed_at=utcnow())
    row = CBTResult(user_id=g.current_user.id, email=g.current_user.email,
                    title=str(data.get("title", "Practice Test"))[:200], score=score, total=total,
                    duration=str(data.get("duration", "0m"))[:20], status=str(data.get("status", "Failed"))[:20],
                    mode=str(data.get("mode", "exam"))[:20], examType=str(data.get("examType", "JAMB"))[:80],
                    school_id=g.current_user.school_id, date=utcnow())
    db.session.add(row)
    if attempt:
        db.session.add(attempt)
    db.session.commit()
    return jsonify(success=True, id=row.id, attemptId=attempt.id if attempt else None), 201


@app.route("/api/history/<int:user_id>", methods=["GET"])
@roles_required("student")
def history(user_id):
    if user_id != g.current_user.id:
        return api_error("You can only read your own history.", 403, "forbidden")
    rows = CBTResult.query.filter_by(user_id=g.current_user.id, school_id=g.current_user.school_id).order_by(CBTResult.date.desc()).all()
    return jsonify([{"id": row.id, "title": row.title, "score": row.score, "total": row.total,
                     "duration": row.duration, "status": row.status, "mode": row.mode,
                     "examType": row.examType, "date": iso_utc(row.date)} for row in rows])


@app.route("/api/history/<int:result_id>", methods=["DELETE"])
@roles_required("student")
def delete_history(result_id):
    row = CBTResult.query.filter_by(id=result_id, user_id=g.current_user.id,
                                    school_id=g.current_user.school_id).first()
    if not row:
        return api_error("History record not found.", 404, "not_found")
    db.session.delete(row)
    db.session.commit()
    return jsonify(success=True)


@app.route("/api/history/clear/<int:user_id>", methods=["DELETE"])
@roles_required("student")
def clear_history(user_id):
    if user_id != g.current_user.id:
        return api_error("You can only clear your own history.", 403, "forbidden")
    CBTResult.query.filter_by(user_id=g.current_user.id, school_id=g.current_user.school_id).delete()
    db.session.commit()
    return jsonify(success=True)


@app.cli.command("create-school-admin")
def create_school_admin_command():
    """Create a school and its first administrator without seeding fake data."""
    import click
    name = click.prompt("School name")
    email = click.prompt("Admin email").strip().lower()
    username = click.prompt("Admin display name")
    password = click.prompt("Admin password", hide_input=True, confirmation_prompt=True)
    if len(password) < 8 or User.query.filter(func.lower(User.email) == email).first():
        raise click.ClickException("Use a password of at least 8 characters and a new email address.")
    school = School(name=name.strip())
    db.session.add(school)
    db.session.flush()
    admin = User(username=username.strip(), email=email, password=generate_password_hash(password),
                 school_id=school.id, role="school_admin", account_status="active")
    db.session.add(admin)
    db.session.commit()
    click.echo(f"Created school {school.id} and school_admin account {admin.id}.")


@app.cli.command("create-school-user")
def create_school_user_command():
    """Create a teacher or exam officer in an existing school."""
    import click
    school_id = click.prompt("School ID", type=int)
    role = click.prompt("Role", type=click.Choice(["teacher", "exam_officer", "student"], case_sensitive=False)).lower()
    email = click.prompt("Email").strip().lower()
    username = click.prompt("Display name")
    password = click.prompt("Password", hide_input=True, confirmation_prompt=True)
    if not db.session.get(School, school_id):
        raise click.ClickException("School not found.")
    if len(password) < 8 or User.query.filter(func.lower(User.email) == email).first():
        raise click.ClickException("Use a password of at least 8 characters and a new email address.")
    user = User(username=username.strip(), email=email, password=generate_password_hash(password),
                school_id=school_id, role=role, account_status="active")
    db.session.add(user)
    db.session.commit()
    click.echo(f"Created {role} account {user.id} for school {school_id}.")


@app.cli.command("create-school-class")
def create_school_class_command():
    """Create a class in a school for enrollment and roster filtering."""
    import click
    school_id = click.prompt("School ID", type=int)
    name = click.prompt("Class name").strip()
    if not db.session.get(School, school_id):
        raise click.ClickException("School not found.")
    if not name or SchoolClass.query.filter_by(school_id=school_id, name=name).first():
        raise click.ClickException("Class name is empty or already exists in this school.")
    row = SchoolClass(school_id=school_id, name=name)
    db.session.add(row)
    db.session.commit()
    click.echo(f"Created class {row.id} for school {school_id}.")


@app.cli.command("set-school-user-role")
def set_school_user_role_command():
    """Assign a provisioned account its school role from the command line."""
    import click
    user_id = click.prompt("User ID", type=int)
    role = click.prompt("Role", type=click.Choice(sorted(VALID_ROLES), case_sensitive=False)).lower()
    user = db.session.get(User, user_id)
    if not user:
        raise click.ClickException("User not found.")
    user.role = role
    db.session.commit()
    click.echo(f"Set account {user.id} to {role} in school {user.school_id}.")


@app.cli.command("assign-legacy-data")
def assign_legacy_data_command():
    """Assign unscoped records from the old single-school schema to one school."""
    import click
    school_id = click.prompt("Target school ID", type=int)
    if not db.session.get(School, school_id):
        raise click.ClickException("School not found.")
    if not click.confirm("Assign all currently unscoped users, exams, questions, and results to this school?"):
        click.echo("No records changed.")
        return
    User.query.filter_by(school_id=None).update({"school_id": school_id}, synchronize_session=False)
    Exam.query.filter_by(school_id=None).update({"school_id": school_id}, synchronize_session=False)
    Question.query.filter_by(school_id=None).update({"school_id": school_id}, synchronize_session=False)
    CBTResult.query.filter_by(school_id=None).update({"school_id": school_id}, synchronize_session=False)
    for exam in Exam.query.filter_by(school_id=school_id).all():
        for subject in [s.strip() for s in (exam.subject or "").split(",") if s.strip()]:
            if not ExamSubject.query.filter_by(exam_id=exam.id, name=subject).first():
                db.session.add(ExamSubject(exam_id=exam.id, name=subject))
        exam.totalQuestions = Question.query.filter_by(examId=exam.id, school_id=school_id).count()
    db.session.commit()
    click.echo("Legacy records assigned. Review memberships and account roles before enabling sign-in.")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")))
