"""Import JAMB Principles of Accounting questions into the database.

Reads ``backend/data/poa_raw.txt`` (numbered questions) or ``backend/data/poa.csv``
and inserts rows into the ``questions`` table (subject = "Principles of Accounting").
Follows the pattern of ``crk_import.py`` / ``commerce_import.py``.
"""
import csv
import os

from app import app, db, Question, School, validate_study_question_payload

BACKEND_DATA = os.path.join(os.path.dirname(__file__), "data", "poa_raw.txt")
POA_CSV = os.path.join(os.path.dirname(__file__), "data", "poa.csv")


def assign_topic(text):
    text_lower = text.lower()
    best_topic = ""
    best_score = 0
    for topic, keywords in {
        "Double Entry": ["double entry", "debit", "credit", "journal"],
        "Trial Balance": ["trial balance", "balance sheet", "statement of financial position", "books"],
        "Final Accounts": ["final accounts", "profit & loss", "income statement", "net profit", "assets",
                           "liabilities", "equity"],
        "Partnership": ["partnership", "limited liability company", "corporation", "shareholder"],
    }.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > best_score:
            best_score = score
            best_topic = topic
    return best_topic if best_score > 0 else "Double Entry"


def main():
    from app import app, db, Question, School, validate_study_question_payload

    with app.app_context():
        existing_count = Question.query.filter(
            Question.examId.is_(None),
            Question.examType.ilike("JAMB"),
            Question.subject.ilike("Principles of Accounting"),
        ).count()
        if existing_count >= 300:
            app.logger.info(
                "Principles of Accounting question bank already imported (%s questions); skipping.",
                existing_count,
            )
            return {"imported": 0, "skipped": existing_count, "failed": 0, "reason": "already_imported"}

        school = School.query.order_by(School.id.asc()).first()
        if not school:
            app.logger.warning("No school found; skipping Principles of Accounting import.")
            return {"imported": 0, "skipped": 0, "failed": 0, "reason": "no_school"}

        school_id = school.id
        seen = set()
        imported = 0
        skipped = 0
        failed = 0

        if os.path.exists(BACKEND_DATA):
            with open(BACKEND_DATA, encoding="utf-8") as fh:
                content = fh.read().strip()
            blocks = [b.strip() for b in content.split("\n\n") if b.strip()]
            questions = []
            for block in blocks:
                current = {}
                lines = block.splitlines()
                for line in lines:
                    m = re.match(r"^\s*\d+\.\s+(.*)$", line)
                    if m:
                        if current:
                            current["num"] = int(m.group(1))
                            current["text"] = line
                        current["text"] += "\n" + line
                    elif line.strip():
                        current["text"] += "\n" + line
                if current:
                    current["num"] = int(re.search(r"\d+", current["text"]).group())
                    current["text"] = current["text"].strip()
                options = []
                for letter in ("A", "B", "C", "D"):
                    found = False
                    for ln in current["text"].splitlines():
                        lm = re.match(rf"^{letter}\.?\s*(\S+)", ln)
                        if lm:
                            options.append(lm.group(1).strip())
                            found = True
                            break
                    if not found:
                        options.append("")
                answer = ""
                for ln in reversed(current["text"].splitlines()):
                    lm = re.match(r".*[AD]\.?$", ln)
                    if lm:
                        answer = lm.group(1).upper()
                        break
                explanation = ""
                for ln in reversed(current["text"].splitlines()):
                    if ln.strip().lower().startswith("explanation") or "explanation:" in ln.lower():
                        explanation = ln.strip()
                        break
                year = None
                m = re.search(r"\b(19|20)\d{2}\b", current["text"])
                if m:
                    year = int(m.group(0))
                rows = [
                    {
                        "subject": "Principles of Accounting",
                        "question": current["text"],
                        "options": options,
                        "correctAnswer": "",
                        "explanation": explanation,
                        "year": str(year) if year is not None else "",
                        "topic": assign_topic(current["text"]),
                        "image_path": "",
                    }
                ]
                for r in rows:
                    seen.add((r["topic"].strip().lower(), str(year) if year is not None else "", " ".join((r["question"] or "").casefold().split())))
                    db.session.add(Question(examId=None, school_id=school_id, examType="JAMB",
                                           subject="Principles of Accounting", topic=r["topic"], question=r["question"],
                                           options=r["options"], answer="", explanation=r["explanation"],
                                           year=int(year) if year is not None else None, image_path=r["image_path"]))
                    imported += 1
                if imported % 50 == 0:
                    db.session.commit()
        db.session.commit()
        app.logger.info("Principles of Accounting import complete: imported=%s skipped=%s failed=%s", imported, skipped, failed)
        return {"imported": imported, "skipped": skipped, "failed": failed}


if __name__ == "__main__":
    import sys
    result = main()
    print(result)
