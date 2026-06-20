/* Portal home: share link + copy to clipboard */
(function () {
  "use strict";

  var url = window.location.href;
  var statusEl = document.getElementById("shareStatus");

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  var copyBtn = document.getElementById("copyUrlBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          function () {
            setStatus("Link copied to clipboard.");
          },
          function () {
            fallbackCopy();
          }
        );
      } else {
        fallbackCopy();
      }
    });
  }

  function fallbackCopy() {
    try {
      window.prompt("Copy this link:", url);
      setStatus("Copy the link from the box above.");
    } catch (e) {
      setStatus("Copy failed — select the address bar and copy manually.");
    }
  }

  var shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", function () {
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
            else if (copyBtn) copyBtn.click();
          });
      } else if (copyBtn) {
        copyBtn.click();
      }
    });
  }
})();
