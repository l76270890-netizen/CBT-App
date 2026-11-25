"""Parse JAMB Physics past questions (1983-2004) from a two-column PDF text dump.

The raw text is a flattened two-column PDF page:
  - Left column:  question number, question text, options A-E (often A,B on one line; C,D,E below)
  - Right column: separate question number, question text, options A-E
  - Watermark lines and page numbers are noise.

Strategy:
  1. Split text into per-year blocks by "Physics YYYY" headers.
  2. Within each block, split each physical line into left/right halves at a
     fixed column boundary.
  3. Walk the left stream and right stream independently, collecting question
     numbers, question bodies, and option letters.
  4. Merge the two streams and write physics.csv.
"""
import csv
import os
import re

RAW_FILE = os.path.join(os.path.dirname(__file__), "data", "physics_raw.txt")
OUT_FILE = os.path.join(os.path.dirname(__file__), "data", "physics.csv")

YEAR_HEADER = re.compile(r"Physics\s+(\d{4})")
QNUM = re.compile(r"^\s*(\d{1,2})\.\s+(.*)$")
OPTION = re.compile(r"^\s*([A-E])\.\s+(.*)$")
WATERMARK = re.compile(r"^\s*(Download MySchoolGist|www\.myschoolgist\.com)")
PAGE_NUM = re.compile(r"^\s*\d{3,4}\s*$")

# Column split: left column tokens start before x=79, right column at/after.
COL_SPLIT = 79


def clean(line: str) -> str:
    return line.rstrip("\n\r\f")


def is_noise(line: str) -> bool:
    s = line.strip()
    if not s:
        return True
    if WATERMARK.match(s):
        return True
    if PAGE_NUM.match(s):
        return True
    if YEAR_HEADER.match(s):
        return True
    return False


def split_year_blocks(lines):
    blocks = []
    current_year = None
    current = []
    for ln in lines:
        m = YEAR_HEADER.match(ln.strip())
        if m:
            if current_year is not None and current:
                blocks.append((current_year, current))
            current_year = int(m.group(1))
            current = []
            continue
        if is_noise(ln):
            continue
        current.append(ln)
    if current_year is not None and current:
        blocks.append((current_year, current))
    return blocks


def split_columns(block_lines):
    """Return (left_text, right_text).

    The two PDF columns are not row-aligned, and a single physical line can
    contain fragments from BOTH columns. So for each physical line we collect
    the tokens in the left region (x < 78) and the right region (x >= 78)
    separately, appending each region's tokens to its own column buffer. This
    keeps the two columns strictly separated; each stream is then parsed on
    its own.
    """
    left_parts, right_parts = [], []
    for ln in block_lines:
        left_tokens, right_tokens = [], []
        for m in re.finditer(r"\S+", ln):
            seg = m.group(0)
            start = m.start()
            # Skip watermark/page artifacts that sit in the middle
            if seg in ("m", "gis", "ool", "sch", "w.m", "ww", "y", "t.co"):
                continue
            if start < 78:
                left_tokens.append(seg)
            else:
                right_tokens.append(seg)
        left_parts.extend(left_tokens)
        right_parts.extend(right_tokens)
    left_text = " ".join(left_parts)
    right_text = " ".join(right_parts)
    return left_text, right_text


def parse_stream(text):
    """Parse a single column's text into question dicts.

    Uses marker-based slicing: a question marker is a number followed by a
    period that is NOT part of a decimal (e.g. '5.5' is not a marker); an
    option marker is a letter A-E followed by a period.
    """
    markers = []
    for m in re.finditer(r"(?<!\d)(\d{1,2})\.(?!\d)|(?<![A-Za-z])([A-E])\.", text):
        if m.group(1):
            markers.append((m.start(), "q", int(m.group(1))))
        else:
            markers.append((m.start(), "opt", m.group(2)))
    questions = []
    i = 0
    n = len(markers)
    while i < n:
        pos, kind, val = markers[i]
        if kind != "q":
            i += 1
            continue
        qnum = val
        i += 1
        end = markers[i][0] if i < n else len(text)
        body = text[pos + len(str(qnum)) + 1:end]
        options = {}
        while i < n:
            pos2, kind2, val2 = markers[i]
            if kind2 != "opt":
                break
            letter = val2
            i += 1
            end2 = markers[i][0] if i < n else len(text)
            opt_text = text[pos2 + 2:end2]
            options[letter] = opt_text.strip()
        body = " ".join(body.split())
        questions.append({"number": qnum, "question": body, "options": options})
    return questions


def merge_streams(left_qs, right_qs):
    """Merge left and right streams, keyed by question number."""
    by_num = {}
    for q in left_qs + right_qs:
        num = q["number"]
        if num not in by_num:
            by_num[num] = q
        else:
            existing = by_num[num]
            e_opts = sum(1 for v in existing["options"].values() if v)
            n_opts = sum(1 for v in q["options"].values() if v)
            if n_opts > e_opts or (n_opts == e_opts and len(q["question"]) > len(existing["question"])):
                by_num[num] = q
    return [by_num[k] for k in sorted(by_num)]


def main():
    with open(RAW_FILE, encoding="utf-8") as fh:
        text = fh.read()
    lines = [clean(ln) for ln in text.splitlines()]
    blocks = split_year_blocks(lines)
    rows = []
    for year, block_lines in blocks:
        left_text, right_text = split_columns(block_lines)
        left_qs = parse_stream(left_text)
        right_qs = parse_stream(right_text)
        qs = merge_streams(left_qs, right_qs)
        for q in qs:
            opts = q["options"]
            rows.append({
                "examType": "JAMB",
                "subject": "Physics",
                "topic": "",
                "year": year,
                "number": q["number"],
                "question": q["question"],
                "optionA": opts.get("A", ""),
                "optionB": opts.get("B", ""),
                "optionC": opts.get("C", ""),
                "optionD": opts.get("D", ""),
                "optionE": opts.get("E", ""),
                "correctAnswer": "",
                "explanation": "",
                "imageUrl": "",
            })
    with open(OUT_FILE, "w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=[
            "examType", "subject", "topic", "year", "number", "question",
            "optionA", "optionB", "optionC", "optionD", "optionE",
            "correctAnswer", "explanation", "imageUrl",
        ])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Parsed {len(rows)} questions across {len(blocks)} years -> {OUT_FILE}")
    per_year = {}
    for r in rows:
        per_year[r["year"]] = per_year.get(r["year"], 0) + 1
    for y in sorted(per_year):
        print(f"  {y}: {per_year[y]}")


if __name__ == "__main__":
    main()