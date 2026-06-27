const fs = require("fs"), path = require("path");
global.window = {};
eval(fs.readFileSync(path.join(__dirname, "..", "web", "data", "words.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "web", "js", "tamil.js"), "utf8"));
const T = global.window.Tamil;
const WORDS = global.window.TAMIL_WORDS["10"];

function pool(diff) {
  const minFreq = diff === "easy" ? 4 : 1;
  return WORDS.filter(([w, f]) => {
    if (f < minFreq) return false;
    const n = T.clusters(w).length;
    if (diff === "easy") {
      if (n < 2 || n > 4) return false;
    } else {
      if (n < 5 || n > 9) return false;
    }
    const cl = T.clusters(w);
    return cl.some(c => T.groupOfCluster(c));
  });
}
function blanksFor(diff, n) { return diff === "easy" ? 1 : n; }
function buildQ(word, diff) {
  const cl = T.clusters(word);
  const confIdx = cl.map((c, i) => T.groupOfCluster(c) ? i : -1).filter(i => i >= 0);
  const nb = blanksFor(diff, confIdx.length);
  const blanks = confIdx.slice(0, nb);
  return { cl, confIdx, blanks };
}

let errors = 0, checked = 0;
for (const diff of ["easy", "hard"]) {
  const p = pool(diff);
  console.log(`pool[${diff}] = ${p.length} words`);
  for (const [w] of p.slice(0, 4000)) {
    const q = buildQ(w, diff);
    if (q.confIdx.length === 0) { errors++; console.log("NO BLANK:", w); continue; }
    if (q.blanks.length === 0) { errors++; console.log("ZERO BLANKS:", w); continue; }
    for (const pos of q.blanks) {
      const opts = T.optionsFor(q.cl[pos]);
      if (!opts.includes(q.cl[pos])) { errors++; console.log("OPT MISSING ANSWER:", w, q.cl[pos], opts); }
      if (opts.length < 2) { errors++; console.log("TOO FEW OPTS:", w, q.cl[pos], opts); }
      checked++;
    }
  }
}
console.log(`\nValidated ${checked} blanks. Errors: ${errors}`);
console.log(errors === 0 ? "ALL GOOD ✅" : "PROBLEMS ❌");
