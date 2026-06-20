/* ================================================================
   tamil.js — Tamil text helpers shared by the app
   - grapheme clustering
   - confusable-letter groups (zha/La/la, Ra/ra, na/Na/na)
   - transliteration (Tamil -> readable English pronunciation)
================================================================ */
window.Tamil = (function () {
  "use strict";

  function isCombining(ch) {
    const cp = ch.codePointAt(0);
    return (cp >= 0x0bbe && cp <= 0x0bcd) || cp === 0x0bd7 || cp === 0x0b82;
  }
  function isVirama(ch) { return ch.codePointAt(0) === 0x0bcd; }

  function clusters(word) {
    const out = [];
    for (const ch of word) {
      if (out.length && isCombining(ch)) out[out.length - 1] += ch;
      else out.push(ch);
    }
    return out;
  }

  /* ---------- confusable groups (the heart of the app) ---------- */
  // ordering matches the three reference boxes
  const GROUPS = {
    la: { id: "la", label: "ழ ள ல", members: ["ழ", "ள", "ல"],
          roman: { "ழ": "zha", "ள": "La", "ல": "la" } },
    ra: { id: "ra", label: "ற ர", members: ["ற", "ர"],
          roman: { "ற": "Ra", "ர": "ra" } },
    na: { id: "na", label: "ந ண ன", members: ["ந", "ண", "ன"],
          roman: { "ந": "na", "ண": "Na", "ன": "na" } },
  };
  const BASE_TO_GROUP = {};
  Object.values(GROUPS).forEach(g => g.members.forEach(m => (BASE_TO_GROUP[m] = g.id)));

  function baseOf(cluster) { return cluster ? [...cluster][0] : ""; }
  function combiningOf(cluster) {
    const arr = [...cluster];
    return arr.slice(1).join("");
  }
  function groupOfCluster(cluster) {
    return BASE_TO_GROUP[baseOf(cluster)] || null;
  }
  // options for a blank = each group member carrying the same vowel sign
  function optionsFor(cluster) {
    const gid = groupOfCluster(cluster);
    if (!gid) return [];
    const tail = combiningOf(cluster);
    return GROUPS[gid].members.map(m => m + tail);
  }
  function hasConfusable(word) {
    return clusters(word).some(c => groupOfCluster(c));
  }

  /* ---------- transliteration ---------- */
  const VOWEL_IND = {
    "அ": "a", "ஆ": "aa", "இ": "i", "ஈ": "ee", "உ": "u", "ஊ": "oo",
    "எ": "e", "ஏ": "ae", "ஐ": "ai", "ஒ": "o", "ஓ": "oa", "ஔ": "au", "ஃ": "akku",
  };
  const CONS = {
    "க": "k", "ங": "ng", "ச": "ch", "ஞ": "ny", "ட": "t", "ண": "N",
    "த": "th", "ந": "n", "ப": "p", "ம": "m", "ய": "y", "ர": "r",
    "ல": "l", "வ": "v", "ழ": "zh", "ள": "L", "ற": "R", "ன": "n",
    "ஜ": "j", "ஷ": "sh", "ஸ": "s", "ஹ": "h", "ஶ": "sh",
  };
  const SIGN = {
    "\u0bbe": "aa", "\u0bbf": "i", "\u0bc0": "ee", "\u0bc1": "u", "\u0bc2": "oo",
    "\u0bc6": "e", "\u0bc7": "ae", "\u0bc8": "ai", "\u0bca": "o", "\u0bcb": "oa",
    "\u0bcc": "au",
  };

  function transliterate(word) {
    let out = "";
    for (const cl of clusters(word)) {
      const arr = [...cl];
      const base = arr[0];
      const marks = arr.slice(1);
      if (VOWEL_IND[base] !== undefined) { out += VOWEL_IND[base]; continue; }
      const stem = CONS[base];
      if (stem === undefined) { out += base; continue; }
      const hasVirama = marks.some(isVirama);
      if (hasVirama) { out += stem; continue; }
      let v = "a";
      for (const m of marks) if (SIGN[m] !== undefined) v = SIGN[m];
      out += stem + v;
    }
    return out;
  }

  return {
    clusters, isCombining, isVirama,
    GROUPS, groupOfCluster, optionsFor, hasConfusable, baseOf, combiningOf,
    transliterate,
  };
})();
