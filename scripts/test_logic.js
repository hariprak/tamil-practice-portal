// Headless sanity test of the data + core game logic (no browser needed).
const fs = require("fs");
const path = require("path");

// load words.js by shimming window
global.window = {};
const wjs = fs.readFileSync(path.join(__dirname, "..", "web", "data", "words.js"), "utf8");
eval(wjs);
const WORDS = global.window.TAMIL_WORDS;
const META = global.window.TAMIL_META;

function isCombining(ch) {
  const cp = ch.codePointAt(0);
  return (cp >= 0x0bbe && cp <= 0x0bcd) || cp === 0x0bd7 || cp === 0x0b82;
}
function clusters(word) {
  const out = [];
  for (const ch of word) {
    if (out.length && isCombining(ch)) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}
const BANDS = { easy: [2, 4], hard: [5, 99] };
function poolFor(cls, diff) {
  const [lo, hi] = BANDS[diff];
  return (WORDS[cls] || []).filter(([w]) => { const n = clusters(w).length; return n >= lo && n <= hi; });
}

console.log("Classes:", META.classes, "counts:", META.counts);
for (const cls of META.classes) {
  for (const d of ["easy", "hard"]) {
    console.log(`  class ${cls} ${d}: ${poolFor(cls, d).length} words`);
  }
}

// build a few sample questions for class 10 easy + hard
function buildQuestion(word, diff) {
  const cl = clusters(word); const n = cl.length;
  let blanks = Math.max(1, Math.min(n - 1, Math.round(n * 0.4)));
  if (diff === "hard") blanks = Math.max(blanks, Math.min(n - 1, Math.round(n * 0.55)));
  const idxs = [...Array(n).keys()].sort(() => Math.random() - 0.5).slice(0, blanks).sort((a, b) => a - b);
  return { word, clusters: cl, n, blanks, blankPos: idxs, answers: idxs.map(i => cl[i]) };
}

console.log("\nSample questions:");
for (const d of ["easy", "hard"]) {
  const pool = poolFor("10", d);
  for (let i = 0; i < 4; i++) {
    const w = pool[Math.floor(Math.random() * pool.length)][0];
    const q = buildQuestion(w, d);
    const masked = q.clusters.map((c, i2) => q.blankPos.includes(i2) ? "_" : c).join("|");
    console.log(`  [${d}] ${w}  -> clusters(${q.n}): ${q.clusters.join("|")}  masked: ${masked}  answers: ${q.answers.join(",")}`);
  }
}

// reconstruct check: joining clusters must equal original word
let recon_ok = true;
for (const cls of META.classes) {
  for (const [w] of WORDS[cls].slice(0, 2000)) {
    if (clusters(w).join("") !== w) { recon_ok = false; console.log("RECON FAIL:", w); break; }
  }
}
console.log("\nCluster round-trip (first 2000/class):", recon_ok ? "OK" : "FAILED");
