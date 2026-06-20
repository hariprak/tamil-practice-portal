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
3. Choose **Tamil Spelling Trainer** to open **`spelling.html`** (the full spelling app).

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
- 🎯 Three difficulty levels (Easy blanks 1 tricky letter → Hard blanks them all)
- ⭐ Points, 🔥 daily streak, 🏅 badges (incl. per-group "ழ/ள/ல Master" badges)
- 📈 Progress dashboard with accuracy per confusable-letter group
- 🌙 Light / dark theme, responsive (laptop-first, works on phone/tablet)

### Portal home (`index.html`)

- **Share link** — uses the Web Share API on supported devices, with **Copy link** as a fallback.

---

## Adding more textbooks (other classes)

You can feed in more PDFs (Class 6–12) and the app will grow automatically.

1. Put the PDF in `data/pdfs/` (any filename).
2. Extract its words (replace `N` with the class number):

   ```powershell
   py scripts\extract_words.py data\pdfs\<file>.pdf data\classN_words.json --class N
   ```

3. Rebuild the app's data file (merges every `data/class*_words.json`):

   ```powershell
   py scripts\build_wordsjs.py
   ```

4. Reload **`spelling.html`** (or refresh if it is already open). Rebuilt data is loaded from **`web/data/words.js`**; the app uses the **first** class key in `TAMIL_META.classes` (see that file’s header). If you add more classes to the build, list order in metadata determines which set is used unless you add a class picker back.

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
│  ├─ ilakkanam.html         ← Ilakkanam tester placeholder
│  ├─ css/styles.css
│  ├─ js/
│  │  ├─ tamil.js           ← clustering, confusable groups, transliteration
│  │  ├─ app.js             ← game logic, scoring, views
│  │  ├─ landing-extras.js  ← share link + copy to clipboard
│  │  └─ visitor-counter.js
│  └─ data/words.js         ← generated word data (loaded by the app)
├─ data/
│  ├─ pdfs/                 ← source textbook PDFs
│  └─ class10_words.json    ← extracted words per class (canonical)
└─ scripts/
   ├─ extract_words.py      ← PDF → clean Tamil words (fixes font artifacts)
   ├─ build_wordsjs.py      ← merge class JSONs → web/data/words.js
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
