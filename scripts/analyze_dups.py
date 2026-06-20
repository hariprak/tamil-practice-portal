import json, re, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
words = [d["w"] for d in data["words"]]

COMB = "\u0bbe-\u0bcd\u0bd7\u0b82"
# doubled identical combining mark
re_comb = re.compile(r'([' + COMB + r'])\1')
# bare doubled identical base letter (no combining between), base = Tamil non-combining
re_base = re.compile(r'([\u0b85-\u0bb9\u0b83])\1')

comb_hits = [w for w in words if re_comb.search(w)]
base_hits = [w for w in words if re_base.search(w)]

print("Total words:", len(words))
print("Words with doubled combining mark (ாா, ்், ...):", len(comb_hits))
print("Words with bare doubled base letter (னன, ...):", len(base_hits))

print("\n-- sample doubled-combining words --")
for w in comb_hits[:20]: print("  ", w, "->", re_comb.sub(r'\1', w))
print("\n-- sample bare-doubled-base words --")
for w in base_hits[:25]: print("  ", w, "->", re_base.sub(r'\1', w))

# overlap with frequency: are any HIGH-freq (likely real) words bare-doubled?
freq = {d["w"]: d["freq"] for d in data["words"]}
hi = sorted(((freq[w], w) for w in base_hits), reverse=True)[:15]
print("\n-- highest-frequency bare-doubled words (check if any are legit) --")
for f, w in hi: print(f"  {f:4d}  {w}")
