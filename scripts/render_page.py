import sys, fitz
path = sys.argv[1]
pno = int(sys.argv[2]) if len(sys.argv) > 2 else 3
out = sys.argv[3] if len(sys.argv) > 3 else "page.png"
doc = fitz.open(path)
page = doc[pno-1]
pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))  # 2x zoom
pix.save(out)
print("Saved", out, pix.width, "x", pix.height)
# also print the raw extracted text of this page for comparison
print("\n--- extracted text (first 600 chars) ---")
print(page.get_text()[:600])
