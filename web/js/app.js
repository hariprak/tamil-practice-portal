/* ================================================================
   Tamil Spelling Trainer — confusable-letters edition
   Runs fully client-side; safe to open via file:// (no server).
================================================================ */
(function () {
  "use strict";
  const T = window.Tamil;
  const WORDS = window.TAMIL_WORDS || {};
  const META = window.TAMIL_META || { classes: [] };

  /* ---------- state ---------- */
  const SKEY = "tamilSpell.v2";
  const defaults = {
    points: 0, bestStreak: 0, totalWords: 0, totalCorrect: 0,
    badges: [], theme: "light", dayStreak: 0, lastDate: null,
    todayDate: null, todayCount: 0,
    groups: { la: { t: 0, c: 0 }, ra: { t: 0, c: 0 }, na: { t: 0, c: 0 } },
    cls: null, diff: "easy", count: 10,
  };
  let state = load();
  function load() {
    try {
      const o = Object.assign({}, defaults, JSON.parse(localStorage.getItem(SKEY)) || {});
      delete o.palette;
      return o;
    } catch (e) { return Object.assign({}, defaults); }
  }
  function save() { localStorage.setItem(SKEY, JSON.stringify(state)); }

  const $ = (id) => document.getElementById(id);
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ================================================================ Speech */
  let tamilVoice = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) { $("voiceStatus").textContent = "No speech support in this browser (try Chrome/Edge)."; return; }
    const voices = speechSynthesis.getVoices();
    tamilVoice = voices.find(v => /^ta(-|_|$)/i.test(v.lang)) || voices.find(v => /tamil/i.test(v.name)) || null;
    const s = $("voiceStatus");
    if (!voices.length) { s.textContent = "Loading voices…"; return; }
    s.innerHTML = tamilVoice
      ? "🔊 Ready: <b>" + tamilVoice.name + "</b> (" + tamilVoice.lang + ")"
      : "⚠️ No Tamil voice installed. Audio may be inaccurate.<br>Windows: Settings → Time &amp; Language → Speech → Add a Tamil voice.";
  }
  if ("speechSynthesis" in window) { speechSynthesis.onvoiceschanged = pickVoice; setTimeout(pickVoice, 200); }
  function speak(word, slow) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "ta-IN"; if (tamilVoice) u.voice = tamilVoice;
    u.rate = slow ? 0.6 : 0.85;
    speechSynthesis.speak(u);
  }
  /* ---------- visual feedback effects (file:// safe, no libs) ---------- */
  function flashRed() {
    const r = $("fxRed"); if (!r) return;
    r.classList.remove("show"); void r.offsetWidth; // restart animation
    r.classList.add("show");
    r.addEventListener("animationend", () => r.classList.remove("show"), { once: true });
  }
  function celebrate() {
    const layer = $("fxLayer"); if (!layer) return;
    const n = 6 + Math.floor(Math.random() * 5); // 6-10
    for (let i = 0; i < n; i++) {
      const e = el("div", "fx-emoji", "👍");
      e.style.left = (2 + Math.random() * 92) + "%";
      e.style.fontSize = (26 + Math.random() * 20) + "px";
      e.style.animationDuration = (1.6 + Math.random() * 1.3) + "s";
      e.style.animationDelay = (Math.random() * 0.4) + "s";
      e.style.setProperty("--r", (Math.random() * 44 - 22) + "deg");
      e.style.setProperty("--dx", (Math.random() * 60 - 30) + "px");
      e.addEventListener("animationend", () => e.remove(), { once: true });
      layer.appendChild(e);
    }
  }

  let actx = null;
  function chime(good) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      (good ? [660, 880] : [330, 247]).forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.frequency.value = f; o.connect(g); g.connect(actx.destination);
        const t = actx.currentTime + i * 0.12;
        g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.start(t); o.stop(t + 0.2);
      });
    } catch (e) {}
  }

  /* ================================================================ Pool */
  function pool(diff) {
    const rows = WORDS[state.cls] || [];
    const minFreq = diff === "easy" ? 4 : diff === "medium" ? 2 : 1;
    const out = [];
    for (const [w, f] of rows) {
      if (f < minFreq) continue;
      const cl = T.clusters(w);
      if (cl.length < 2 || cl.length > 9) continue;
      if (!cl.some(c => T.groupOfCluster(c))) continue;
      out.push([w, f]);
    }
    return out;
  }
  function sample(p, k) {
    const items = p.map(([w, f]) => ({ w, weight: Math.sqrt(f) + 0.5 }));
    const chosen = [], seen = new Set(); let guard = 0;
    while (chosen.length < k && items.length && guard < k * 80) {
      guard++; let tot = 0; for (const it of items) tot += it.weight;
      let r = Math.random() * tot, idx = 0;
      for (let i = 0; i < items.length; i++) { r -= items[i].weight; if (r <= 0) { idx = i; break; } }
      const pick = items[idx].w; items.splice(idx, 1);
      if (!seen.has(pick)) { seen.add(pick); chosen.push(pick); }
    }
    return chosen;
  }

  /* ================================================================ Session */
  let S = null;
  function startSession() {
    if (!state.cls) state.cls = (META.classes[0] || Object.keys(WORDS)[0]);
    const p = pool(state.diff);
    if (p.length < 3) { alert("Not enough words yet for this setting."); return; }
    const words = sample(p, Math.min(state.count, p.length));
    S = { words, idx: 0, correct: 0, points: 0, streak: 0, best: 0, review: [], revealed: false };
    bumpDayStreak();
    showView("play");
    loadQ();
  }

  function blanksFor(diff, n) { return diff === "easy" ? 1 : diff === "medium" ? Math.min(2, n) : n; }

  function buildQ(word) {
    const cl = T.clusters(word);
    const confIdx = cl.map((c, i) => T.groupOfCluster(c) ? i : -1).filter(i => i >= 0);
    const nb = blanksFor(state.diff, confIdx.length);
    const blanks = shuffle(confIdx).slice(0, nb).sort((a, b) => a - b);
    return { word, cl, blanks: new Set(blanks), fill: {} };
  }

  function loadQ() {
    S.cur = buildQ(S.words[S.idx]);
    S.revealed = false;
    renderQ();
    progress();
    $("feedback").textContent = ""; $("feedback").className = "feedback";
    $("checkBtn").textContent = "சரிபார் · Check";
    $("pron").hidden = true; $("pron").textContent = "";
    $("hintBtn").style.visibility = "visible";
    $("speakBtn").classList.add("pulse");
    setTimeout(() => speak(S.cur.word), 350);
  }

  function updateRefBoxes() {
    // highlight only the group(s) actually being TESTED (the blanked clusters)
    const active = new Set();
    if (S && S.cur) S.cur.blanks.forEach(pos => { const g = T.groupOfCluster(S.cur.cl[pos]); if (g) active.add(g); });
    document.querySelectorAll(".ref-box").forEach(box => {
      const id = box.dataset.group, g = state.groups[id];
      const accEl = box.querySelector(".ref-acc");
      if (g && g.t) {
        const pct = Math.round(g.c / g.t * 100);
        accEl.textContent = pct + "%";
        accEl.className = "ref-acc " + (pct >= 80 ? "good" : pct < 50 ? "bad" : "");
      } else { accEl.textContent = "—"; accEl.className = "ref-acc"; }
      box.classList.toggle("active", active.has(id));
    });
  }

  function renderQ() {
    const wl = $("word"); wl.innerHTML = ""; closeDropdown();
    updateRefBoxes();
    S.cur.slot = {};
    S.cur.cl.forEach((c, i) => {
      if (S.cur.blanks.has(i)) {
        const b = el("div", "blank empty"); b.dataset.pos = i;
        b.addEventListener("click", (e) => { e.stopPropagation(); openDropdown(b, i); });
        wl.appendChild(b); S.cur.slot[i] = b;
      } else {
        wl.appendChild(el("span", "gram", c));
      }
    });
  }

  /* ---------- dropdown ---------- */
  let openSlot = null;
  function openDropdown(slot, pos) {
    if (S.revealed) return;
    if (openSlot === slot) { closeDropdown(); return; }
    closeDropdown();
    const opts = T.optionsFor(S.cur.cl[pos]);
    const dd = el("div", "dropdown");
    shuffle(opts).forEach(o => {
      const b = el("button", "opt", o);
      b.addEventListener("click", (e) => { e.stopPropagation(); choose(pos, o); });
      dd.appendChild(b);
    });
    slot.appendChild(dd); slot.classList.add("open"); openSlot = slot;
  }
  function closeDropdown() {
    if (openSlot) { const d = openSlot.querySelector(".dropdown"); if (d) d.remove(); openSlot.classList.remove("open"); openSlot = null; }
  }
  function choose(pos, opt) {
    const slot = S.cur.slot[pos];
    slot.textContent = opt; slot.classList.remove("empty"); slot.classList.add("filled");
    S.cur.fill[pos] = opt; closeDropdown();
  }
  document.addEventListener("click", closeDropdown);

  /* ---------- check ---------- */
  function check() {
    if (S.revealed) { next(); return; }
    const q = S.cur, positions = [...q.blanks];
    if (!positions.every(p => q.fill[p])) { flash("எல்லா இடங்களையும் நிரப்பு · Fill every blank", false); return; }
    let ok = true;
    positions.forEach(p => {
      const slot = q.slot[p], gid = T.groupOfCluster(q.cl[p]);
      state.groups[gid].t++;
      if (q.fill[p] === q.cl[p]) { slot.classList.add("correct"); state.groups[gid].c++; }
      else { slot.classList.add("wrong"); ok = false; }
    });
    S.revealed = true; closeDropdown();
    $("speakBtn").classList.remove("pulse");
    state.totalWords++; bumpToday();
    if (ok) {
      const gain = 10 + Math.min(S.streak, 5);
      S.points += gain; S.correct++; S.streak++; S.best = Math.max(S.best, S.streak);
      state.points += gain; state.totalCorrect++; state.bestStreak = Math.max(state.bestStreak, S.best);
      flash("சரி! · Correct  +" + gain + " ★", true); chime(true); celebrate();
    } else {
      positions.forEach(p => { if (!q.slot[p].classList.contains("correct")) q.slot[p].textContent = q.cl[p]; });
      S.streak = 0;
      flash('சரியான சொல்: <span class="ans">' + q.word + "</span>", false); chime(false); flashRed();
    }
    if (!$("pron").textContent) $("pron").textContent = T.transliterate(q.word);
    $("pron").hidden = false; $("hintBtn").style.visibility = "hidden";
    S.review.push({ word: q.word, ok, roman: T.transliterate(q.word) });
    $("roundPoints").textContent = S.points;
    syncHeader(); save();
    $("checkBtn").textContent = (S.idx + 1 >= S.words.length) ? "முடி · Finish ▶" : "அடுத்து · Next ▶";
  }
  function next() { S.idx++; if (S.idx >= S.words.length) return finish(); loadQ(); }
  function skip() {
    if (S.revealed) { next(); return; }
    S.review.push({ word: S.cur.word, ok: false, roman: T.transliterate(S.cur.word), skipped: true });
    S.streak = 0; next();
  }

  function flash(html, ok) { const f = $("feedback"); f.innerHTML = html; f.className = "feedback " + (ok ? "ok" : "bad"); }
  function progress() {
    const i = S.idx + 1, n = S.words.length;
    $("progressText").textContent = i + " / " + n;
    $("progressFill").style.width = (S.idx / n * 100) + "%";
    $("roundPoints").textContent = S.points;
  }

  function finish() {
    $("speakBtn").classList.remove("pulse");
    const earned = checkBadges({ perfect: S.correct === S.words.length });
    const pct = S.correct / S.words.length;
    $("resultEmoji").textContent = pct === 1 ? "🏆" : pct >= .7 ? "🎉" : pct >= .4 ? "💪" : "📚";
    $("resultTitle").textContent = pct === 1 ? "சிறப்பு! · Perfect!" : pct >= .7 ? "அருமை! · Great!" : pct >= .4 ? "நன்று! · Keep going!" : "தொடர்ந்து பயிற்சி செய் · Practise more!";
    $("rScore").textContent = S.points;
    $("rCorrect").textContent = S.correct + "/" + S.words.length;
    $("rStreak").textContent = S.best;
    const nb = $("newBadges"); nb.innerHTML = "";
    earned.forEach(b => { const n = el("div", "badge"); n.appendChild(el("span", "b-ico", b.ico)); n.appendChild(el("span", null, "New: " + b.name)); nb.appendChild(n); });
    const rev = $("reviewList"); rev.innerHTML = "";
    S.review.forEach(r => {
      const it = el("div", "review-item " + (r.ok ? "ok" : "bad"));
      const left = el("div"); left.appendChild(el("span", null, r.word));
      left.appendChild(el("span", "r-detail", "  " + r.roman + (r.skipped ? " · skipped" : "")));
      it.appendChild(left); it.appendChild(el("span", "r-mark", r.ok ? "✅" : "❌"));
      it.addEventListener("click", () => speak(r.word));
      rev.appendChild(it);
    });
    save(); syncHeader();
    showView("results");
  }

  /* ================================================================ Day streak & goal */
  const today = () => new Date().toISOString().slice(0, 10);
  function bumpDayStreak() {
    const t = today();
    if (state.lastDate !== t) {
      const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      state.dayStreak = (state.lastDate === y) ? state.dayStreak + 1 : 1;
      state.lastDate = t;
    }
    save(); syncHeader();
  }
  function bumpToday() {
    const t = today();
    if (state.todayDate !== t) { state.todayDate = t; state.todayCount = 0; }
    state.todayCount++;
  }

  /* ================================================================ Badges */
  const BADGES = [
    { id: "first", ico: "🌱", name: "First Word", t: s => s.totalWords >= 1 },
    { id: "ten", ico: "🔟", name: "10 Correct", t: s => s.totalCorrect >= 10 },
    { id: "fire", ico: "🔥", name: "Streak of 5", t: s => s.bestStreak >= 5 },
    { id: "fifty", ico: "⭐", name: "50 Correct", t: s => s.totalCorrect >= 50 },
    { id: "century", ico: "💯", name: "100 Words", t: s => s.totalWords >= 100 },
    { id: "la", ico: "🅰️", name: "ழ/ள/ல Master", t: s => s.groups.la.t >= 20 && s.groups.la.c / s.groups.la.t >= 0.9 },
    { id: "ra", ico: "🆁", name: "ற/ர Master", t: s => s.groups.ra.t >= 20 && s.groups.ra.c / s.groups.ra.t >= 0.9 },
    { id: "na", ico: "🅽", name: "ந/ண/ன Master", t: s => s.groups.na.t >= 20 && s.groups.na.c / s.groups.na.t >= 0.9 },
    { id: "flawless", ico: "🏆", name: "Flawless Round", t: (s, c) => c && c.perfect },
    { id: "p500", ico: "👑", name: "500 Points", t: s => s.points >= 500 },
  ];
  function checkBadges(ctx) {
    const newly = [];
    for (const b of BADGES) if (!state.badges.includes(b.id) && b.t(state, ctx)) { state.badges.push(b.id); newly.push(b); }
    if (newly.length) save();
    return newly;
  }
  function renderBadges(container, limit) {
    const row = $(container); row.innerHTML = "";
    let list = BADGES;
    if (limit) list = BADGES.slice().sort((a, b) => (state.badges.includes(b.id) ? 1 : 0) - (state.badges.includes(a.id) ? 1 : 0)).slice(0, limit);
    list.forEach(b => {
      const got = state.badges.includes(b.id);
      const n = el("div", "badge" + (got ? "" : " locked"));
      n.appendChild(el("span", "b-ico", b.ico)); n.appendChild(el("span", null, b.name));
      row.appendChild(n);
    });
  }

  /* ================================================================ Views & stats */
  function showView(name) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    $("view-" + name).classList.add("active");
    document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.view === name));
    $("sidebar").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "dashboard") renderDashboard();
    if (name === "progress") renderProgress();
    if (name === "badges") renderBadges("allBadges");
  }
  function syncHeader() { $("sidePoints").textContent = state.points; $("sideStreak").textContent = state.dayStreak; }
  function renderDashboard() {
    $("dTotal").textContent = state.totalWords;
    $("dCorrect").textContent = state.totalCorrect;
    $("dAcc").textContent = (state.totalWords ? Math.round(state.totalCorrect / state.totalWords * 100) : 0) + "%";
    $("dBest").textContent = state.bestStreak;
    const c = (state.todayDate === today()) ? state.todayCount : 0;
    const ring = $("goalRing"); ring.style.setProperty("--p", Math.min(100, c / 20 * 100));
    $("goalText").textContent = Math.min(c, 20) + "/20";
    renderBadges("dashBadges", 6);
  }
  function renderProgress() {
    $("pTotal").textContent = state.totalWords;
    $("pCorrect").textContent = state.totalCorrect;
    $("pAcc").textContent = (state.totalWords ? Math.round(state.totalCorrect / state.totalWords * 100) : 0) + "%";
    $("pBest").textContent = state.bestStreak;
    const gs = $("groupStats"); gs.innerHTML = "";
    [["la", "ழ ள ல"], ["ra", "ற ர"], ["na", "ந ண ன"]].forEach(([id, lbl]) => {
      const g = state.groups[id], pct = g.t ? Math.round(g.c / g.t * 100) : 0;
      const row = el("div", "gstat");
      row.appendChild(el("div", "gs-let", lbl));
      const bar = el("div", "gs-bar"); const fill = el("div", "gs-fill"); fill.style.width = pct + "%"; bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el("div", "gs-num", g.t ? (pct + "% · " + g.c + "/" + g.t) : "—"));
      gs.appendChild(row);
    });
  }

  /* ================================================================ Setup controls */
  function segGroup(id, attr, cb) {
    const w = $(id); if (!w) return;
    w.querySelectorAll(".seg-btn").forEach(b => b.addEventListener("click", () => {
      w.querySelectorAll(".seg-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active"); cb(b.dataset[attr]);
    }));
  }
  function syncSetupUI() {
    ["dashDiff", "setupDiff"].forEach(id => $(id).querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("active", b.dataset.diff === state.diff)));
    ["dashLen", "setupLen"].forEach(id => $(id).querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("active", +b.dataset.len === state.count)));
  }
  function buildClassChoices() {
    const wrap = $("classChoices"); wrap.innerHTML = "";
    const classes = META.classes && META.classes.length ? META.classes : Object.keys(WORDS);
    if (!state.cls) state.cls = classes[0];
    classes.forEach(c => {
      const b = el("button", "seg-btn" + (c === state.cls ? " active" : ""), "Class " + c);
      b.addEventListener("click", () => { wrap.querySelectorAll(".seg-btn").forEach(x => x.classList.remove("active")); b.classList.add("active"); state.cls = c; save(); });
      wrap.appendChild(b);
    });
  }
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    $("themeToggle").innerHTML = (state.theme === "dark" ? "☀️" : "🌙") + " <span>Theme</span>";
    $("setLight").classList.toggle("active", state.theme === "light");
    $("setDark").classList.toggle("active", state.theme === "dark");
  }

  /* ================================================================ Init */
  function init() {
    applyTheme(); buildClassChoices(); syncHeader(); syncSetupUI(); renderDashboard();

    segGroup("dashDiff", "diff", v => { state.diff = v; save(); syncSetupUI(); });
    segGroup("setupDiff", "diff", v => { state.diff = v; save(); syncSetupUI(); });
    segGroup("dashLen", "len", v => { state.count = +v; save(); syncSetupUI(); });
    segGroup("setupLen", "len", v => { state.count = +v; save(); syncSetupUI(); });

    document.querySelectorAll(".nav-item").forEach(n => n.addEventListener("click", () => showView(n.dataset.view)));
    $("menuBtn").addEventListener("click", (e) => { e.stopPropagation(); $("sidebar").classList.toggle("open"); });

    $("dashStart").addEventListener("click", startSession);
    $("setupStart").addEventListener("click", startSession);
    $("speakBtn").addEventListener("click", () => S && speak(S.cur.word));
    $("hintBtn").addEventListener("click", () => { $("pron").textContent = T.transliterate(S.cur.word); $("pron").hidden = false; $("hintBtn").style.visibility = "hidden"; });
    $("checkBtn").addEventListener("click", check);
    $("skipBtn").addEventListener("click", skip);
    $("quitBtn").addEventListener("click", () => showView("dashboard"));
    $("againBtn").addEventListener("click", startSession);
    $("homeBtn").addEventListener("click", () => showView("dashboard"));
    $("themeToggle").addEventListener("click", () => { state.theme = state.theme === "dark" ? "light" : "dark"; save(); applyTheme(); });
    $("setLight").addEventListener("click", () => { state.theme = "light"; save(); applyTheme(); });
    $("setDark").addEventListener("click", () => { state.theme = "dark"; save(); applyTheme(); });
    $("resetBtn").addEventListener("click", () => { if (confirm("Erase all progress, points and badges?")) { state = Object.assign({}, defaults); save(); applyTheme(); buildClassChoices(); syncHeader(); syncSetupUI(); renderDashboard(); alert("Progress reset."); } });

    document.addEventListener("keydown", (e) => {
      if (!$("view-play").classList.contains("active")) return;
      if (e.key === "Enter") { e.preventDefault(); check(); }
      if (e.key === " " && S) { e.preventDefault(); speak(S.cur.word); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
