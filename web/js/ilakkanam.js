/* ================================================================
   Ilakkanam Trainer — grammar MCQ practice
   Runs fully client-side; safe to open via file:// (no server).
================================================================ */
(function () {
  "use strict";
  const DATA = window.TAMIL_ILAKKANAM || {};
  const META = window.TAMIL_ILAKKANAM_META || { classes: [] };

  const SKEY = "tamilIlakkanam.v2";
  const defaults = {
    theme: "light", cls: "10", diff: "easy", count: 10,
    points: 0, totalQuestions: 0, totalCorrect: 0, bestStreak: 0,
    badges: [], dayStreak: 0, lastDate: null, todayDate: null, todayCount: 0,
    topics: {},
  };
  let state = load();
  function load() {
    try {
      const o = Object.assign({}, defaults, JSON.parse(localStorage.getItem(SKEY)) || {});
      if (!o.topics || typeof o.topics !== "object") o.topics = {};
      return o;
    } catch (e) { return Object.assign({}, defaults); }
  }
  function save() { localStorage.setItem(SKEY, JSON.stringify(state)); }

  const $ = (id) => document.getElementById(id);
  const el = (t, c, x) => {
    const n = document.createElement(t);
    if (c) n.className = c;
    if (x != null) n.textContent = x;
    return n;
  };
  const shuffle = (a) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const today = () => new Date().toISOString().slice(0, 10);
  const accPct = () => state.totalQuestions
    ? Math.round(state.totalCorrect / state.totalQuestions * 100) : 0;

  function flashRed() {
    const r = $("fxRed"); if (!r) return;
    r.classList.remove("show"); void r.offsetWidth;
    r.classList.add("show");
    r.addEventListener("animationend", () => r.classList.remove("show"), { once: true });
  }
  function celebrate() {
    const layer = $("fxLayer"); if (!layer) return;
    const n = 5 + Math.floor(Math.random() * 4);
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

  function pool(cls, diff) {
    return (DATA[String(cls)] || []).filter((q) => q.diff === diff);
  }
  function sample(p, k) {
    return shuffle(p).slice(0, Math.min(k, p.length));
  }
  function classCount(cls) {
    return (META.counts && META.counts[String(cls)]) || (DATA[String(cls)] || []).length;
  }
  function promptText(q) {
    let t = q.prompt || "";
    if (q.chapter != null && q.chapter !== "") t += " (இயல் " + q.chapter + ")";
    return t;
  }

  const BADGES = [
    { id: "first", ico: "🌱", name: "First MCQ", t: (s) => s.totalQuestions >= 1 },
    { id: "ten", ico: "🔟", name: "10 Correct", t: (s) => s.totalCorrect >= 10 },
    { id: "fire", ico: "🔥", name: "Streak of 5", t: (s) => s.bestStreak >= 5 },
    { id: "fifty", ico: "⭐", name: "50 Correct", t: (s) => s.totalCorrect >= 50 },
    { id: "century", ico: "💯", name: "100 Questions", t: (s) => s.totalQuestions >= 100 },
    { id: "flawless", ico: "🏆", name: "Flawless Round", t: (s, c) => c && c.perfect },
    { id: "p200", ico: "👑", name: "200 Points", t: (s) => s.points >= 200 },
  ];
  function checkBadges(ctx) {
    const newly = [];
    for (const b of BADGES) {
      if (!state.badges.includes(b.id) && b.t(state, ctx)) {
        state.badges.push(b.id);
        newly.push(b);
      }
    }
    if (newly.length) save();
    return newly;
  }
  function renderBadges(container, limit) {
    const row = $(container);
    if (!row) return;
    row.innerHTML = "";
    let list = BADGES;
    if (limit) {
      list = BADGES.slice().sort((a, b) =>
        (state.badges.includes(b.id) ? 1 : 0) - (state.badges.includes(a.id) ? 1 : 0)).slice(0, limit);
    }
    list.forEach((b) => {
      const got = state.badges.includes(b.id);
      const n = el("div", "badge" + (got ? "" : " locked"));
      n.appendChild(el("span", "b-ico", b.ico));
      n.appendChild(el("span", null, b.name));
      row.appendChild(n);
    });
  }

  function syncHeader() {
    $("sidePoints").textContent = state.points;
    $("sideStreak").textContent = state.dayStreak;
  }
  function renderDashboard() {
    $("dTotal").textContent = state.totalQuestions;
    $("dCorrect").textContent = state.totalCorrect;
    $("dAcc").textContent = accPct() + "%";
    $("dBest").textContent = state.bestStreak;
    const c = (state.todayDate === today()) ? state.todayCount : 0;
    $("goalRing").style.setProperty("--p", Math.min(100, c / 10 * 100));
    $("goalText").textContent = Math.min(c, 10) + "/10";
    renderBadges("dashBadges", 6);
  }
  function renderProgress() {
    $("pTotal").textContent = state.totalQuestions;
    $("pCorrect").textContent = state.totalCorrect;
    $("pAcc").textContent = accPct() + "%";
    $("pBest").textContent = state.bestStreak;
    const gs = $("topicStats");
    gs.innerHTML = "";
    const entries = Object.entries(state.topics).sort((a, b) => b[1].t - a[1].t);
    if (!entries.length) {
      gs.appendChild(el("p", "muted", "No topic data yet — complete a practice round."));
      return;
    }
    entries.forEach(([topic, g]) => {
      const pct = g.t ? Math.round(g.c / g.t * 100) : 0;
      const row = el("div", "gstat");
      row.appendChild(el("div", "gs-let", topic));
      const bar = el("div", "gs-bar");
      const fill = el("div", "gs-fill");
      fill.style.width = pct + "%";
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el("div", "gs-num", g.t ? (pct + "% · " + g.c + "/" + g.t) : "—"));
      gs.appendChild(row);
    });
  }

  function syncSetupUI() {
    ["dashClass", "setupClass"].forEach((id) => {
      const w = $(id);
      if (!w) return;
      w.querySelectorAll(".seg-btn").forEach((b) =>
        b.classList.toggle("active", b.dataset.cls === String(state.cls)));
    });
    ["dashDiff", "setupDiff"].forEach((id) => {
      const w = $(id);
      if (!w) return;
      w.querySelectorAll(".seg-btn").forEach((b) =>
        b.classList.toggle("active", b.dataset.diff === state.diff));
    });
    ["dashLen", "setupLen"].forEach((id) => {
      const w = $(id);
      if (!w) return;
      w.querySelectorAll(".seg-btn").forEach((b) =>
        b.classList.toggle("active", +b.dataset.len === state.count));
    });
    updateEmptyMsg();
  }

  function updateEmptyMsg() {
    const total = classCount(state.cls);
    const p = pool(state.cls, state.diff);
    let msg = "";
    let ok = true;
    if (total === 0) {
      msg = "Class " + state.cls + " content not loaded yet — add PDF and rebuild data.";
      ok = false;
    } else if (!p.length) {
      msg = "No " + state.diff + " questions for Class " + state.cls + " yet.";
      ok = false;
    }
    ["dashEmptyMsg", "setupEmptyMsg"].forEach((id) => {
      const node = $(id);
      if (!node) return;
      node.hidden = !msg;
      node.textContent = msg;
    });
    ["dashStart", "setupStart"].forEach((id) => {
      const btn = $(id);
      if (btn) btn.disabled = !ok;
    });
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    $("themeToggle").innerHTML = (state.theme === "dark" ? "☀️" : "🌙") + " <span>Theme</span>";
    const sl = $("setLight"), sd = $("setDark");
    if (sl) sl.classList.toggle("active", state.theme === "light");
    if (sd) sd.classList.toggle("active", state.theme === "dark");
  }

  function showView(name) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    $("view-" + name).classList.add("active");
    document.querySelectorAll(".nav-item").forEach((n) =>
      n.classList.toggle("active", n.dataset.view === name));
    $("sidebar").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "dashboard") { syncSetupUI(); renderDashboard(); }
    if (name === "practice-setup") syncSetupUI();
    if (name === "progress") renderProgress();
    if (name === "badges") renderBadges("allBadges");
  }

  function bumpDayStreak() {
    const t = today();
    if (state.lastDate !== t) {
      const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      state.dayStreak = (state.lastDate === y) ? state.dayStreak + 1 : 1;
      state.lastDate = t;
    }
    save();
    syncHeader();
  }
  function bumpToday(n) {
    const t = today();
    if (state.todayDate !== t) { state.todayDate = t; state.todayCount = 0; }
    state.todayCount += n;
  }
  function recordTopic(topic, ok) {
    const key = topic || "இலக்கணம்";
    if (!state.topics[key]) state.topics[key] = { t: 0, c: 0 };
    state.topics[key].t++;
    if (ok) state.topics[key].c++;
  }

  let S = null;
  let selected = -1;
  let answered = false;

  function startSession() {
    const p = pool(state.cls, state.diff);
    if (!p.length) {
      updateEmptyMsg();
      return;
    }
    const questions = sample(p, Math.min(state.count, p.length));
    S = { questions, idx: 0, correct: 0, points: 0, streak: 0, best: 0, review: [] };
    bumpDayStreak();
    showView("play");
    loadQ();
  }

  function loadQ() {
    answered = false;
    selected = -1;
    const q = S.questions[S.idx];
    const total = S.questions.length;
    $("progressFill").style.width = ((S.idx) / total * 100) + "%";
    $("progressText").textContent = (S.idx + 1) + " / " + total;
    $("roundPoints").textContent = S.points;
    $("topicLabel").textContent = q.topic || "இலக்கணம்";
    $("prompt").textContent = promptText(q);

    const box = $("mcqOptions");
    box.innerHTML = "";
    q.options.forEach((opt, i) => {
      const btn = el("button", "mcq-option", opt);
      btn.type = "button";
      btn.dataset.idx = String(i);
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", "false");
      btn.addEventListener("click", () => {
        if (answered) return;
        selected = i;
        box.querySelectorAll(".mcq-option").forEach((b, j) => {
          b.classList.toggle("selected", j === i);
          b.setAttribute("aria-checked", j === i ? "true" : "false");
        });
      });
      box.appendChild(btn);
    });

    $("feedback").textContent = "";
    $("feedback").className = "feedback";
    $("checkBtn").hidden = false;
    $("nextBtn").hidden = true;
    $("checkBtn").textContent = "சரிபார் · Check";
  }

  function checkAnswer() {
    if (answered) {
      nextQ();
      return;
    }
    if (selected < 0) {
      $("feedback").textContent = "ஒரு விடையைத் தேர்ந்தெடுக்கவும் · Pick an answer";
      $("feedback").className = "feedback bad";
      return;
    }
    answered = true;
    const q = S.questions[S.idx];
    const ok = selected === q.answer;
    recordTopic(q.topic, ok);
    state.totalQuestions++;
    bumpToday(1);
    if (ok) {
      S.correct++;
      S.streak++;
      S.best = Math.max(S.best, S.streak);
      const gain = state.diff === "hard" ? 12 : 8;
      S.points += gain;
      state.points += gain;
      state.totalCorrect++;
      if (state.bestStreak < S.best) state.bestStreak = S.best;
      chime(true);
      celebrate();
      $("feedback").innerHTML = "✓ சரி! +" + gain + " ★";
      $("feedback").className = "feedback ok";
    } else {
      S.streak = 0;
      chime(false);
      flashRed();
      const ans = q.options[q.answer];
      $("feedback").innerHTML = "✗ தவறு — சரியான விடை: <span class=\"ans\">" + ans + "</span>";
      $("feedback").className = "feedback bad";
      S.review.push({ q, picked: selected });
    }

    $("mcqOptions").querySelectorAll(".mcq-option").forEach((b, i) => {
      b.disabled = true;
      if (i === q.answer) b.classList.add("correct");
      else if (i === selected && !ok) b.classList.add("wrong");
    });

    $("roundPoints").textContent = S.points;
    syncHeader();
    save();
    $("checkBtn").hidden = true;
    $("nextBtn").hidden = false;
    const last = S.idx + 1 >= S.questions.length;
    $("nextBtn").textContent = last ? "முடி · Finish ▶" : "அடுத்தது · Next →";
  }

  function nextQ() {
    S.idx++;
    if (S.idx >= S.questions.length) {
      showResults();
      return;
    }
    loadQ();
  }

  function showResults() {
    const total = S.questions.length;
    const pct = total ? S.correct / total : 0;
    const earned = checkBadges({ perfect: S.correct === total && total > 0 });

    $("rScore").textContent = S.points;
    $("rCorrect").textContent = S.correct + "/" + total;
    $("rStreak").textContent = S.best;
    $("resultEmoji").textContent = pct === 1 ? "🏆" : pct >= 0.8 ? "🎉" : pct >= 0.5 ? "👍" : "📚";
    $("resultTitle").textContent = pct === 1 ? "சிறப்பு! · Perfect!"
      : pct >= 0.8 ? "அருமை!" : pct >= 0.5 ? "நன்று!" : "மீண்டும் பயிற்சி செய்";

    const nb = $("newBadges");
    nb.innerHTML = "";
    earned.forEach((b) => {
      const n = el("div", "badge");
      n.appendChild(el("span", "b-ico", b.ico));
      n.appendChild(el("span", null, "New: " + b.name));
      nb.appendChild(n);
    });

    const list = $("reviewList");
    list.innerHTML = "";
    if (!S.review.length) {
      list.appendChild(el("p", "muted", "அனைத்தும் சரி! · All correct"));
    } else {
      S.review.forEach(({ q, picked }) => {
        const row = el("div", "review-item bad");
        const left = el("div");
        left.appendChild(el("div", null, promptText(q)));
        left.appendChild(el("div", "r-detail", "Your pick: " + q.options[picked]));
        const right = el("span", "ans", q.options[q.answer]);
        row.append(left, right);
        list.appendChild(row);
      });
    }
    save();
    syncHeader();
    showView("results");
  }

  function segGroup(id, attr, cb) {
    const w = $(id);
    if (!w) return;
    w.querySelectorAll(".seg-btn").forEach((b) => b.addEventListener("click", () => {
      w.querySelectorAll(".seg-btn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      cb(b.dataset[attr]);
    }));
  }

  function init() {
    applyTheme();
    syncHeader();
    syncSetupUI();
    renderDashboard();

    segGroup("dashClass", "cls", (v) => { state.cls = v; save(); syncSetupUI(); });
    segGroup("setupClass", "cls", (v) => { state.cls = v; save(); syncSetupUI(); });
    segGroup("dashDiff", "diff", (v) => { state.diff = v; save(); syncSetupUI(); });
    segGroup("setupDiff", "diff", (v) => { state.diff = v; save(); syncSetupUI(); });
    segGroup("dashLen", "len", (v) => { state.count = +v; save(); syncSetupUI(); });
    segGroup("setupLen", "len", (v) => { state.count = +v; save(); syncSetupUI(); });

    document.querySelectorAll(".nav-item").forEach((n) =>
      n.addEventListener("click", () => showView(n.dataset.view)));
    $("menuBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      $("sidebar").classList.toggle("open");
    });

    $("dashStart").addEventListener("click", startSession);
    $("setupStart").addEventListener("click", startSession);
    $("checkBtn").addEventListener("click", checkAnswer);
    $("nextBtn").addEventListener("click", nextQ);
    $("quitBtn").addEventListener("click", () => showView("dashboard"));
    $("againBtn").addEventListener("click", startSession);
    $("homeBtn").addEventListener("click", () => showView("dashboard"));

    $("themeToggle").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      save();
      applyTheme();
    });
    $("setLight").addEventListener("click", () => { state.theme = "light"; save(); applyTheme(); });
    $("setDark").addEventListener("click", () => { state.theme = "dark"; save(); applyTheme(); });
    $("resetBtn").addEventListener("click", () => {
      if (!confirm("Erase all progress, points and badges?")) return;
      state = Object.assign({}, defaults);
      save();
      applyTheme();
      syncHeader();
      syncSetupUI();
      renderDashboard();
      alert("Progress reset.");
    });

    document.addEventListener("keydown", (e) => {
      if (!$("view-play").classList.contains("active")) return;
      if (e.key === "Enter") {
        e.preventDefault();
        if (answered) nextQ();
        else checkAnswer();
      }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4 && !answered) {
        const btn = $("mcqOptions").querySelector('[data-idx="' + (n - 1) + '"]');
        if (btn) btn.click();
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
