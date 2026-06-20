"""
Extract clean Tamil words from a Tamil-textbook PDF.

Handles the "doubled glyph" artifact in these PDFs: certain glyphs are drawn
twice at the exact same (x,y) coordinate. We collapse a character only when it
is identical to the previous character AND at (almost) the same position, which
preserves genuine double letters (eg. ட்ட, ம்ம) that sit at different positions.

Usage:
    py extract_words.py <pdf_path> <out_json> [--class N] [--debug]
"""
import sys, json, re, unicodedata
import fitz

TAMIL_RANGE = ('\u0b80', '\u0bff')
BASE_DUP_TOL = 3.5  # px: identical base letters closer than this are an overdraw artifact
Y_TOL = 2.0


def is_combining(c):
    cp = ord(c)
    return 0x0bbe <= cp <= 0x0bcd or cp == 0x0bd7 or cp == 0x0b82


def dedup_page_text(page):
    """Rebuild page text from rawdict, dropping duplicate-glyph render artifacts.

    Two cases of the same glyph drawn twice:
      * a repeated COMBINING mark (matra/virama) - never valid in Tamil -> always drop
      * a repeated BASE letter drawn almost on top of itself (overdraw) -> drop only
        when the x-advance is tiny (genuine adjacent doubles sit a full glyph apart).
    """
    rd = page.get_text("rawdict")
    out = []
    for block in rd.get("blocks", []):
        if "lines" not in block:
            continue
        for line in block["lines"]:
            line_chars = []
            prev_c = None
            prev_x = None
            prev_y = None
            for span in line["spans"]:
                for ch in span["chars"]:
                    c = ch["c"]
                    x0, y0, x1, y1 = ch["bbox"]
                    if (prev_c == c and prev_x is not None
                            and abs(y0 - prev_y) < Y_TOL):
                        if is_combining(c):
                            continue  # repeated mark = artifact
                        if abs(x0 - prev_x) <= BASE_DUP_TOL:
                            continue  # overdrawn base letter = artifact
                    line_chars.append(c)
                    prev_c, prev_x, prev_y = c, x0, y0
            out.append("".join(line_chars))
        out.append("\n")
    return "".join(out)


def normalize_tamil(text):
    """Repair the vowel-sign rendering artifacts in this PDF family.

    The PDF emits the two-part vowels O/OO/AU as `<sign> \ufffd <sign>` and the
    left vowels E/EE/AI with a spurious \ufffd inserted next to the consonant.
    """
    # collapse two-part vowels: sign + (replacement) + same sign  ->  one sign
    for s in ('\u0bca', '\u0bcb', '\u0bcc'):          # O, OO, AU
        text = text.replace(s + '\ufffd' + s, s)
        text = text.replace(s + s, s)                  # safety: bare doubling
    # spurious replacement char sitting next to left vowels -> drop it
    for s in ('\u0bc6', '\u0bc7', '\u0bc8'):          # E, EE, AI
        text = text.replace(s + '\ufffd', s)
        text = text.replace('\ufffd' + s, s)
    # any remaining stray replacement chars are rendering noise next to vowels
    text = text.replace('\ufffd', '')
    # safety net: collapse any still-repeated combining mark (matra/virama)
    text = re.sub(r'([\u0bbe-\u0bcd\u0bd7\u0b82])\1+', r'\1', text)
    return text


def is_tamil_char(ch):
    return TAMIL_RANGE[0] <= ch <= TAMIL_RANGE[1]


# A Tamil "word": runs of Tamil letters/signs (allow internal nothing else)
WORD_RE = re.compile(r'[\u0b80-\u0bff]+')


def extract_words(pdf_path, debug=False):
    doc = fitz.open(pdf_path)
    raw_text_parts = []
    for i in range(doc.page_count):
        raw_text_parts.append(dedup_page_text(doc[i]))
    full = "\n".join(raw_text_parts)
    full = normalize_tamil(full)

    # token frequency
    freq = {}
    bad_glyph = 0
    for m in WORD_RE.finditer(full):
        w = m.group(0)
        freq[w] = freq.get(w, 0) + 1
    fffd = full.count('\ufffd')
    return full, freq, fffd


def clean_words(freq):
    """Filter to plausible spelling-practice words."""
    cleaned = {}
    for w, n in freq.items():
        # must start with a consonant or vowel (a base letter), not a stray sign
        if not w:
            continue
        first = w[0]
        # drop tokens that begin with a combining sign (matra/virama/anusvara)
        if '\u0bbe' <= first <= '\u0bcd' or first in ('\u0bd7',):
            continue
        # length in "letters": count base letters (exclude combining marks)
        base_letters = sum(1 for c in w if not ('\u0bbe' <= c <= '\u0bcd' or c == '\u0bd7'))
        if base_letters < 2:      # skip single-letter tokens
            continue
        if len(w) > 25:           # skip absurdly long runs (likely join errors)
            continue
        cleaned[w] = n
    return cleaned


def main():
    if len(sys.argv) < 3:
        print("usage: py extract_words.py <pdf> <out_json> [--class N] [--debug]")
        sys.exit(1)
    pdf_path = sys.argv[1]
    out_json = sys.argv[2]
    cls = None
    if "--class" in sys.argv:
        cls = sys.argv[sys.argv.index("--class") + 1]
    debug = "--debug" in sys.argv

    full, freq, fffd = extract_words(pdf_path, debug)
    cleaned = clean_words(freq)

    print(f"Pages processed. Total Tamil chars: {sum(len(c) for c in full)}")
    print(f"Unique raw tokens: {len(freq)}")
    print(f"Unique cleaned words: {len(cleaned)}")
    print(f"Unmappable glyphs (\\ufffd): {fffd}")

    # sort by frequency desc then word
    items = sorted(cleaned.items(), key=lambda kv: (-kv[1], kv[0]))

    print("\n--- TOP 40 most frequent words ---")
    for w, n in items[:40]:
        print(f"{n:5d}  {w}")

    if debug:
        # save full text for inspection
        with open(out_json + ".fulltext.txt", "w", encoding="utf-8") as f:
            f.write(full)

    data = {
        "class": cls,
        "source": pdf_path.replace("\\", "/").split("/")[-1],
        "word_count": len(cleaned),
        "words": [{"w": w, "freq": n} for w, n in items],
    }
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"\nSaved -> {out_json}")


if __name__ == "__main__":
    main()
