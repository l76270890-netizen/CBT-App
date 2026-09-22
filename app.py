from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

# FIX CORS - simple allow all
CORS(app, resources={r"/api/*": {"origins": "*"}})

# FIX DB PATH - absolute path so you can find it
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(basedir, 'examcore.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)


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


# FIX - RECREATE DB EVERY START IF OLD SCHEMA
with app.app_context():
    # Delete old corrupted DB files
    try:
        if os.path.exists(os.path.join(basedir, 'instance', 'examcore.db')):
            os.remove(os.path.join(basedir, 'instance', 'examcore.db'))
    except:
        pass

    db.drop_all()
    db.create_all()

    if not Exam.query.first():
        exam1 = Exam(title="JAMB 2024 Mock", examType="JAMB",
                     subject="Use of English,Mathematics,Biology,Chemistry", year=2024, duration=120, totalQuestions=40)
        exam2 = Exam(title="WAEC 2023 Practice", examType="WAEC",
                     subject="Physics", year=2023, duration=60, totalQuestions=20)
        exam3 = Exam(title="General Knowledge", examType="GENERAL",
                     subject="General Knowledge", year=2024, duration=30, totalQuestions=20)
        db.session.add_all([exam1, exam2, exam3])
        db.session.commit()
        db.session.add_all([
            Question(examId=exam1.id, examType="JAMB", subject="Use of English", question="What is a noun?", options={
                     "A": "Name of person", "B": "Action", "C": "Color", "D": "None"}, answer="A", explanation="Noun is name"),
            Question(examId=exam1.id, examType="JAMB", subject="Mathematics", question="2+2 =?",
                     options={"A": "3", "B": "4", "C": "5", "D": "6"}, answer="B", explanation="Basic math"),
            Question(examId=exam3.id, examType="GENERAL", subject="General Knowledge", question="Capital of Nigeria?", options={
                     "A": "Lagos", "B": "Abuja", "C": "Kano", "D": "Ibadan"}, answer="B", explanation="Abuja is capital"),
            Question(examId=exam3.id, examType="GENERAL", subject="General Knowledge", question="Nigeria independence year?", options={
                     "A": "1960", "B": "1963", "C": "1970", "D": "1959"}, answer="A", explanation="1960"),
        ])
        db.session.commit()
        print("✅ Database created at:", os.path.join(basedir, 'examcore.db'))


@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if not data.get('email') or not data.get('password'):
        return jsonify(success=False, message="Missing fields"), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify(success=False, message="Email already exists"), 400
    user = User(username=data.get('name') or data.get('username') or data['email'].split(
        '@')[0], email=data['email'], password=generate_password_hash(data['password']))
    db.session.add(user)
    db.session.commit()
    return jsonify(success=True, user_id=user.id, username=user.username, email=user.email)


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if user and check_password_hash(user.password, data['password']):
        return jsonify(success=True, user_id=user.id, username=user.username, email=user.email)
    return jsonify(success=False, message="Invalid email or password"), 401


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
    q = Question.query
    if examType:
        q = q.filter(Question.examType.ilike(f"%{examType}%"))
    if subject:
        q = q.filter(Question.subject.ilike(f"%{subject}%"))
    if subjects:
        subs = [s.strip() for s in subjects.split(',') if s.strip()]
        if subs:
            q = q.filter(Question.subject.in_(subs))
    questions = q.all()
    return jsonify([{"id": x.id, "examId": x.examId, "examType": x.examType, "subject": x.subject, "question": x.question, "options": x.options, "answer": x.answer, "explanation": x.explanation, "year": x.year} for x in questions])


@app.route('/api/save-result', methods=['POST'])
def save_result():
    d = request.json
    r = CBTResult(user_id=d.get('user_id'), email=d.get('email'), title=d.get('title', 'Test'), score=d['score'], total=d['total'], duration=d.get(
        'duration', '0m'), status=d.get('status', 'Failed'), mode=d.get('mode', 'exam'), examType=d.get('examType', 'JAMB'))
    db.session.add(r)
    db.session.commit()
    return jsonify(success=True, id=r.id)


@app.route('/api/history', methods=['POST'])
def save_history():
    d = request.json
    r = CBTResult(user_id=d.get('user_id'), email=d.get('email'), title=d.get('title', 'Practice Test'), score=d['score'], total=d['total'], duration=d.get(
        'duration', '0m'), status=d.get('status', 'Failed'), mode=d.get('mode', 'exam'), examType=d.get('examType', 'JAMB'))
    db.session.add(r)
    db.session.commit()
    return jsonify(success=True, id=r.id)


@app.route('/api/history/<int:user_id>', methods=['GET'])
def history(user_id):
    res = CBTResult.query.filter_by(
        user_id=user_id).order_by(CBTResult.date.desc()).all()
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
            user = User(
                username="Admin", email=data['email'], password=generate_password_hash("admin123"))
            db.session.add(user)
            db.session.commit()
        return jsonify(success=True, user_id=user.id, username=user.username, email=user.email, role="admin")
    user = User.query.filter_by(email=data['email']).first()
    if user and check_password_hash(user.password, data['password']):
        return jsonify(success=True, user_id=user.id, username=user.username, email=user.email, role="admin")
    return jsonify(success=False, message="Invalid admin"), 401


@app.route('/api/admin/create-exam', methods=['POST'])
def create_exam():
    d = request.json
    total_q = len(d.get('questions', [])) or 0
    exam = Exam(title=d['title'], examType=d['examType'], subject=",".join(d['subjects']), year=int(d.get(
        'year', 2024)), duration=int(d.get('duration', 60)), totalQuestions=total_q if total_q > 0 else 20)
    db.session.add(exam)
    db.session.commit()
    for q in d.get('questions', []):
        opts = q['options']
        if isinstance(opts, list):
            opts = {"A": opts[0], "B": opts[1], "C": opts[2], "D": opts[3]}
        ques = Question(examId=exam.id, examType=d['examType'], subject=q['subject'], question=q['question'],
                        options=opts, answer=q['correctAnswer'], explanation=q.get('explanation', ''), year=int(d.get('year', 2024)))
        db.session.add(ques)
    db.session.commit()
    return jsonify(success=True, exam_id=exam.id, message=f"{d['title']} saved")


@app.route('/api/admin/exam/<int:exam_id>', methods=['PUT', 'DELETE'])
def manage_exam(exam_id):
    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify(message="Not found"), 404
    if request.method == 'DELETE':
        Question.query.filter_by(examId=exam_id).delete()
        db.session.delete(exam)
        db.session.commit()
        return jsonify(success=True)
    data = request.json
    if 'title' in data:
        exam.title = data['title']
    if 'examType' in data:
        exam.examType = data['examType']
    if 'year' in data:
        exam.year = int(data['year'])
    if 'duration' in data:
        exam.duration = int(data['duration'])
    if 'subjects' in data:
        exam.subject = ",".join(data['subjects'])
    db.session.commit()
    return jsonify(success=True)


@app.route('/api/admin/add-question', methods=['POST'])
def add_question():
    d = request.json
    exam = Exam.query.get(int(d['examId']))
    exam_type = exam.examType if exam else d.get('examType', 'JAMB')
    q = Question(examId=int(d['examId']), examType=exam_type, subject=d['subject'], question=d['question'],
                 options=d['options'], answer=d['correctAnswer'], explanation=d.get('explanation', ''))
    db.session.add(q)
    db.session.commit()
    if exam:
        exam.totalQuestions = Question.query.filter_by(examId=exam.id).count()
        db.session.commit()
    return jsonify(success=True, id=q.id)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
