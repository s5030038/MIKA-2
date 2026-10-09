// home-events.js
// Fills the three carousels on index.html:
//   1. #popular-events   -> upcoming events from BOTH datasets, mixed together
//   2. #creative-events  -> creative-events dataset only
//   3. #music-events     -> music-events dataset only
// Uses the shared code in api-events.js (DATASETS, fetchDataset, createEventCard).
// Load order on the page: api-events.js -> home-events.js

var EVENTS_PER_SECTION = 8;

// soonest upcoming events first (falls back to all events if none are in the future)
function upcomingSorted(list) {
  var now = Date.now();
  var upcoming = list.filter(function (ev) {
    return ev.startTime !== Infinity && ev.startTime >= now;
  });
  if (upcoming.length === 0) upcoming = list;
  return upcoming.sort(function (a, b) { return a.startTime - b.startTime; });
}

// alternate between lists: A1, B1, A2, B2...
function interleave(lists) {
  var mixed = [];
  var longest = Math.max.apply(null, lists.map(function (l) { return l.length; }));
  for (var i = 0; i < longest; i++) {
    lists.forEach(function (l) { if (l[i]) mixed.push(l[i]); });
  }
  return mixed;
}

function showMessage(container, text) {
  container.innerHTML = "";
  var msg = document.createElement("p");
  msg.textContent = text;
  container.appendChild(msg);
}

function fillSection(containerId, events, keepStaticIfEmpty) {
  var container = document.getElementById(containerId);
  if (!container) return;

  if (events.length === 0) {
    if (keepStaticIfEmpty) return;   // leave the placeholder cards in the HTML
    showMessage(container, "No events available right now. Check back soon!");
    return;
  }

  // build every card first, so one bad card can't leave the section half-empty
  var cards = [];
  events.forEach(function (ev) {
    try {
      var card = createEventCard(ev);
      if (card) cards.push(card);
    } catch (err) {
      console.error("Could not build card for", ev, err);
    }
  });

  if (cards.length === 0) {
    showMessage(container, "Events couldn't be displayed. Check the console for errors.");
    return;
  }

  container.innerHTML = "";
  cards.forEach(function (card) { container.appendChild(card); });
}

function loadHomeEvents() {
  if (!document.getElementById("popular-events")) return;

  // make missing / outdated script files obvious instead of failing silently
  var missing = [];
  if (typeof DATASETS === "undefined" || typeof fetchDataset === "undefined") missing.push("the merged api-events.js");
  if (typeof createEventCard === "undefined") missing.push("api-events.js");

  if (missing.length) {
    console.error("home-events.js can't run: missing/outdated " + missing.join(", ") +
                  ". Check the <script> paths and that api-events.js is the merged version.");
    ["creative-events", "music-events"].forEach(function (id) {
      var c = document.getElementById(id);
      if (c) showMessage(c, "Couldn't load events (script files missing - see console).");
    });
    return;
  }

  Promise.all(DATASETS.map(fetchDataset)).then(function (lists) {
    // lists are in the same order as DATASETS, so key them by dataset id
    var bySource = {};
    DATASETS.forEach(function (d, i) { bySource[d.id] = upcomingSorted(lists[i]); });
    console.log("Home events loaded:", DATASETS.map(function (d) { return d.id + " = " + bySource[d.id].length; }).join(", "));

    var half = EVENTS_PER_SECTION / 2;
    var popular = interleave(DATASETS.map(function (d) { return bySource[d.id].slice(0, half); }));

    fillSection("popular-events", popular, true);
    fillSection("creative-events", bySource["creative-events"].slice(0, EVENTS_PER_SECTION), false);
    fillSection("music-events", bySource["music-events"].slice(0, EVENTS_PER_SECTION), false);
  }).catch(function (err) {
    console.error("Error loading home events:", err);
  });
}

// each section's arrows scroll that section's own carousel
function setUpCarouselArrows() {
  document.querySelectorAll(".popular-section").forEach(function (section) {
    var container = section.querySelector(".event-cards");
    var left = section.querySelector(".arrow-left");
    var right = section.querySelector(".arrow-right");
    if (!container) return;

    var step = function () { return container.clientWidth * 0.8; };
    if (left) left.addEventListener("click", function () {
      container.scrollBy({ left: -step(), behavior: "smooth" });
    });
    if (right) right.addEventListener("click", function () {
      container.scrollBy({ left: step(), behavior: "smooth" });
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  loadHomeEvents();
  setUpCarouselArrows();
});