# தமிழ் எழுத்துப் பயிற்சி — Tamil Spelling Trainer

A calm, glassy web app that helps a student master the **commonly-confused Tamil letters**:

- **“la” sounds** — ழ (*zha*) · ள (*La*) · ல (*la*)
- **“ra” sounds** — ற (*Ra*) · ர (*ra*)
- **“na” sounds** — ந (*na*) · ண (*Na*) · ன (*na*)

The app speaks a word, shows it as a fill-in-the-blank, and the student picks the correct
letter for each blank from a dropdown. Words are extracted from the official **Tamil Nadu
State Board** textbooks.

---

## How to run it

It is a **static web app** — no server or internet needed.

1. Open the `web` folder.
2. Double-click **`index.html`** — the **portal home** with two choices.
3. Choose **Tamil Spelling Trainer** (`spelling.html`) or **Ilakkanam Trainer** (`ilakkanam.html`).

That's it. Progress, points and badges are saved in the browser on that device.

### Host it online (free)

See **[HOSTING.md](HOSTING.md)** for **GitHub Pages**, **Netlify**, and **Cloudflare Pages** — including notes for **HTTPS**, **custom domains**, and **future display ads** (policy pages, where to place ad code).

> Best experienced in **Chrome** or **Edge** (for the Tamil audio / text-to-speech).

### Tamil audio (optional but recommended)
The app uses your system's Tamil voice. If audio sounds wrong or silent:
- **Windows:** Settings → Time & Language → Speech → *Add voices* → install **Tamil**.
- Then fully close and reopen the browser.

The app still works fully without a Tamil voice (you just lose pronunciation audio; the
English pronunciation hint still works).

---

## Features

- 🔊 Tamil audio + English pronunciation hint (hidden until you ask, for a real challenge)
- 🎯 Two difficulty levels — **Easy** (2–4 letter words, 1 blank) · **Hard** (5+ letters, all tricky blanks)
- ⭐ Points, 🔥 daily streak, 🏅 badges (incl. per-group "ழ/ள/ல Master" badges)
- 📈 Progress dashboard with accuracy per confusable-letter group
- 🌙 Light / dark theme, responsive (laptop-first, works on phone/tablet)

### Portal home (`index.html`)

- **Share** — floating button at the bottom of the home page uses the Web Share API or copies the link.

---

## Adding more textbooks (other classes)

You can feed in more PDFs (Class 6–12) and the app will grow automatically.

1. Put the PDF in `data/pdfs/` (any filename). PDFs are **local only** (gitignored); the repo ships extracted JSON/JS.
2. Extract its words (replace `N` with the class number):

   ```powershell
   py scripts\extract_words.py data\pdfs\<file>.pdf data\classN_words.json --class N
   ```

3. Rebuild the app's data file (merges every `data/class*_words.json`):

   ```powershell
   py scripts\build_wordsjs.py
   ```

4. Reload **`spelling.html`**. Rebuilt data is in **`web/data/words.js`** — the spelling app **merges all classes** (8 + 9 + 10) into one practice pool automatically.

**Per-class word counts (2025 TN textbooks):** Class 8 ≈ 13,550 · Class 9 ≈ 15,981 · Class 10 ≈ 16,643 (frequencies are summed when the same word appears in multiple books).

---

## Ilakkanam trainer (grammar MCQs)

Open **`ilakkanam.html`** from the portal home. Pick **Class**, **Easy/Hard**, and **5/10/15** questions, then answer four-option grammar MCQs.

### Data format (`data/classN_ilakkanam.json`)

```json
{
  "class": "10",
  "source": "class10.pdf",
  "questions": [
    {
      "id": "10-e-001",
      "diff": "easy",
      "topic": "பெயர்ச்சொல்",
      "prompt": "பின்வருவனவற்றுள் பெயர்ச்சொல் எது?",
      "options": ["ஓடினான்", "மரம்", "அழகாக", "மிகவும்"],
      "answer": 1
    }
  ]
}
```

- `answer` is the **0-based index** into `options` (four choices).
- `chapter` (optional) — textbook **இயல்** (unit) number; shown in the app as `(இயல் N)` after the question. Auto-filled when extracting from PDFs.
- `diff`: `"easy"` or `"hard"` — filtered at session start.
- Class 8/9 files may be empty until you add textbook PDFs.

### Build Ilakkanam data for the app

```powershell
py scripts\build_ilakkanamjs.py
```

This writes **`web/data/ilakkanam.js`** (`window.TAMIL_ILAKKANAM` + `window.TAMIL_ILAKKANAM_META`).

### Adding Class 8–10 grammar from PDFs

1. Put the PDF in `data/pdfs/` (local only; gitignored).
2. Extract MCQs (heuristic — **review `answer` fields** before publishing):

   ```powershell
   py scripts\extract_ilakkanam_mcq.py data\pdfs\class8.pdf data\class8_ilakkanam.json --class 8
   py scripts\extract_ilakkanam_mcq.py data\pdfs\class9.pdf data\class9_ilakkanam.json --class 9
   py scripts\extract_ilakkanam_mcq.py data\pdfs\class10.pdf data\class10_ilakkanam.json --class 10
   ```

3. Rebuild: `py scripts\build_ilakkanamjs.py`
4. Reload **`ilakkanam.html`**.

v1 ships with **sample Class 10** questions plus **PDF-extracted** grammar MCQs for Class 8–9 where the textbook format allows reliable parsing.

**Extracted counts (2025 TN textbooks):** Class 8 ≈ 50 MCQs · Class 9 ≈ 3 MCQs · Class 10 = 20 curated seed MCQs (Class 10 PDF auto-extraction is limited; expand `data/class10_ilakkanam.json` manually or improve the extractor).

> **Note:** Textbooks do not include answer keys in the student PDF. The extractor infers answers from nearby lesson text; review `data/class*_ilakkanam.json` before publishing if accuracy is critical.

### Requirements for the scripts
- Python 3 with **PyMuPDF**:
  ```powershell
  py -m pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org pymupdf
  ```

---

## Project layout

```
tamil-spelling-portal/
├─ HOSTING.md               ← deploy to GitHub Pages / Netlify / Cloudflare + ads notes
├─ netlify.toml             ← Netlify publish dir = web/
├─ .github/workflows/
│  └─ deploy-github-pages.yml
├─ web/                     ← static site root
│  ├─ index.html             ← portal landing (trainers + share)
│  ├─ spelling.html          ← Tamil Spelling Trainer (main app)
│  ├─ ilakkanam.html         ← Ilakkanam grammar MCQ trainer
│  ├─ css/styles.css
│  ├─ js/
│  │  ├─ tamil.js           ← clustering, confusable groups, transliteration
│  │  ├─ app.js             ← spelling game logic, scoring, views
│  │  ├─ ilakkanam.js        ← grammar MCQ session logic
│  │  ├─ landing-extras.js  ← home page floating share (share or copy)
│  └─ data/
│     ├─ words.js            ← generated spelling data
│     └─ ilakkanam.js        ← generated grammar MCQ data
├─ data/
│  ├─ pdfs/                 ← local textbook PDFs (gitignored; see extract scripts)
│  ├─ class10_words.json    ← extracted words per class (canonical)
│  ├─ class8_ilakkanam.json ← grammar MCQs per class (canonical)
│  ├─ class9_ilakkanam.json
│  └─ class10_ilakkanam.json
└─ scripts/
   ├─ extract_words.py      ← PDF → clean Tamil words (fixes font artifacts)
   ├─ build_wordsjs.py      ← merge class JSONs → web/data/words.js
   ├─ extract_ilakkanam_mcq.py ← PDF → grammar MCQs (heuristic; review answers)
   ├─ build_ilakkanamjs.py  ← merge class JSONs → web/data/ilakkanam.js
   └─ *.py / *.js           ← analysis & test helpers
```

---

## Notes on text quality

These Tamil textbook PDFs have a known font quirk that **doubles** some glyphs and breaks
the `ொ/ோ` vowel signs. The extractor repairs:
- doubled vowel signs / viramas (e.g. `காாலம்` → `காலம்`) — fully fixed,
- the broken `ொ/ோ` vowels (e.g. `தொ�ொடக்கம்` → `தொடக்கம்`) — fully fixed,
- over-drawn duplicate letters at the same position — fixed.

A small number of rarer words may still carry a doubled consonant that is impossible to
auto-correct reliably (it is indistinguishable from genuine words like `மன்னன்`). The app
favours common, high-frequency words and includes a **Skip** button for any odd one.
