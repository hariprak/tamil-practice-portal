import sys, fitz
from collections import Counter

path = sys.argv[1]
doc = fitz.open(path)

def is_base(c):
    cp = ord(c)
    return 0x0b85 <= cp <= 0x0bb9 or cp == 0x0b83
def is_comb(c):
    cp = ord(c)
    return 0x0bbe <= cp <= 0x0bcd or cp == 0x0bd7 or cp == 0x0b82

gap_hist = Counter()
examples = {"small": [], "large": []}

for pno in range(doc.page_count):
    rd = doc[pno].get_text("rawdict")
    for block in rd.get("blocks", []):
        if "lines" not in block: continue
        for line in block["lines"]:
            chars = []
            for span in line["spans"]:
                for ch in span["chars"]:
                    chars.append((ch["c"], ch["bbox"][0], ch["bbox"][2]))  # c, x0, x1
            for i in range(1, len(chars)):
                c, x0, x1 = chars[i]
                pc, px0, px1 = chars[i-1]
                if c == pc and is_base(c):
                    gap = round(x0 - px0, 1)   # x-advance between the two identical bases
                    bucket = int(round(x0 - px0))
                    gap_hist[bucket] += 1
                    seg = "".join(cc for cc,_,_ in chars[max(0,i-2):i+3])
                    if (x0 - px0) <= 3 and len(examples["small"]) < 20:
                        examples["small"].append((seg, gap))
                    elif (x0 - px0) > 3 and len(examples["large"]) < 20:
                        examples["large"].append((seg, gap))

print("Gap (px) between adjacent identical BASE letters -> count")
for g in sorted(gap_hist):
    bar = "#" * min(60, gap_hist[g])
    print(f"  {g:4d}px : {gap_hist[g]:5d} {bar}")

print("\n-- small-gap examples (<=3px, likely DUPLICATE artifact) --")
for seg, g in examples["small"]: print(f"   gap={g:5}  {seg}")
print("\n-- large-gap examples (>3px, likely REAL double letter) --")
for seg, g in examples["large"]: print(f"   gap={g:5}  {seg}")
