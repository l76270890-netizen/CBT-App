import csv
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "commerce.csv")


def deduplicate_commerce_questions():
    from app import app, db, Question

    with app.app_context():
        rows = Question.query.filter(
            Question.examId.is_(None),
            Question.examType.ilike("JAMB"),
            Question.subject.ilike("Commerce"),
        ).order_by(Question.id.asc()).all()
        seen = set()
        duplicates = []
        for q in rows:
            key = (
                (q.topic or "").strip().lower(),
                q.year,
                " ".join((q.question or "").casefold().split()),
            )
            if key in seen:
                duplicates.append(q)
            else:
                seen.add(key)
        for q in duplicates:
            db.session.delete(q)
        if duplicates:
            db.session.commit()
        app.logger.info(
            "Commerce deduplication: total=%s duplicates_removed=%s remaining=%s",
            len(rows),
            len(duplicates),
            len(rows) - len(duplicates),
        )
        return len(rows), len(duplicates)


def import_commerce_questions():
    from app import app, db, Question, School, validate_study_question_payload

    deduplicate_commerce_questions()

    with app.app_context():
        existing_count = Question.query.filter(
            Question.examId.is_(None),
            Question.examType.ilike("JAMB"),
            Question.subject.ilike("Commerce"),
        ).count()
        if existing_count >= 300:
            app.logger.info(
                "Commerce question bank already imported (%s questions); skipping.",
                existing_count,
            )
            return {"imported": 0, "skipped": existing_count, "failed": 0, "reason": "already_imported"}

        school = School.query.order_by(School.id.asc()).first()
        if not school:
            app.logger.warning("No school found; skipping Commerce question import.")
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
                    "subject": (row.get("subject") or "Commerce").strip() or "Commerce",
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
                        app.logger.warning("Commerce import row failed: %s", error)
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
            "Commerce import complete: imported=%s skipped=%s failed=%s",
            imported,
            skipped,
            failed,
        )
        return {"imported": imported, "skipped": skipped, "failed": failed}