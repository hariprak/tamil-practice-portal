/* Portal home: fixed share icon — Web Share API or copy link */
(function () {
  "use strict";

  var url = window.location.href;
  var statusEl = document.getElementById("shareStatus");
  var fab = document.getElementById("shareFab");
  if (!fab) return;

  var clearT;
  function setStatus(msg) {
    if (!statusEl) return;
    if (msg) {
      statusEl.hidden = false;
      statusEl.textContent = msg;
    } else {
      statusEl.hidden = true;
      statusEl.textContent = "";
    }
    clearTimeout(clearT);
    if (msg) {
      clearT = setTimeout(function () {
        setStatus("");
      }, 3200);
    }
  }

  function fallbackCopy() {
    try {
      window.prompt("Copy this link:", url);
      setStatus("Copy from the box if it appears.");
    } catch (e) {
      setStatus("Copy from the address bar.");
    }
  }

  function copyLink() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(url).then(
        function () {
          setStatus("Link copied.");
        },
        function () {
          fallbackCopy();
        }
      );
    }
    fallbackCopy();
    return Promise.resolve();
  }

  fab.addEventListener("click", function () {
    if (navigator.share) {
      navigator
        .share({
          title: document.title,
          text: "Tamil Guide — தமிழ் வழிகாட்டி",
          url: url,
        })
        .then(function () {
          setStatus("Shared.");
        })
        .catch(function (err) {
          if (err && err.name === "AbortError") setStatus("");
          else copyLink();
        });
    } else {
      copyLink();
    }
  });
})();
