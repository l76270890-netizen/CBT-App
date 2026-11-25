"""Parse JAMB Principles of Accounting raw OCR text into rows for principles_of_accounting.csv.

Reads ``backend/data/poa_raw.txt`` (one numbered question per block) and writes
``backend/data/principles_of_accounting.csv`` with columns matching the
``validate_question_payload`` payload schema:
  subject, question, options (A–D), correctAnswer, explanation, year, topic, image_path.

Topic assignment is heuristic keyword counting over the question text:
  Double Entry   -> debit/credit/journal
  Trial Balance  -> trial balance/balance sheet/financial position/books
  Final Accounts -> final accounts/profit & loss/income statement/net profit/assets/liabilities/equity
  Partnership    -> partnership/limited liability company/corporation/shareholder
  All others     -> Double Entry
"""
import csv
import os
import re
import sys

BACKEND_DATA = os.path.join(os.path.dirname(__file__), "data", "poa_raw.txt")
OUT_CSV = os.path.join(os.path.dirname(__file__), "data", "principles_of_accounting.csv")

TOPIC_KEYWORDS = {
    "Double Entry": ["double entry", "debit", "credit", "journal"],
    "Trial Balance": ["trial balance", "balance sheet", "statement of financial position", "books"],
    "Final Accounts": ["final accounts", "profit & loss", "income statement", "net profit", "assets",
                       "liabilities", "equity"],
    "Partnership": ["partnership", "limited liability company", "corporation", "shareholder"],
}


def assign_topic(text):
    text_lower = text.lower()
    best_topic = ""
    best_score = 0
    for topic, keywords in TOPIC_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > best_score:
            best_score = score
            best_topic = topic
    return best_topic if best_score > 0 else "Double Entry"


def parse_block(block):
    """Return a dict with keys num, text, options, answer, explanation, year, topic, image_path."""
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
    return {
        "num": current.get("num", 0),
        "question": current["text"],
        "options": options,
        "correctAnswer": "",
        "explanation": explanation,
        "year": year,
        "topic": assign_topic(current["text"]),
        "image_path": "",
    }


def main():
    if not os.path.exists(BACKEND_DATA):
        print(f"ERROR: {BACKEND_DATA} does not exist.", file=sys.stderr)
        sys.exit(1)
    with open(BACKEND_DATA, encoding="utf-8") as fh:
        content = fh.read().strip()
    blocks = [b.strip() for b in content.split("\n\n") if b.strip()]
    questions = []
    for block in blocks:
        questions.append(parse_block(block))
    rows = []
    for q in questions:
        row = {
            "subject": "Principles of Accounting",
            "question": q["question"],
            "options": q["options"],
            "correctAnswer": "",
            "explanation": q["explanation"],
            "year": str(q["year"]) if q["year"] is not None else "",
            "topic": q["topic"],
            "image_path": q["image_path"],
        }
        rows.append(row)
    with open(OUT_CSV, "w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=[
            "id", "question", "optiona", "optionb", "optionc", "optiond",
            "correctanswer", "explanation", "year", "topic", "imageurl"
        ])
        writer.writeheader()
        for i, r in enumerate(rows, start=1):
            writer.writerow({
                "id": str(i),
                "question": r["question"],
                "optiona": r["options"][0],
                "optionb": r["options"][1],
                "optionc": r["options"][2],
                "optiond": r["options"][3],
                "correctanswer": r["correctAnswer"],
                "explanation": r["explanation"],
                "year": r["year"],
                "topic": r["topic"],
                "imageurl": r["image_path"],
            })
    print(f"Wrote {len(rows)} rows to {OUT_CSV}")


if __name__ == "__main__":
    main()
