import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
words = {d["w"] for d in data["words"]}
expect = ["தொடக்கம்","போன்று","வேண்டும்","தேர்","தேவை","கொண்டு","பெரிய",
          "பொருள்","போற்றி","தோன்றி","கொள்ள","மேலும்","பெண்","கைகள்",
          "தமிழ்","சென்னை","ஒன்று","மூன்று","வாழ்க்கை","கல்வி"]
print("word                  present?")
for w in expect:
    print(f"{w:20s}  {'YES' if w in words else 'no'}")
# show any remaining fragments starting with combining-looking tails
print("\nTotal words:", len(words))
