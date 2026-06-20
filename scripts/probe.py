import sys, fitz

path = sys.argv[1] if len(sys.argv) > 1 else "data/pdfs/class10.pdf"
doc = fitz.open(path)
print("Pages:", doc.page_count)

def tamil_count(s):
    return sum(1 for ch in s if '\u0b80' <= ch <= '\u0bff')

total_chars = 0
total_tamil = 0
sample_printed = 0
for i in range(min(doc.page_count, 30)):
    t = doc[i].get_text()
    total_chars += len(t)
    total_tamil += tamil_count(t)
    if sample_printed < 3 and tamil_count(t) > 50:
        print(f"\n----- PAGE {i+1} sample (first 400 chars) -----")
        print(t[:400])
        sample_printed += 1

print("\n===== SUMMARY (first 30 pages) =====")
print("Total chars:", total_chars)
print("Tamil chars:", total_tamil)
print("Has extractable Tamil text:", "YES" if total_tamil > 200 else "NO (likely scanned images -> needs OCR)")
