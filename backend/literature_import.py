import csv
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "literature_in_english.csv")


def import_literature_questions():
    """Import the Literature-in-English JAMB past questions once.

    The import is idempotent: it skips when at least 400 Literature questions
    already exist, and it skips individual duplicate rows. It is called from
    app.py at startup and is safe to run on every cold start.
    """
    from app import app, db, Question, School, validate_study_question_payload

    with app.app_context():
        existing_count = Question.query.filter(
            Question.examId.is_(None),
            Question.examType.ilike("JAMB"),
            Question.subject.ilike("Literature in English"),
        ).count()
        if existing_count >= 400:
            app.logger.info(
                "Literature question bank already imported (%s questions); skipping.",
                existing_count,
            )
            return {"imported": 0, "skipped": existing_count, "failed": 0, "reason": "already_imported"}

        school = School.query.order_by(School.id.asc()).first()
        if not school:
            app.logger.warning("No school found; skipping Literature question import.")
            return {"imported": 0, "skipped": 0, "failed": 0, "reason": "no_school"}

        school_id = school.id
        imported = 0
        skipped = 0
        failed = 0

        with open(DATA_FILE, encoding="utf-8-sig", newline="") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                options = {
                    "A": (row.get("optionA") or "").strip(),
                    "B": (row.get("optionB") or "").strip(),
                    "C": (row.get("optionC") or "").strip(),
                    "D": (row.get("optionD") or "").strip(),
                }
                if (row.get("optionE") or "").strip():
                    options["E"] = row["optionE"].strip()

                payload = {
                    "examType": (row.get("examType") or "JAMB").strip() or "JAMB",
                    "subject": (row.get("subject") or "Literature in English").strip() or "Literature in English",
                    "topic": (row.get("topic") or "").strip(),
                    "year": (row.get("year") or "").strip(),
                    "question": (row.get("question") or "").strip(),
                    "options": options,
                    "correctAnswer": (row.get("correctAnswer") or "").strip().upper(),
                    "explanation": (row.get("explanation") or "").strip(),
                    "imageUrl": (row.get("imageUrl") or "").strip() or None,
                }

                validated, error = validate_study_question_payload(payload, school_id=school_id)
                if error:
                    if "already exists" in error.lower():
                        skipped += 1
                    else:
                        failed += 1
                        app.logger.warning("Literature import row failed: %s", error)
                    continue

                db.session.add(Question(
                    examId=None,
                    school_id=school_id,
                    examType=validated["examType"],
                    subject=validated["subject"],
                    topic=validated["topic"],
                    question=validated["question"],
                    options=validated["options"],
                    answer=validated["answer"],
                    explanation=validated["explanation"],
                    year=validated["year"],
                    image_path=validated["image_path"],
                ))
                imported += 1
                if imported % 50 == 0:
                    db.session.commit()

        db.session.commit()
        app.logger.info(
            "Literature import complete: imported=%s skipped=%s failed=%s",
            imported,
            skipped,
            failed,
        )
        return {"imported": imported, "skipped": skipped, "failed": failed}