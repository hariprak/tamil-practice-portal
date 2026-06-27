"""
Extract grammar MCQ blocks from Tamil textbook PDFs into classN_ilakkanam.json.

Reuses PDF text repair from extract_words.py (dedup_page_text, normalize_tamil).
Parses TN textbook "சரியான விடையைத் தேர்ந்தெடுத்து எழுதுக" MCQ blocks with
(அ)(ஆ)(இ)(ஈ) options. Answers are inferred from nearby lesson text when possible.

Usage:
    py scripts/extract_ilakkanam_mcq.py data/pdfs/class8.pdf data/class8_ilakkanam.json --class 8
    py scripts/build_ilakkanamjs.py
"""
import argparse
import json
import os
import re
import sys

import fitz

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
from extract_words import dedup_page_text, normalize_tamil  # noqa: E402

OPTION_PART = re.compile(r"[அஆஇஈ]\)\s*(.+?)(?=\s+[அஆஇஈ]\)|$)")
STEM_NUM = re.compile(r"^(\d+)\.\s*(.+)$")
BLANK = re.compile(r"_{2,}|____+")
QUOTE = re.compile(r"[‘'«]([^’'»]+)[’'»]")
PDF_JUNK = re.compile(
    r"\d+th Std Tamil.*?\.ind \d+|"
    r"\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2}|"
    r"[\x00-\x08\x0b\x0c\x0e-\x1f]"
)
UNIT_MARK = re.compile(r"Std Tamil CBSE - Unit (\d+)\.ind")
IYAL_ORD = {
    "ஒன்று": 1, "இரண்டு": 2, "மூன்று": 3, "நான்கு": 4,
    "ஐந்து": 5, "ஆறு": 6, "ஏழு": 7, "எட்டு": 8, "ஒன்பது": 9,
}
IYAL_MARK = re.compile(
    r"இயல்(?:இயல்)?(?:" + "|".join(map(re.escape, IYAL_ORD.keys())) + r")"
)
GRAMMAR_HINT = re.compile(
    r"(பெயர்|வினை|இடை|உரிச்சொல்|வேற்றுமை|தொடர்|வினைமுற்று|தொகை|சந்தி|"
    r"எழுத்து|உருபு|அணி|சொல்|பொருள்|பிரித்து|சேர்த்து|நிறை|எதுகை|"
    r"செய்வினை|செயப்பாட்டு|எழுவாய்|பயனிலை|பெயரெச்சம்|பெயரடை|அடைமொழி)"
)
HARD_HINT = re.compile(
    r"(வேற்றுமை|தொடர்|வினைமுற்று|தொகை|சந்தி|பிரித்தெழுத|செயப்பாட்டு|செய்வினை)"
)


def extract_page_text(doc):
    parts = []
    for page in doc:
        parts.append(normalize_tamil(dedup_page_text(page)))
    return "\n".join(parts)


def clean_line(s):
    s = PDF_JUNK.sub("", s)
    s = s.replace("\t", " ").replace("\u00a0", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def parse_options(line):
    """Return up to four option strings from text with அ) ஆ) இ) ஈ) markers."""
    line = clean_line(line)
    if "அ)" not in line:
        return []
    parts = OPTION_PART.findall(line + " ")
    opts = [clean_line(p) for p in parts if clean_line(p)]
    return opts[:4] if len(opts) >= 4 else []


def gather_options(lines, idx):
    """Collect four MCQ options that may span multiple consecutive lines."""
    chunks = []
    for j in range(idx, min(idx + 6, len(lines))):
        line = clean_line(lines[j])
        if not line:
            continue
        if chunks and STEM_NUM.match(line) and "அ)" not in line:
            break
        if "அ)" in line or (chunks and re.search(r"[ஆஇஈ]\)", line)):
            chunks.append(line)
            combined = " ".join(chunks)
            opts = parse_options(combined)
            if len(opts) == 4:
                return opts, j + 1
    return [], idx


def parse_stem_chunk(chunk):
    """Extract numbered stems from a text chunk (may contain multiple questions)."""
    chunk = clean_line(chunk)
    m = STEM_NUM.match(chunk)
    if not m:
        return None
    body = m.group(2).strip()
    if len(body) < 8:
        return None
    if "எழுதுக" in body and not BLANK.search(body) and "எது" not in body:
        return None
    return body


def split_stem_option_chunks(line):
    """
    A line may be: '1. stem _____. அ) a ஆ) b இ) c ஈ) d  2. stem2 ...'
    Split into (stem_text, options_line_or_None) pieces.
    """
    line = clean_line(line)
    if "அ)" not in line:
        return []

    pieces = []
    # Split on numbered question starts
    parts = re.split(r"(?=\d+\.\s)", line)
    for part in parts:
        part = part.strip()
        if not part:
            continue
        opt_idx = part.find("அ)")
        if opt_idx == -1:
            continue
        stem_part = part[:opt_idx].strip()
        opt_part = part[opt_idx:].strip()
        stem = parse_stem_chunk(stem_part)
        opts = parse_options(opt_part)
        if stem and len(opts) == 4:
            pieces.append((stem, opts))
    return pieces


def guess_topic(stem):
    if "பெயர்ச்சொல்" in stem or ("பெயர்" in stem and "வினை" not in stem):
        return "பெயர்ச்சொல்"
    if "வினைமுற்று" in stem:
        return "வினைமுற்று"
    if "வினை" in stem:
        return "வினைச்சொல்"
    if "இடைச்சொல்" in stem or "இடை" in stem:
        return "இடைச்சொல்"
    if "உரிச்சொல்" in stem or "உரி" in stem:
        return "உரிச்சொல்"
    if "வேற்றுமை" in stem or "உருபு" in stem:
        return "வேற்றுமை"
    if "தொடர்" in stem:
        return "தொடர்"
    if "தொகை" in stem or "சேர்த்து" in stem or "பிரித்து" in stem:
        return "தொகை"
    if "அணி" in stem:
        return "அணி"
    if "எழுத்து" in stem:
        return "எழுத்து"
    return "இலக்கணம்"


def guess_diff(topic, stem):
    if HARD_HINT.search(stem) or topic in ("வேற்றுமை", "தொடர்", "வினைமுற்று", "தொகை"):
        return "hard"
    if len(stem) > 55:
        return "hard"
    return "easy"


def apply_special_rules(stem, options, scores, ctx):
    """Topic-specific answer boosts from textbook exercise patterns."""
    if "பெயரடை இடம்பெறாத" in stem:
        for i, opt in enumerate(options):
            if not re.match(r"^(நல்ல|இனிய|கொடிய|புதிய|பழிய|சிறந்த|விரும்ப)", opt.strip()):
                scores[i] += 16

    if "முறையான தொடர்" in stem or "முறையான தொடரை" in stem:
        for i, opt in enumerate(options):
            if re.search(r"தமிழர்களின்\s+\S+\s+ஏறு", opt):
                scores[i] += 14
            if opt.count(" ") > 12:
                scores[i] -= 3

    if "வகையை" in stem or ("வகை" in stem and "கண்டறி" in stem):
        for i, opt in enumerate(options):
            if "ஆகுபெயர்" in opt and opt in ctx:
                scores[i] += 8
            # example sentence often precedes the question
            for ex in ("வளர்ந்தது", "வெட்டினான்", "வாங்கு"):
                if ex in stem or ex in ctx[-600:]:
                    if "காரிய" in opt:
                        scores[i] += 12
                    if "கருவி" in opt:
                        scores[i] += 6

    if "ஏவல் வினைமுற்று" in stem or "வினைத்தொகை" in stem:
        for i, opt in enumerate(options):
            if "ஏவல் வினைமுற்று" in opt:
                scores[i] += 12
            if "தொகை" in opt:
                scores[i] += 8

    if "பகுதி" in stem and "விகுதி" in stem:
        for i, opt in enumerate(options):
            if opt.endswith("்க") and not opt.endswith("ார்"):
                scores[i] += 18
            if opt.endswith("ார்") or opt.endswith("ந்த"):
                scores[i] -= 6

    if "வேற்றுமை" in stem:
        for i, opt in enumerate(options):
            if "வேற்றுமை" in opt:
                scores[i] += 12

    if "இடைச்சொல்" in stem and BLANK.search(stem):
        for i, opt in enumerate(options):
            if "இடைச்சொல்" in opt:
                scores[i] += 14

    if "பெயர்ச்சொல்" in stem and BLANK.search(stem):
        for i, opt in enumerate(options):
            if "பெயர்ச்சொல்" in opt:
                scores[i] += 14

    return scores


def score_answer(stem, options, context):
    """Score each option using lesson text before the question."""
    scores = [0.0] * 4
    ctx = context[-15000:]

    for i, opt in enumerate(options):
        if len(opt) < 2:
            scores[i] -= 5
        scores[i] += min(ctx.count(opt) * 0.4, 12)

    for q in QUOTE.findall(stem):
        for i, opt in enumerate(options):
            pat = re.escape(q) + r"\s*[-–—]\s*" + re.escape(opt)
            if re.search(pat, ctx):
                scores[i] += 30
            if opt in q or q in opt:
                scores[i] += 4

    for i, opt in enumerate(options):
        if re.search(r"[-–—]\s*" + re.escape(opt) + r"(?:\s|$)", ctx):
            scores[i] += 10
        if re.search(re.escape(opt) + r"\s*[-–—]", ctx):
            scores[i] += 6

    if "பிரித்து" in stem or "சேர்த்து" in stem:
        for i, opt in enumerate(options):
            if "+" in opt:
                compact = opt.replace(" ", "")
                if compact in ctx.replace(" ", ""):
                    scores[i] += 22
                scores[i] += 8

    for kw in ("பெயர்ச்சொல்", "வினைச்சொல்", "இடைச்சொல்", "உரிச்சொல்", "வேற்றுமை"):
        if kw in stem:
            for i, opt in enumerate(options):
                if kw in opt or opt in kw:
                    scores[i] += 15

    if BLANK.search(stem):
        for i, opt in enumerate(options):
            if 2 <= len(opt) <= 24:
                scores[i] += 2

    scores = apply_special_rules(stem, options, scores, ctx)

    best = max(range(4), key=lambda i: scores[i])
    if scores[best] < 1.0:
        return None, scores
    ordered = sorted(scores, reverse=True)
    if len(ordered) > 1 and ordered[0] < ordered[1] + 0.25:
        if ordered[0] < 8:
            return None, scores
    return best, scores


def detect_chapter(line, current):
    """Track TN textbook unit (இயல்) from PDF unit markers or இயல் headers."""
    raw = line if UNIT_MARK.search(line) else clean_line(line)
    m = UNIT_MARK.search(raw)
    if m:
        return int(m.group(1))
    compact = raw.replace(" ", "")
    m = IYAL_MARK.search(compact)
    if m:
        word = m.group(0)
        for tam, num in IYAL_ORD.items():
            if tam in word:
                return num
    return current


def build_chapter_index(lines):
    """Chapter number at each line index (from Unit / இயல் markers in the PDF text)."""
    chapters = [None] * len(lines)
    ch = None
    for i, raw in enumerate(lines):
        ch = detect_chapter(raw, ch)
        chapters[i] = ch
    return chapters


def make_question(qnum, stem, opts, ans, topic, chapter):
    q = {
        "id": f"ext-{qnum:03d}",
        "diff": guess_diff(topic, stem),
        "topic": topic,
        "prompt": stem,
        "options": opts,
        "answer": ans,
    }
    if chapter is not None:
        q["chapter"] = chapter
    return q


def is_grammar_mcq(stem, options):
    if not GRAMMAR_HINT.search(stem) and not any(GRAMMAR_HINT.search(o) for o in options):
        return False
    if not (
        BLANK.search(stem)
        or "பின்வருவனவற்றுள்" in stem
        or re.search(r"(எது|எவை|யாவை|ஆகும்|அழைக்க|என்பது|கண்டறி|தெரிவு|வகை)", stem)
    ):
        return False
    if any(len(o) > 90 for o in options):
        return False
    if any("எழுதுக" in o for o in options):
        return False
    return True


def parse_mcq_blocks(text):
    lines = text.splitlines()
    chapters = build_chapter_index(lines)
    questions = []
    seen = set()
    qnum = 0
    idx = 0

    while idx < len(lines):
        raw = clean_line(lines[idx])
        if "அ)" not in raw:
            idx += 1
            continue

        chapter = chapters[idx]

        # Inline multi-question lines
        inline = split_stem_option_chunks(raw)
        if inline:
            context = "\n".join(lines[max(0, idx - 80):idx])
            for stem, opts in inline:
                if not is_grammar_mcq(stem, opts):
                    continue
                ans, _ = score_answer(stem, opts, context)
                if ans is None:
                    continue
                key = stem[:60]
                if key in seen:
                    continue
                seen.add(key)
                qnum += 1
                topic = guess_topic(stem)
                questions.append(make_question(qnum, stem, opts, ans, topic, chapter))
            idx += 1
            continue

        opts, next_idx = gather_options(lines, idx)
        if len(opts) != 4:
            idx += 1
            continue

        stem = None
        for back in range(1, 6):
            if idx - back < 0:
                break
            prev = clean_line(lines[idx - back])
            if not prev or prev.startswith("சரியான விடை") or prev == "பலவுள் தெரிக.":
                continue
            if "அ)" in prev:
                break
            candidate = parse_stem_chunk(prev) or (
                prev
                if (BLANK.search(prev) or "எது" in prev or "பின்வருவனவற்றுள்" in prev
                    or "கண்டறி" in prev or "தெரிவு" in prev)
                else None
            )
            if candidate:
                stem = candidate
                break

        if not stem or not is_grammar_mcq(stem, opts):
            idx = next_idx
            continue

        context = "\n".join(lines[max(0, idx - 80):idx])
        ans, _ = score_answer(stem, opts, context)
        if ans is None:
            idx = next_idx
            continue

        key = stem[:60]
        if key not in seen:
            seen.add(key)
            qnum += 1
            topic = guess_topic(stem)
            questions.append(make_question(qnum, stem, opts, ans, topic, chapter))

        idx = next_idx

    return questions


def main():
    ap = argparse.ArgumentParser(description="Extract Ilakkanam MCQs from a textbook PDF")
    ap.add_argument("pdf", help="Input PDF path")
    ap.add_argument("out_json", help="Output JSON path (e.g. data/class10_ilakkanam.json)")
    ap.add_argument("--class", dest="cls", required=True, help="Class number (8, 9, 10, …)")
    ap.add_argument("--debug", action="store_true", help="Print sample questions to stdout")
    ap.add_argument("--min-questions", type=int, default=0, help="Fail if fewer than N questions")
    args = ap.parse_args()

    if not os.path.isfile(args.pdf):
        print(f"PDF not found: {args.pdf}", file=sys.stderr)
        sys.exit(1)

    doc = fitz.open(args.pdf)
    text = extract_page_text(doc)
    doc.close()

    questions = parse_mcq_blocks(text)
    easy = sum(1 for q in questions if q["diff"] == "easy")
    hard = len(questions) - easy

    if args.debug:
        for q in questions[:8]:
            print("---")
            ch = f" [இயல் {q['chapter']}]" if q.get("chapter") else ""
            print(q["prompt"] + ch)
            for i, o in enumerate(q["options"]):
                mark = " <<" if i == q["answer"] else ""
                print(f"  {['அ','ஆ','இ','ஈ'][i]}) {o}{mark}")

    payload = {
        "class": str(args.cls),
        "source": os.path.basename(args.pdf),
        "questions": questions,
    }

    out_dir = os.path.dirname(os.path.abspath(args.out_json))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Wrote {len(questions)} questions to {args.out_json}  (easy {easy}, hard {hard})")
    if args.min_questions and len(questions) < args.min_questions:
        print(f"Warning: fewer than {args.min_questions} questions extracted", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
