const fs = require("fs"), path = require("path");
global.window = {};
eval(fs.readFileSync(path.join(__dirname, "..", "web", "data", "words.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "web", "js", "tamil.js"), "utf8"));
const T = global.window.Tamil;
const WORDS = global.window.TAMIL_WORDS["10"];

// how many words contain confusable letters?
let conf = WORDS.filter(([w]) => T.hasConfusable(w));
console.log("Total words:", WORDS.length, " with confusable letters:", conf.length);

console.log("\nSample confusable words (word | roman | clusters | blank-options):");
const sample = conf.filter(([, f]) => f >= 5).slice(0, 18);
for (const [w, f] of sample) {
  const cls = T.clusters(w);
  const marked = cls.map(c => T.groupOfCluster(c) ? `[${c}]` : c).join("");
  // show options for first confusable cluster
  const firstConf = cls.find(c => T.groupOfCluster(c));
  const opts = T.optionsFor(firstConf);
  console.log(`  ${w}  | ${T.transliterate(w)}  | ${marked}  | ${firstConf} -> {${opts.join(", ")}}`);
}

// transliteration spot checks
console.log("\nTransliteration checks:");
["தமிழ்","பழம்","மழை","வாள்","நாள்","ஆறு","மரம்","நந்தன்","மண்","என்று","பள்ளி","கண்"]
  .forEach(w => console.log(`  ${w} -> ${T.transliterate(w)}`));
