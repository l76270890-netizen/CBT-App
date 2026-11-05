from flask import Flask, request, jsonify, send_from_directory, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime
from functools import wraps
import csv
import io
import os
import re
import secrets
import stat
import time
import json
import tempfile
import zipfile
import zlib

# Optional Cloudinary - won't break if not installed
try:
    import cloudinary
    import cloudinary.uploader
    HAS_CLOUDINARY = True
    if os.environ.get('CLOUDINARY_CLOUD_NAME'):
        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
            api_key=os.environ.get('CLOUDINARY_API_KEY'),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET')
        )
except:
    HAS_CLOUDINARY = False

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('COOKIE_SECURE', 'false').lower() == 'true'
app.config['SESSION_COOKIE_SAMESITE'] = os.environ.get('COOKIE_SAMESITE', 'Lax')
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.environ.get('DATABASE_URL')
if db_path and db_path.startswith("postgres"):
    app.config['SQLALCHEMY_DATABASE_URI'] = db_path.replace("postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(basedir, 'examcore.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

IS_SERVERLESS = os.environ.get('VERCEL') == '1' or bool(os.environ.get('AWS_LAMBDA_FUNCTION_NAME'))
DEFAULT_UPLOAD_FOLDER = os.path.join(
    tempfile.gettempdir(), 'uploads') if IS_SERVERLESS else os.path.join(basedir, 'uploads')
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or DEFAULT_UPLOAD_FOLDER
QUESTION_STORAGE_IS_PERSISTENT = not IS_SERVERLESS or bool(os.environ.get('UPLOAD_FOLDER'))
AVATAR_FOLDER = os.path.join(UPLOAD_FOLDER, 'avatars')
QUESTION_FOLDER = os.path.join(UPLOAD_FOLDER, 'questions')
os.makedirs(AVATAR_FOLDER, exist_ok=True)
os.makedirs(QUESTION_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'jfif'}
QUESTION_IMPORT_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg'}
MAX_QUESTION_ARCHIVE_BYTES = 25 * 1024 * 1024
MAX_QUESTION_ARCHIVE_TOTAL_BYTES = 50 * 1024 * 1024
MAX_QUESTION_CSV_BYTES = 5 * 1024 * 1024
MAX_QUESTION_IMAGE_BYTES = 10 * 1024 * 1024
MAX_QUESTION_README_BYTES = 128 * 1024
MAX_QUESTION_IMPORT_ROWS = 500
app.config['MAX_CONTENT_LENGTH'] = MAX_QUESTION_ARCHIVE_BYTES + 1024 * 1024

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def upload_to_cloudinary(file, folder):
    if HAS_CLOUDINARY and os.environ.get('CLOUDINARY_CLOUD_NAME'):
        try:
            result = cloudinary.uploader.upload(file, folder=folder)
            return result['secure_url']
        except:
            return None
    return None

def get_image_url(path):
    if not path: return None
    if path.startswith('http'): return path
    return f"/uploads/{path}"


def valid_question_import_image(filename, contents):
    extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    if extension == 'png':
        return contents.startswith(b'\x89PNG\r\n\x1a\n')
    if extension in {'jpg', 'jpeg'}:
        return contents.startswith(b'\xff\xd8\xff')
    return False


def read_question_import_archive(file):
    archive_data = file.read(MAX_QUESTION_ARCHIVE_BYTES + 1)
    if len(archive_data) > MAX_QUESTION_ARCHIVE_BYTES:
        return None, None, "ZIP files must be 25 MB or smaller.", 413

    try:
        with zipfile.ZipFile(io.BytesIO(archive_data)) as archive:
            members = archive.infolist()
            if len(members) > MAX_QUESTION_IMPORT_ROWS + 3:
                return None, None, "The ZIP contains too many files.", 400
            if sum(member.file_size for member in members) > MAX_QUESTION_ARCHIVE_TOTAL_BYTES:
                return None, None, "The uncompressed ZIP contents exceed 50 MB.", 400

            csv_info = None
            readme_info = None
            image_infos = {}
            seen_names = set()
            for member in members:
                name = member.filename
                if (not name or '\\' in name or name.startswith('/') or
                        any(part in {'', '.', '..'} for part in name.rstrip('/').split('/'))):
                    return None, None, "The ZIP contains an invalid file path.", 400
                if name in seen_names:
                    return None, None, f"The ZIP contains a duplicate path: {name}.", 400
                seen_names.add(name)

                unix_mode = member.external_attr >> 16
                if stat.S_ISLNK(unix_mode) or member.flag_bits & 0x1:
                    return None, None, "The ZIP cannot contain links or encrypted files.", 400
                if member.is_dir():
                    if name != 'images/':
                        return None, None, "Only the images/ directory is allowed in the ZIP.", 400
                    continue
                if name == 'README.txt':
                    if member.file_size > MAX_QUESTION_README_BYTES:
                        return None, None, "README.txt must be 128 KB or smaller.", 400
                    readme_info = member
                    continue
                if name.lower() == 'questions.csv':
                    if name != 'questions.csv' or csv_info is not None:
                        return None, None, "The ZIP must contain one root-level questions.csv file.", 400
                    if member.file_size > MAX_QUESTION_CSV_BYTES:
                        return None, None, "questions.csv must be 5 MB or smaller.", 400
                    csv_info = member
                    continue
                if name.startswith('images/') and name.count('/') == 1:
                    filename = name[len('images/'):]
                    extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
                    if not filename or extension not in QUESTION_IMPORT_IMAGE_EXTENSIONS:
                        return None, None, f"Image {name} must be a PNG, JPG, or JPEG file.", 400
                    if member.file_size > MAX_QUESTION_IMAGE_BYTES:
                        return None, None, f"Image {filename} must be 10 MB or smaller.", 400
                    image_infos[name] = member
                    continue
                return None, None, f"Unsupported file in ZIP: {name}.", 400

            if csv_info is None:
                return None, None, "The ZIP must contain a root-level questions.csv file.", 400
            if len(image_infos) > MAX_QUESTION_IMPORT_ROWS:
                return None, None, "The ZIP can contain at most 500 question images.", 400

            expanded_size = 0

            def read_member(member, limit):
                nonlocal expanded_size
                with archive.open(member) as stream:
                    contents = stream.read(limit + 1)
                if len(contents) > limit:
                    return None, "A ZIP file exceeds its allowed size."
                expanded_size += len(contents)
                if expanded_size > MAX_QUESTION_ARCHIVE_TOTAL_BYTES:
                    return None, "The uncompressed ZIP contents exceed 50 MB."
                if len(contents) != member.file_size:
                    return None, "A ZIP file has an invalid declared size."
                return contents, None

            csv_data, error = read_member(csv_info, MAX_QUESTION_CSV_BYTES)
            if error:
                return None, None, error, 400
            if readme_info:
                _, error = read_member(readme_info, MAX_QUESTION_README_BYTES)
                if error:
                    return None, None, error, 400
            images = {}
            for name, member in image_infos.items():
                image_data, error = read_member(member, MAX_QUESTION_IMAGE_BYTES)
                if error:
                    return None, None, error, 400
                if not valid_question_import_image(name, image_data):
                    return None, None, f"Image {name} is not a valid PNG, JPG, or JPEG file.", 400
                images[name] = image_data
            return csv_data, images, None, None
    except (zipfile.BadZipFile, EOFError, OSError, RuntimeError, NotImplementedError, zlib.error):
        return None, None, "The uploaded file is not a valid, readable ZIP archive.", 400


def parse_question_import_csv(contents, images, exam):
    try:
        text = contents.decode('utf-8-sig')
    except UnicodeDecodeError:
        return None, "questions.csv must use UTF-8 encoding."

    try:
        try:
            delimiter = csv.Sniffer().sniff(text[:8192], delimiters=',;\t').delimiter
        except csv.Error:
            delimiter = ','
        reader = csv.DictReader(io.StringIO(text, newline=''), delimiter=delimiter)
        if not reader.fieldnames:
            return None, "questions.csv must include a header row."
        headers = [re.sub(r'[^a-z0-9]', '', header.strip().lower())
                   for header in reader.fieldnames]
        if len(headers) != len(set(headers)):
            return None, "questions.csv contains duplicate column names."
        required_headers = {
            'question', 'optiona', 'optionb', 'optionc', 'optiond',
            'correctanswer', 'subject', 'explanation',
        }
        missing_headers = sorted(required_headers - set(headers))
        if missing_headers:
            return None, f"questions.csv is missing required columns: {', '.join(missing_headers)}."

        exam_subjects = {subject.strip() for subject in (exam.subject or '').split(',') if subject.strip()}
        prepared = []
        seen_questions = set()
        for row_number, raw_row in enumerate(reader, start=2):
            if None in raw_row:
                return None, f"Question row {row_number} has more values than the header."
            row = {header: (raw_row.get(original) or '').strip()
                   for header, original in zip(headers, reader.fieldnames)}
            if not any(row.values()):
                continue
            if len(prepared) >= MAX_QUESTION_IMPORT_ROWS:
                return None, "Import up to 500 questions at a time."

            subject = row.get('subject', '')
            question = row.get('question', '')
            if subject not in exam_subjects:
                return None, f"Question row {row_number}: subject must be configured for this exam."
            if not question:
                return None, f"Question row {row_number}: question is required."
            options = {letter: row.get(f'option{letter.lower()}', '') for letter in 'ABCD'}
            if any(not value for value in options.values()):
                return None, f"Question row {row_number}: all four options are required."
            answer = row.get('correctanswer', '').upper()
            if answer not in {'A', 'B', 'C', 'D'}:
                return None, f"Question row {row_number}: correctAnswer must be A, B, C, or D."

            image_reference = row.get('imageurl', '')
            image_member = None
            if image_reference:
                filename = image_reference[len('images/'):] if image_reference.startswith('images/') else image_reference
                if (not filename or '/' in filename or '\\' in filename or filename in {'.', '..'} or
                        filename.rsplit('.', 1)[-1].lower() not in QUESTION_IMPORT_IMAGE_EXTENSIONS):
                    return None, f"Question row {row_number} has an invalid image filename."
                image_member = f"images/{filename}"
                if image_member not in images:
                    return None, f"Question row {row_number} references missing image {filename}."

            question_key = (subject.casefold(), ' '.join(question.casefold().split()))
            if question_key in seen_questions:
                return None, f"Question row {row_number} duplicates an earlier question."
            seen_questions.add(question_key)
            prepared.append(({
                'subject': subject,
                'question': question,
                'options': options,
                'answer': answer,
                'explanation': row.get('explanation', ''),
            }, image_member))

        if not prepared:
            return None, "questions.csv does not contain any question rows."
        return prepared, None
    except csv.Error:
        return None, "Could not parse questions.csv. Check its delimiter and quoting."


def store_question_import_image(filename, contents):
    if not QUESTION_STORAGE_IS_PERSISTENT:
        return None, "Permanent image storage is unavailable. Configure UPLOAD_FOLDER to a persistent volume."
    safe_name = secure_filename(filename)
    stored_name = f"q_{secrets.token_hex(12)}_{safe_name}"
    filepath = os.path.join(QUESTION_FOLDER, stored_name)
    try:
        with open(filepath, 'xb') as image_file:
            image_file.write(contents)
    except OSError:
        app.logger.exception("Question image could not be saved")
        try:
            os.remove(filepath)
        except FileNotFoundError:
            pass
        except OSError:
            app.logger.exception("Could not remove a partial question image")
        return None, "Question image could not be saved to permanent storage."
    return f"questions/{stored_name}", None


def admin_required(function):
    @wraps(function)
    def wrapped(*args, **kwargs):
        if not session.get('admin_authenticated'):
            return jsonify(success=False, message="Admin login is required."), 401
        return function(*args, **kwargs)
    return wrapped


db = SQLAlchemy(app)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    profile_image = db.Column(db.String(1000), nullable=True)

class Exam(db.Model):
    __tablename__ = 'exams'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200))
    examType = db.Column(db.String(80))
    subject = db.Column(db.String(500))
    year = db.Column(db.Integer)
    duration = db.Column(db.Integer)
    totalQuestions = db.Column(db.Integer, default=20)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Question(db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True)
    examId = db.Column(db.Integer, db.ForeignKey('exams.id'), nullable=True)
    examType = db.Column(db.String(80))
    subject = db.Column(db.String(100))
    question = db.Column(db.Text)
    options = db.Column(db.JSON)
    answer = db.Column(db.String(10))
    explanation = db.Column(db.Text)
    year = db.Column(db.Integer, default=2024)
    image_path = db.Column(db.String(1000), nullable=True)

class CBTResult(db.Model):
    __tablename__ = 'results'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer)
    email = db.Column(db.String(120))
    title = db.Column(db.String(200), default="Practice Test")
    score = db.Column(db.Integer)
    total = db.Column(db.Integer)
    duration = db.Column(db.String(20), default="0m")
    status = db.Column(db.String(20), default="Failed")
    mode = db.Column(db.String(20), default="exam")
    examType = db.Column(db.String(80))
    date = db.Column(db.DateTime, default=datetime.utcnow)

def init_db():
    with app.app_context():
        db.create_all()
        print(f"Database ready - Cloudinary: {HAS_CLOUDINARY}")

init_db()

@app.route('/')
def home():
    return jsonify(message="CBT Backend is LIVE", status="ok", cloudinary=HAS_CLOUDINARY)

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify(success=False, message="The uploaded file is too large."), 413


@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if not data.get('email') or not data.get('password'):
        return jsonify(success=False, message="Missing fields"), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify(success=False, message="Email already exists"), 400
    user = User(username=data.get('name') or data.get('username') or data['email'].split('@')[0], email=data['email'], password=generate_password_hash(data['password']))
    db.session.add(user)
    db.session.commit()
    return jsonify(success=True, user_id=user.id, username=user.username, email=user.email)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if user and check_password_hash(user.password, data['password']):
        return jsonify(success=True, user_id=user.id, username=user.username, email=user.email, profile_image=user.profile_image)
    return jsonify(success=False, message="Invalid email or password"), 401

@app.route('/api/user/upload-avatar/<user_id>', methods=['POST'])
def upload_avatar(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"success": False, "message":"User not found"}),404
    file = request.files.get('avatar')
    if not file or file.filename == '':
        return jsonify({"success": False, "message":"No file"}),400
    if not allowed_file(file.filename):
        return jsonify({"success": False, "message":"Invalid file type"}),400

    # Try Cloudinary first (permanent on Render)
    cloud_url = upload_to_cloudinary(file, folder="examcore/avatars")
    if cloud_url:
        user.profile_image = cloud_url
        db.session.commit()
        return jsonify({"success": True, "profile_image": cloud_url, "url": cloud_url})

    # Fallback local
    try:
        file.seek(0)
    except: pass
    filename = f"avatar_{user_id}_{int(time.time())}_{secure_filename(file.filename)}"
    path = os.path.join(AVATAR_FOLDER, filename)
    file.save(path)
    user.profile_image = f"avatars/{filename}"
    db.session.commit()
    return jsonify({"success": True, "profile_image": user.profile_image, "url": f"/uploads/avatars/{filename}"})

@app.route('/api/update-user/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.json
    user = User.query.get(user_id)
    if not user:
        return jsonify(message="Not found"), 404
    if data.get('username'):
        user.username = data['username']
    db.session.commit()
    return jsonify(success=True, username=user.username)

@app.route('/api/exams', methods=['GET'])
def get_exams():
    exams = Exam.query.order_by(Exam.created_at.desc()).all()
    return jsonify([{"id": e.id, "title": e.title, "examType": e.examType, "subject": e.subject, "year": e.year, "duration": e.duration, "totalQuestions": e.totalQuestions} for e in exams])

@app.route('/api/questions', methods=['GET'])
def get_questions():
    examType = request.args.get('examType')
    subject = request.args.get('subject')
    subjects = request.args.get('subjects')
    examId = request.args.get('examId')
    q = Question.query
    if examId:
        try: q = q.filter(Question.examId == int(examId))
        except: pass
    if examType:
        q = q.filter(Question.examType.ilike(f"%{examType}%"))
    if subject:
        q = q.filter(Question.subject.ilike(f"%{subject}%"))
    if subjects:
        subs = [s.strip() for s in subjects.split(',') if s.strip()]
        if subs:
            q = q.filter(Question.subject.in_(subs))
    questions = q.all()
    return jsonify([{"id": x.id, "examId": x.examId, "examType": x.examType, "subject": x.subject, "question": x.question, "options": x.options, "answer": x.answer, "explanation": x.explanation, "year": x.year, "image_path": x.image_path, "image_url": get_image_url(x.image_path)} for x in questions])

@app.route('/api/save-result', methods=['POST'])
@app.route('/api/history', methods=['POST'])
def save_history_alias():
    d = request.json
    r = CBTResult(user_id=d.get('user_id'), email=d.get('email'), title=d.get('title', 'Practice Test'), score=d['score'], total=d['total'], duration=d.get('duration', '0m'), status=d.get('status', 'Failed'), mode=d.get('mode', 'exam'), examType=d.get('examType', 'JAMB'))
    db.session.add(r)
    db.session.commit()
    return jsonify(success=True, id=r.id)

@app.route('/api/history/<int:user_id>', methods=['GET'])
def history(user_id):
    res = CBTResult.query.filter_by(user_id=user_id).order_by(CBTResult.date.desc()).all()
    return jsonify([{"id": r.id, "title": r.title, "score": r.score, "total": r.total, "duration": r.duration, "status": r.status, "mode": r.mode, "examType": r.examType, "date": r.date.isoformat(), "email": r.email} for r in res])

@app.route('/api/history/<int:result_id>', methods=['DELETE'])
def delete_history(result_id):
    r = CBTResult.query.get(result_id)
    if r:
        db.session.delete(r)
        db.session.commit()
    return jsonify(success=True)

@app.route('/api/history/clear/<int:user_id>', methods=['DELETE'])
def clear_history(user_id):
    CBTResult.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify(success=True)

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    if data['email'] == "Lawrenceifeanyi0001@gmail.com" and data['password'] == "admin123":
        user = User.query.filter_by(email=data['email']).first()
        if not user:
            user = User(username="Admin", email=data['email'], password=generate_password_hash("admin123"))
            db.session.add(user)
            db.session.commit()
        session.clear()
        session['admin_authenticated'] = True
        return jsonify(success=True, user_id=user.id, username=user.username, email=user.email, role="admin")
    user = User.query.filter_by(email=data['email']).first()
    if user and check_password_hash(user.password, data['password']):
        session.clear()
        session['admin_authenticated'] = True
        return jsonify(success=True, user_id=user.id, username=user.username, email=user.email, role="admin")
    return jsonify(success=False, message="Invalid admin"), 401

@app.route('/api/admin/create-exam', methods=['POST'])
def create_exam():
    d = request.json
    total_q = len(d.get('questions', [])) or 0
    exam = Exam(title=d['title'], examType=d['examType'], subject=",".join(d['subjects']), year=int(d.get('year', 2024)), duration=int(d.get('duration', 60)), totalQuestions=total_q if total_q > 0 else 20)
    db.session.add(exam)
    db.session.commit()
    for q in d.get('questions', []):
        opts = q['options']
        if isinstance(opts, list):
            opts = {"A": opts[0], "B": opts[1], "C": opts[2], "D": opts[3]}
        ques = Question(examId=exam.id, examType=d['examType'], subject=q['subject'], question=q['question'], options=opts, answer=q['correctAnswer'], explanation=q.get('explanation', ''), year=int(d.get('year', 2024)), image_path=q.get('image_path'))
        db.session.add(ques)
    db.session.commit()
    return jsonify(success=True, exam_id=exam.id, message=f"{d['title']} saved")

@app.route('/api/admin/exam/<int:exam_id>', methods=['PUT', 'DELETE'])
def manage_exam(exam_id):
    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify(message="Not found"), 404
    if request.method == 'DELETE':
        try:
            Question.query.filter_by(examId=exam_id).delete(synchronize_session=False)
            db.session.delete(exam)
            db.session.commit()
            return jsonify(success=True, message="Deleted permanently"), 200
        except Exception as e:
            db.session.rollback()
            return jsonify(message=str(e)), 500
    data = request.json
    if 'title' in data: exam.title=data['title']
    if 'examType' in data: exam.examType=data['examType']
    if 'year' in data: exam.year=int(data['year'])
    if 'duration' in data: exam.duration=int(data['duration'])
    if 'subjects' in data: exam.subject=",".join(data['subjects'])
    db.session.commit()
    return jsonify(success=True)

@app.route('/api/admin/add-question', methods=['POST'])
def add_question():
    if request.content_type and 'multipart/form-data' in request.content_type:
        d = request.form
        file = request.files.get('image')
        image_path = None
        if file and file.filename!= '' and allowed_file(file.filename):
            cloud_url = upload_to_cloudinary(file, folder="examcore/questions")
            if cloud_url:
                image_path = cloud_url
            else:
                try: file.seek(0)
                except: pass
                filename = f"q_{int(time.time())}_{secure_filename(file.filename)}"
                filepath = os.path.join(QUESTION_FOLDER, filename)
                file.save(filepath)
                image_path = f"questions/{filename}"
        exam_id = int(d.get('examId'))
        exam = Exam.query.get(exam_id)
        exam_type = exam.examType if exam else d.get('examType', 'JAMB')
        options_data = d.get('options')
        try:
            options_data = json.loads(options_data) if isinstance(options_data, str) else options_data
        except:
            options_data = {"A": d.get('option_a'), "B": d.get('option_b'), "C": d.get('option_c'), "D": d.get('option_d')}
        q = Question(examId=exam_id, examType=exam_type, subject=d.get('subject'), question=d.get('question'), options=options_data, answer=d.get('correctAnswer'), explanation=d.get('explanation',''), image_path=image_path)
    else:
        d = request.json
        exam = Exam.query.get(int(d['examId']))
        exam_type = exam.examType if exam else d.get('examType', 'JAMB')
        q = Question(examId=int(d['examId']), examType=exam_type, subject=d['subject'], question=d['question'], options=d['options'], answer=d['correctAnswer'], explanation=d.get('explanation', ''), image_path=d.get('image_path'))
    db.session.add(q)
    db.session.commit()
    exam = Exam.query.get(q.examId)
    if exam:
        exam.totalQuestions = Question.query.filter_by(examId=exam.id).count()
        db.session.commit()
    return jsonify(success=True, id=q.id, image_path=q.image_path, image_url=get_image_url(q.image_path))


@app.route('/api/admin/import-questions-zip', methods=['POST'])
@admin_required
def import_questions_zip():
    exam_id = request.form.get('examId', type=int)
    if not exam_id:
        return jsonify(success=False, message="examId must be a valid integer."), 400
    exam = db.session.get(Exam, exam_id)
    if not exam:
        return jsonify(success=False, message="Exam not found."), 404

    archive_file = request.files.get('file')
    if not archive_file or not archive_file.filename:
        return jsonify(success=False, message="Upload a ZIP file in the file field."), 400

    csv_contents, images, archive_error, status = read_question_import_archive(archive_file)
    if archive_error:
        return jsonify(success=False, message=archive_error), status
    prepared, csv_error = parse_question_import_csv(csv_contents, images, exam)
    if csv_error:
        return jsonify(success=False, message=csv_error), 400

    stored_images = {}
    created_image_paths = []
    for _, image_member in prepared:
        if image_member and image_member not in stored_images:
            image_path, storage_error = store_question_import_image(
                image_member.rsplit('/', 1)[-1],
                images[image_member],
            )
            if storage_error:
                for created_path in created_image_paths:
                    try:
                        os.remove(os.path.join(UPLOAD_FOLDER, created_path))
                    except OSError:
                        app.logger.exception("Could not remove a partial question image after import failure")
                return jsonify(success=False, message=storage_error), 503
            stored_images[image_member] = image_path
            created_image_paths.append(image_path)

    try:
        for question, image_member in prepared:
            image_path = stored_images.get(image_member) if image_member else None
            db.session.add(Question(
                examId=exam.id,
                examType=exam.examType,
                subject=question['subject'],
                question=question['question'],
                options=question['options'],
                answer=question['answer'],
                explanation=question['explanation'],
                year=exam.year,
                image_path=image_path,
            ))
        db.session.flush()
        exam.totalQuestions = Question.query.filter_by(examId=exam.id).count()
        db.session.commit()
    except Exception:
        db.session.rollback()
        app.logger.exception("Bulk question import failed for exam %s", exam.id)
        for created_path in created_image_paths:
            try:
                os.remove(os.path.join(UPLOAD_FOLDER, created_path))
            except OSError:
                app.logger.exception("Could not remove a question image after import failure")
        return jsonify(success=False, message="Could not save the imported questions."), 500

    return jsonify(
        success=True,
        exam_id=exam.id,
        imported=len(prepared),
        message=f"Imported {len(prepared)} questions.",
    ), 201


@app.route('/api/upload/question-image', methods=['POST'])
def upload_question_image():
    file = request.files.get('image')
    if not file or file.filename == '':
        return jsonify(success=False, message="No file"), 400
    if not allowed_file(file.filename):
        return jsonify(success=False, message="Invalid type"), 400

    cloud_url = upload_to_cloudinary(file, folder="examcore/questions")
    if cloud_url:
        return jsonify(success=True, image_path=cloud_url, image_url=cloud_url)

    try: file.seek(0)
    except: pass
    filename = f"q_{int(time.time())}_{secure_filename(file.filename)}"
    filepath = os.path.join(QUESTION_FOLDER, filename)
    file.save(filepath)
    rel_path = f"questions/{filename}"
    return jsonify(success=True, image_path=rel_path, image_url=f"/uploads/{rel_path}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))