# Hosting the Tamil Guide portal (free tiers + future ads)

The live site is the **`web/`** folder only — plain HTML/CSS/JS. Any static host works. Below are **free** options that give **HTTPS** (required for most ad networks) and a path to a **custom domain** (strongly recommended before you run display ads seriously).

---

## What ad networks usually need

| Requirement | Notes |
|-------------|--------|
| **HTTPS** | All options below provide it automatically. |
| **Stable URL** | Prefer a **custom domain** (e.g. `tamilguide.example.com`) before applying to **Google AdSense**; `*.github.io` can work but approval is stricter. |
| **Policy pages** | Plan a **Privacy Policy** (and often **Cookie** notice if you use ad/consent cookies). You will add real text before going live with ads. |
| **Original content** | Keep substantial educational content; ad programs review the site. |
| **Where to put ad code** | Later: one shared snippet in `web/index.html`, `web/spelling.html`, and `web/ilakkanam.html` (e.g. before `</body>`), or a small shared `web/js/ads.js` you load from each page — avoid duplicating logic in many files. |

This repo does **not** include ad scripts yet; deploy first, then add your publisher snippet after approval.

---

## Option A — GitHub Pages (free, good with Git)

1. Create a **GitHub** repository and push this project (include the `.github` folder).
2. In the repo: **Settings → Pages → Build and deployment → Source**: choose **GitHub Actions** (not “Deploy from a branch” for this layout).
3. Push to **`main`** (or edit the workflow branch name). The workflow publishes **`web/`** as the site root.
4. Your site URL depends on the repo name:
   - **Project site** (any repo name): `https://<username>.github.io/<repository>/`
   - **User/org site** (repo must be `<username>.github.io`): `https://<username>.github.io/`
5. Relative links in `web/` (`spelling.html`, `css/styles.css`, …) work on both layouts.
6. **Custom domain (optional):** Settings → Pages → Custom domain; add DNS at your registrar per GitHub’s instructions.

---

## Option B — Netlify (free tier, drag-and-drop or Git)

**Git-connected deploy**

1. Sign up at [Netlify](https://www.netlify.com/).
2. New site from Git → pick repo → branch `main`.
3. Build settings: **Build command** leave **empty**. **Publish directory**: `web`  
   (This repo includes `netlify.toml` so Netlify may auto-detect.)

**Drop folder (quick test)**

1. Netlify dashboard → **Sites** → drag the **`web`** folder onto the page.

HTTPS and preview URLs are automatic. Add a custom domain under **Domain settings** when you are ready for ads.

---

## Option C — Cloudflare Pages (free, generous bandwidth)

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → Connect Git.
2. **Build command:** none (leave empty or `exit 0`).
3. **Build output directory:** `web`
4. Connect repo, deploy.

Custom domains and TLS are first-class on Cloudflare.

---

## Option D — Cloudflare R2 + public bucket (advanced)

Possible for static only; Pages is simpler — skip unless you already use R2.

---

## Quick checklist before you apply for ads

- [ ] Site live on **HTTPS** with real content.
- [ ] **Privacy Policy** page linked from footer (draft is fine until you submit).
- [ ] Decide **EU/UK** consent (CMP / cookie banner) if you target those users — many networks require it.
- [ ] **Custom domain** configured (recommended).
- [ ] No `file://` testing for production; test the **deployed** URL.

---

## Local vs production

| Environment | Visitor counter / APIs |
|-------------|-------------------------|
| `file://` | Clipboard and some APIs may be limited. |
| **HTTPS hosted** | Full browser APIs; third-party counters (if any) behave as intended. |

---

## Files added for deployment

| File | Purpose |
|------|--------|
| `.github/workflows/deploy-github-pages.yml` | Publishes **`web/`** to GitHub Pages on push to `main`. |
| `netlify.toml` | Tells Netlify the publish folder is **`web`**. |

If you use **Vercel**, create a project with **Root Directory** = repository root and set **Output Directory** to `web` in project settings (Framework: Other, no build).

---

## Next step for you

1. Run `git init`, commit the project, create a GitHub repo, push.  
2. Enable **GitHub Actions** Pages as above **or** connect the same repo to **Netlify** / **Cloudflare Pages**.  
3. After the first successful deploy, open the live `index.html` and click through to **Tamil Spelling Trainer** to confirm paths and fonts load.

If you tell me which host you picked (GitHub Pages vs Netlify vs Cloudflare), we can tune one detail (e.g. custom `404.html` or base URL) in a follow-up.
