/* Global visit counter: tries CountAPI, falls back to per-device count (works on file://). */
(function () {
  "use strict";
  var el = document.getElementById("visitCount");
  if (!el) return;
  var page = el.getAttribute("data-page") || "home";
  var hint = document.getElementById("visitCountHint");
  var ns = "tamilvazhikaati";

  function showLocal() {
    var k = "tamilVazhikaati_visits_" + page;
    var n = (parseInt(localStorage.getItem(k), 10) || 0) + 1;
    localStorage.setItem(k, String(n));
    el.textContent = n.toLocaleString();
    if (hint) {
      hint.hidden = false;
      hint.textContent = "This device only (live total needs internet)";
    }
  }

  el.textContent = "…";

  fetch("https://api.countapi.xyz/hit/" + encodeURIComponent(ns) + "/" + encodeURIComponent(page), {
    cache: "no-store",
  })
    .then(function (r) {
      if (!r.ok) throw new Error("bad status");
      return r.json();
    })
    .then(function (j) {
      if (typeof j.value !== "number") throw new Error("no value");
      el.textContent = j.value.toLocaleString();
      if (hint) hint.hidden = true;
    })
    .catch(function () {
      showLocal();
    });
})();
