function getChecked(name) {
  return Array.from(
    document.querySelectorAll('#filters input[name="' + name + '"]:checked')
  ).map(function (el) { return el.value; });
}
 
// When the API doesn't have usable price
// unknown prices always sort to the end
function getPrice(card) {
  var p = card.dataset.price;
  return p === "" || p === undefined ? Infinity : Number(p);
}

/*--- filter and sort ---*/
function applyFiltersAndSort() {
    // for search bar
  var search = window.searchFilters || {};
  var categories = search.categories || [];
  var suburbs = search.suburbs || [];
  var ages = search.ages || [];
  var start = search.start || "";
  var end = search.end || "";
 
  // for the sidebar
  var bookings = getChecked("bookings");
 
  var freeOnlyInput = document.getElementById("free-only");
  var freeOnly = freeOnlyInput ? freeOnlyInput.checked : false;
 
  var sortInput = document.querySelector('input[name="sort"]:checked');
  var sortValue = sortInput ? sortInput.value : "soonest";
 
  var container = document.getElementById("browseevents");
  if (!container) return;
 
  var cards = Array.from(container.querySelectorAll(".browseevent-card"));
  var visibleCount = 0;
 
  cards.forEach(function (card) {
    var matchesCategory =
      categories.length === 0 || categories.includes(card.dataset.category);
 
    var matchesSuburb =
      suburbs.length === 0 || suburbs.includes(card.dataset.suburb);
 
    // age groups: "Kids, Teens, Seniors" -> match if checked group is there
    // no age range -> doen't match if age filter is active
    var cardAges = card.dataset.ages ? card.dataset.ages.split("|") : [];
    var matchesAge =
      ages.length === 0 ||
      ages.some(function (a) { return cardAges.includes(a); });
 
    // one day chosen = that day; two days chosen = everything between (inclusive).
    // data-day looks like "2026-09-22", so plain text comparison works.
    var matchesDate = true;
    if (start) {
      var day = card.dataset.day || "";
      matchesDate = end ? (day >= start && day <= end) : day === start;
    }
 
    var matchesFree = !freeOnly || card.dataset.price === "0";
 
    var matchesBookings =
      bookings.length === 0 || bookings.includes(card.dataset.bookings);
 
    var show = matchesCategory && matchesSuburb && matchesAge &&
      matchesDate && matchesFree && matchesBookings;
 
    card.classList.toggle("is-hidden", !show);
    if (show) visibleCount++;
  });

  // "no results" message (only once the cards have loaded)
  var emptyMessage = document.getElementById("no-results");
  if (emptyMessage) emptyMessage.hidden = visibleCount > 0 || cards.length === 0;

  cards.sort(function (a, b) {
    if (sortValue === "price-low" || sortValue === "price-high") {
      var pa = getPrice(a);
      var pb = getPrice(b);
 
      // unknown prices at the bottom
      if (pa === Infinity && pb === Infinity) return 0;
      if (pa === Infinity) return 1;
      if (pb === Infinity) return -1;
 
      return sortValue === "price-low" ? pa - pb : pb - pa;
    }
 
    var diff = new Date(a.dataset.start) - new Date(b.dataset.start);
    return sortValue === "latest" ? -diff : diff;
  });
  cards.forEach(function (card) { container.appendChild(card); });
}
 
/*-- sidebar -> open/close + clear feature --*/
 
function initFilterToggle() {
  var closeBtn = document.getElementById("filter-toggle");
  var openBtn = document.getElementById("filter-open");
  var filters = document.getElementById("filters");
  if (!filters) return;
 
  function setFiltersOpen(open) {
    filters.hidden = !open;
    if (closeBtn) closeBtn.setAttribute("aria-expanded", String(open));
    if (openBtn) openBtn.setAttribute("aria-expanded", String(open));
  }
 
  if (closeBtn) closeBtn.addEventListener("click", function () { setFiltersOpen(false); });
  if (openBtn) openBtn.addEventListener("click", function () { setFiltersOpen(true); });
}
 
function initFilterClear() {
  var clearBtn = document.getElementById("filter-clear");
  if (!clearBtn) return;
 
  clearBtn.addEventListener("click", function () {
    // unticks every checkbox in the sidebar 
    document.querySelectorAll('#filters input[type="checkbox"]').forEach(function (cb) {
      cb.checked = false;
    });
 
    var soonest = document.querySelector('input[name="sort"][value="soonest"]');
    if (soonest) soonest.checked = true;
 
    applyFiltersAndSort();
  });
}
 
function initFilterListeners() {
  var filters = document.getElementById("filters");
  if (!filters) return;
 
  filters.addEventListener("change", applyFiltersAndSort);
}
 
document.addEventListener("DOMContentLoaded", function () {
  initFilterToggle();
  initFilterClear();
  initFilterListeners();
  applyFiltersAndSort();
});
 