/* Shared visit badge (visitor-badge.laobi.icu). Hex colors must use %23 in query strings.
   Theme-aware tints to match the app’s stone / warm accent palette. */
(function () {
  "use strict";

  function badgeUrl(pageId) {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    var left = dark ? "%23706058" : "%23908a84";
    var right = dark ? "%23987a6d" : "%23d4a08c";
    var parts = [
      "page_id=" + encodeURIComponent(pageId),
      "left_text=" + encodeURIComponent("Visits"),
      "left_color=" + left,
      "right_color=" + right,
      "radius=12",
      "height=22",
      "t=" + Date.now(),
    ];
    return "https://visitor-badge.laobi.icu/badge?" + parts.join("&");
  }

  document.querySelectorAll("img.visit-badge[data-visit-page]").forEach(function (img) {
    var pageId = img.getAttribute("data-visit-page");
    if (!pageId) return;
    img.alt = "Visit count (shared)";
    img.src = badgeUrl(pageId);
    img.addEventListener("error", function () {
      img.replaceWith(
        Object.assign(document.createElement("span"), {
          className: "visit-badge-fallback muted",
          textContent: "—",
          title: "Visit badge blocked or unavailable",
        })
      );
    });
  });
})();
