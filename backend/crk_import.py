import csv
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "crk.csv")


def import_crk_questions():
    from app import app, db, Question, School

    with app.app_context():
        # Align the subject name with the Study card ("Christian Religious Studies").
        db.session.execute(db.text(
            "UPDATE questions SET subject = 'Christian Religious Studies' "
            "WHERE examId IS NULL AND examType = 'JAMB' "
            "AND subject = 'Christian Religious Knowledge'"
        ))
        db.session.commit()

        existing_count = Question.query.filter(
            Question.examId.is_(None),
            Question.examType.ilike("JAMB"),
            Question.subject.ilike("Christian Religious Studies"),
        ).count()
        if existing_count >= 700:
            app.logger.info(
                "CRK question bank already imported (%s questions); skipping.",
                existing_count,
            )
            return {"imported": 0, "skipped": existing_count, "failed": 0, "reason": "already_imported"}

        school = School.query.order_by(School.id.asc()).first()
        if not school:
            app.logger.warning("No school found; skipping CRK question import.")
            return {"imported": 0, "skipped": 0, "failed": 0, "reason": "no_school"}

        school_id = school.id
        existing = Question.query.filter(
            Question.examId.is_(None),
            Question.examType.ilike("JAMB"),
            Question.subject.ilike("Christian Religious Studies"),
        ).all()
        seen = {
            (
                (q.topic or "").strip().lower(),
                q.year,
                " ".join((q.question or "").casefold().split()),
            )
            for q in existing
        }

        imported = 0
        skipped = 0
        failed = 0

        with open(DATA_FILE, encoding="utf-8-sig", newline="") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                topic = (row.get("topic") or "").strip()
                year_raw = (row.get("year") or "").strip()
                question = (row.get("question") or "").strip()
                if not question:
                    failed += 1
                    continue
                try:
                    year = int(year_raw) if year_raw else None
                except ValueError:
                    failed += 1
                    continue
                key = (topic.lower(), year, " ".join(question.casefold().split()))
                if key in seen:
                    skipped += 1
                    continue
                options = {
                    "A": (row.get("optionA") or "").strip(),
                    "B": (row.get("optionB") or "").strip(),
                    "C": (row.get("optionC") or "").strip(),
                    "D": (row.get("optionD") or "").strip(),
                }
                if (row.get("optionE") or "").strip():
                    options["E"] = row["optionE"].strip()
                db.session.add(Question(
                    examId=None,
                    school_id=school_id,
                    examType=(row.get("examType") or "JAMB").strip() or "JAMB",
                    subject=(row.get("subject") or "Christian Religious Studies").strip(),
                    topic=topic,
                    question=question,
                    options=options,
                    answer="",
                    explanation=(row.get("explanation") or "").strip(),
                    year=year,
                    image_path=(row.get("imageUrl") or "").strip() or None,
                ))
                seen.add(key)
                imported += 1
                if imported % 50 == 0:
                    db.session.commit()
        db.session.commit()
        app.logger.info("CRK import complete: imported=%s skipped=%s failed=%s", imported, skipped, failed)
        return {"imported": imported, "skipped": skipped, "failed": failed}