import sys, fitz, unicodedata
from collections import Counter

path = sys.argv[1]
doc = fitz.open(path)
POS_TOL = 1.0

def cname(c):
    try:
        return unicodedata.name(c)
    except ValueError:
        return f"U+{ord(c):04X}"

# Look at raw glyph stream around U+FFFD with positions, on several pages
ctx = Counter()
examples = []
for pno in range(min(doc.page_count, 40)):
    rd = doc[pno].get_text("rawdict")
    for block in rd.get("blocks", []):
        if "lines" not in block: continue
        for line in block["lines"]:
            chars = []
            for span in line["spans"]:
                for ch in span["chars"]:
                    chars.append((ch["c"], round(ch["bbox"][0],1), round(ch["bbox"][1],1)))
            for i, (c, x, y) in enumerate(chars):
                if c == '\ufffd':
                    left = chars[i-1][0] if i > 0 else '?'
                    right = chars[i+1][0] if i+1 < len(chars) else '?'
                    ctx[(cname(left), cname(right))] += 1
                    if len(examples) < 15:
                        seg = "".join(cc for cc,_,_ in chars[max(0,i-2):i+3])
                        examples.append((pno+1, repr(seg),
                                         f"left={left!r}({cname(left)}) FFFD right={right!r}({cname(right)})"))

print("=== Most common (left, right) neighbors of U+FFFD ===")
for (l, r), n in ctx.most_common(15):
    print(f"{n:5d}  left={l:30s} right={r}")

print("\n=== Examples ===")
for pno, seg, info in examples:
    print(f"p{pno}: {seg}  | {info}")
