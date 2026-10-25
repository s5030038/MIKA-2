// page-loader-circle.js   (circle version - the bar version is page-loader.js)
// A faded, blurred loading overlay (logo + spinning ring) that only appears when
// something is REALLY taking time:
//   - a page is still loading when you arrive on it
//   - the page is fetching data (e.g. the Brisbane events API) while it loads
//   - you click a link / submit something and the next page is slow to open
// Quick loads (under SHOW_DELAY ms) never show it, so there's no flicker.
//
// Add these TWO lines inside <head> of every page, before your other scripts:
//   <link rel="stylesheet" href="../css/page-loader-circle.css">
//   <script src="../js/page-loader-circle.js"></script>
// The overlay's styles live in page-loader-circle.css; its HTML is built below.
// The logo is found automatically at ../images/logo.png (relative to this file's folder).
//
// Optional:
//   <a href="..." data-no-loader>   -> this link never shows the overlay
//   MikaLoader.show() / MikaLoader.hide()   -> control it by hand (e.g. around your own work)

(function () {
  "use strict";

  var SHOW_DELAY = 200;        // ms of waiting before the overlay appears
  var MIN_VISIBLE = 400;       // once shown, stay at least this long (avoids a blink)
  var MAX_LOAD_WAIT = 10000;   // safety: never block the page for longer than this
  var NAV_TIMEOUT = 8000;      // safety: if a "leaving page" never actually leaves, hide again
  var FETCH_GRACE = 2000;      // only fetches started before (page load + this) keep it open

  // where the logo lives, worked out from where this script was loaded from
  var scriptSrc = document.currentScript && document.currentScript.src;
  var LOGO_URL = scriptSrc ? new URL("../images/logo.png", scriptSrc).href : "../images/logo.png";

  /* ---------- the overlay (markup here, styles in page-loader-circle.css) ---------- */

  var overlay = null;

  function build() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.id = "mika-loader";
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.innerHTML =
      '<div class="mika-loader__box">' +
        '<div class="mika-loader__mark"><div class="mika-loader__ring" aria-hidden="true"></div>' +
          '<img alt="" aria-hidden="true"></div>' +
        '<h2 class="mika-loader__name">MIKA\u00B2</h2>' +
        '<p class="mika-loader__text">Loading<span class="mika-loader__dots" aria-hidden="true">' +
          '<span>.</span><span>.</span><span>.</span></span></p>' +
      '</div>';
    overlay.querySelector("img").src = LOGO_URL;
    document.documentElement.appendChild(overlay);   // works even before <body> exists
  }

  /* ---------- state: "is something really loading?" ---------- */

  var pageLoaded = document.readyState === "complete";
  var loadedAt = pageLoaded ? Date.now() : 0;
  var pendingFetches = 0;
  var navigating = false;
  var manual = 0;                 // MikaLoader.show() calls not yet hidden
  var visible = false;
  var shownAt = 0;
  var showTimer = null;
  var hideTimer = null;
  var navTimer = null;
  var startedAt = Date.now();

  function isBusy() {
    var stuck = Date.now() - startedAt > MAX_LOAD_WAIT && !navigating && !manual;   // give up waiting
    if (stuck) return false;
    return !pageLoaded || pendingFetches > 0 || navigating || manual > 0;
  }

  function reveal() {
    showTimer = null;
    if (!isBusy()) return;
    build();
    clearTimeout(hideTimer);
    hideTimer = null;
    visible = true;
    shownAt = Date.now();
    // next frame, so the fade-in transition runs
    requestAnimationFrame(function () { overlay.classList.add("is-visible"); });
  }

  function conceal() {
    hideTimer = null;
    if (isBusy()) return;
    visible = false;
    if (overlay) overlay.classList.remove("is-visible");
  }

  function update() {
    if (isBusy()) {
      clearTimeout(hideTimer);
      hideTimer = null;
      if (!visible && !showTimer) showTimer = setTimeout(reveal, SHOW_DELAY);
    } else {
      clearTimeout(showTimer);
      showTimer = null;
      if (visible && !hideTimer) {
        var wait = Math.max(0, MIN_VISIBLE - (Date.now() - shownAt));
        hideTimer = setTimeout(conceal, wait);
      }
    }
  }

  /* ---------- 1) the page itself loading ---------- */

  window.addEventListener("load", function () {
    pageLoaded = true;
    loadedAt = Date.now();
    update();
  });

  // back/forward button can restore a frozen copy of the page: make sure the overlay isn't stuck on
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      navigating = false;
      manual = 0;
      update();
    }
  });

  // safety net: stop waiting after MAX_LOAD_WAIT
  setTimeout(update, MAX_LOAD_WAIT + 50);

  /* ---------- 2) data being fetched while the page loads (e.g. the events API) ---------- */

  if (typeof window.fetch === "function") {
    var realFetch = window.fetch;
    window.fetch = function () {
      // later fetches (a refresh timer, an image lookup on the profile page...) stay invisible
      var track = !pageLoaded || Date.now() - loadedAt < FETCH_GRACE;
      var promise = realFetch.apply(this, arguments);
      if (!track) return promise;

      pendingFetches++;
      update();
      var done = function () { pendingFetches = Math.max(0, pendingFetches - 1); update(); };
      promise.then(done, done);
      return promise;
    };
  }

  /* ---------- 3) leaving for another page ---------- */

  function startNavigating() {
    navigating = true;
    clearTimeout(navTimer);
    // if we never actually left (download, mailto, cancelled), stop showing it
    navTimer = setTimeout(function () { navigating = false; update(); }, NAV_TIMEOUT);
    update();
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest ? e.target.closest("a[href]") : null;
    if (!link || link.hasAttribute("data-no-loader") || link.hasAttribute("download")) return;
    if (link.target && link.target !== "_self") return;

    var href = link.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^(javascript|mailto|tel):/i.test(href)) return;

    var url;
    try { url = new URL(link.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    // same page, only the #part changes (e.g. the profile tabs): nothing to load
    if (url.pathname === location.pathname && url.search === location.search) return;

    startNavigating();
  }, true);

  // covers form submits and code like  window.location.href = "profilePage.html"
  window.addEventListener("beforeunload", startNavigating);

  /* ---------- manual control ---------- */

  window.MikaLoader = {
    show: function () { manual++; update(); },
    hide: function () { manual = Math.max(0, manual - 1); update(); }
  };

  // start tracking right away so a slow page is covered from the first moment
  update();
})();