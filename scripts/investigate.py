import sys, fitz, unicodedata

path = sys.argv[1] if len(sys.argv) > 1 else "data/pdfs/class10.pdf"
doc = fitz.open(path)

# Grab a known-garbled word region from page 1
t = doc[0].get_text()
word = t.split()[1] if len(t.split()) > 1 else t[:20]
print("RAW WORD repr:", repr(t.split()[0]))

def dump(s, label):
    print(f"\n--- {label} ---")
    print("string:", s)
    print("codepoints:", " ".join(f"U+{ord(c):04X}({unicodedata.name(c,'?')})" for c in s))

dump(t.split()[0], "first token (text mode)")

# Try different extraction methods on page 1
print("\n\n===== METHOD COMPARISON on page 3 (preface) =====")
methods = {
    "text": lambda p: p.get_text("text"),
    "text+ligatures_off": lambda p: p.get_text("text", flags=0),
}
for name, fn in methods.items():
    txt = fn(doc[2])
    print(f"\n--- {name} ---")
    print(txt[:200])

# Dump raw chars with positions for page 1 first line to see if glyphs overlap (fake-bold)
print("\n\n===== RAW CHAR POSITIONS (page 1, first 25 chars) =====")
rd = doc[0].get_text("rawdict")
count = 0
for block in rd["blocks"]:
    if "lines" not in block: continue
    for line in block["lines"]:
        for span in line["spans"]:
            for ch in span["chars"]:
                c = ch["c"]
                x = round(ch["bbox"][0],1)
                print(f"'{c}' U+{ord(c):04X} x={x}")
                count += 1
                if count >= 25: break
            if count >= 25: break
        if count >= 25: break
    if count >= 25: break
