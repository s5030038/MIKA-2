//ai was used to complete this file
/**
 * filter bar for browsingPage.html: Category / Where / When / Who.
 *
 * The visitor's choices are stored in window.searchFilters.
 * filters.js reads that object every time it filters the event cards.
 *
 * Each card needs these data attributes (set in api-creative.js):
 *   data-category, data-suburb, data-day (YYYY-MM-DD, Brisbane time), data-ages
 */

window.searchFilters = {
  categories: [],
  suburbs: [],
  ages: [],
  start: "", // first selected day, "YYYY-MM-DD"
  end: ""    // last selected day ("" = single day)
};

// value = what the API stores in "primaryeventtype", icon = Font Awesome icon name
var CATEGORY_OPTIONS = [
  { value: "Music", label: "Music", icon: "music" },
  { value: "Festivals", label: "Festivals", icon: "tents" },
  { value: "Creative", label: "Creative", icon: "paintbrush" },
  { value: "Tours", label: "Tours", icon: "landmark" },
  { value: "Exhibitions", label: "Exhibitions", icon: "lightbulb" },
  { value: "Workshops", label: "Workshops", icon: "hammer" }
];

// Free Font Awesome has solid versions of these icons, but no outlined
// ones (except lightbulb). With Font Awesome Pro you can set this to true so
// each icon is outlined until its category is chosen
var OUTLINE_WHEN_UNSELECTED = false;

function categoryIconClass(icon, selected) {
  var style = (selected || !OUTLINE_WHEN_UNSELECTED) ? "fa-solid" : "fa-regular";
  return style + " fa-" + icon + " search-option__icon";
}

// value = what the API stores in "agerange", label = what the visitor sees
var WHO_OPTIONS = [
  { value: "Seniors", label: "Seniors" },
  { value: "Adults (30+)", label: "Adults (30+)" },
  { value: "Young adults", label: "Young adults" },
  { value: "Teens", label: "Teenagers" },
  { value: "Kids", label: "Kids" },
  { value: "Preschool kids", label: "Preschool kids" },
  { value: "Infants and toddlers", label: "Infants & toddlers" }
];

var SEGMENT_DEFAULTS = { category: "Category", where: "Where", when: "When", who: "Who" };
var PANEL_KEYS = { category: "categories", where: "suburbs", who: "ages" };

var MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
var MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

var now = new Date();
var calendarView = { year: now.getFullYear(), month: now.getMonth() }; // left-hand month

/* ---------- small helpers ---------- */

function pad2(n) { return (n < 10 ? "0" : "") + n; }

// month is 0-based, like JavaScript dates
function dayKey(year, month, day) {
  return year + "-" + pad2(month + 1) + "-" + pad2(day);
}

var TODAY_KEY = dayKey(now.getFullYear(), now.getMonth(), now.getDate());

function formatDayKey(key) {
  var p = key.split("-");
  return Number(p[2]) + " " + MONTH_SHORT[Number(p[1]) - 1];
}

function labelForAge(value) {
  var match = WHO_OPTIONS.filter(function (o) { return o.value === value; })[0];
  return match ? match.label : value;
}

// "Music" / "Music +2" / the default word when nothing is chosen
function summarise(values, fallback, labelFor) {
  if (values.length === 0) return fallback;
  var first = labelFor ? labelFor(values[0]) : values[0];
  return values.length === 1 ? first : first + " +" + (values.length - 1);
}

function setSegmentLabel(name, text) {
  var btn = document.querySelector('.search-bar__segment[data-panel="' + name + '"]');
  if (!btn) return;
  btn.textContent = text;
  btn.classList.toggle("has-value", text !== SEGMENT_DEFAULTS[name]);
}

function updateLabels() {
  var sf = window.searchFilters;

  setSegmentLabel("category", summarise(sf.categories, SEGMENT_DEFAULTS.category));
  setSegmentLabel("where", summarise(sf.suburbs, SEGMENT_DEFAULTS.where));
  setSegmentLabel("who", summarise(sf.ages, SEGMENT_DEFAULTS.who, labelForAge));

  var when = SEGMENT_DEFAULTS.when;
  if (sf.start && sf.end && sf.end !== sf.start) {
    when = formatDayKey(sf.start) + " – " + formatDayKey(sf.end);
  } else if (sf.start) {
    when = formatDayKey(sf.start);
  }
  setSegmentLabel("when", when);

  // the Clear button only shows when something is chosen
  var clearBtn = document.getElementById("search-clear");
  if (clearBtn) {
    clearBtn.hidden = !(sf.categories.length || sf.suburbs.length || sf.ages.length || sf.start);
  }
}

// called whenever a choice changes
function notifySearchChange() {
  updateLabels();
  if (typeof applyFiltersAndSort === "function") applyFiltersAndSort();
}

/* ---------- Category / Where / Who: lists of options ---------- */

// suburbs come from the events that actually loaded
function suburbOptions() {
  var seen = {};
  document.querySelectorAll(".browseevent-card").forEach(function (card) {
    if (card.dataset.suburb) seen[card.dataset.suburb] = true; //card has suburb -> records it in 'seen'
  });
  return Object.keys(seen).sort().map(function (s) { return { value: s, label: s }; }); //turns into alphabetically sorted objects
}

//clears panel -> fills it with options buttons
function renderOptions(panel, options, selected, emptyText) {
  panel.innerHTML = "";

  //creates container for options
  var list = document.createElement("div");
  list.className = "search-panel__list";

  //no options -> message: "events still loading..."
  if (options.length === 0) {
    var empty = document.createElement("p");
    empty.className = "search-panel__empty";
    empty.textContent = emptyText;
    list.appendChild(empty);
  }
 
  //creates button for options -> stores value in 'data-value'
  options.forEach(function (opt) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "search-option";
    btn.dataset.value = opt.value;
    var isOn = selected.indexOf(opt.value) !== -1;
    btn.setAttribute("aria-pressed", String(isOn)); //for accessibility -> screen readers

    if (opt.icon) {
      var icon = document.createElement("i");
      icon.className = categoryIconClass(opt.icon, isOn);
      icon.setAttribute("aria-hidden", "true");
      btn.classList.add("search-option--icon");
      btn.dataset.icon = opt.icon;
      btn.appendChild(icon);
    }

    var text = document.createElement("span");
    text.textContent = opt.label;
    btn.appendChild(text);

    list.appendChild(btn);
  });

  panel.appendChild(list);
}

/* ---------- When: two-month calendar ---------- */

function buildMonth(year, month, showPrev, showNext, eventDays) {
  var sf = window.searchFilters;

  var block = document.createElement("div");
  block.className = "calendar__month";

  var header = document.createElement("div");
  header.className = "calendar__header";

  var prev = document.createElement("button");
  prev.type = "button";
  prev.className = "calendar__nav" + (showPrev ? "" : " is-hidden");
  prev.dataset.nav = "-1";
  prev.setAttribute("aria-label", "Previous month");
  prev.textContent = "‹";

  var title = document.createElement("span");
  title.className = "calendar__title";
  title.textContent = MONTH_NAMES[month] + " " + year;

  var next = document.createElement("button");
  next.type = "button";
  next.className = "calendar__nav" + (showNext ? "" : " is-hidden");
  next.dataset.nav = "1";
  next.setAttribute("aria-label", "Next month");
  next.textContent = "›";

  header.appendChild(prev);
  header.appendChild(title);
  header.appendChild(next);

  var grid = document.createElement("div");
  grid.className = "calendar__grid";

  ["M", "T", "W", "T", "F", "S", "S"].forEach(function (letter) {
    var w = document.createElement("span");
    w.className = "calendar__weekday";
    w.textContent = letter;
    grid.appendChild(w);
  });

  // weeks start on Monday
  var offset = (new Date(year, month, 1).getDay() + 6) % 7;
  for (var i = 0; i < offset; i++) {
    var blank = document.createElement("span");
    blank.className = "calendar__blank";
    grid.appendChild(blank);
  }

  var daysInMonth = new Date(year, month + 1, 0).getDate();
  for (var d = 1; d <= daysInMonth; d++) {
    var key = dayKey(year, month, d);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "calendar__day";
    btn.dataset.day = key;
    btn.textContent = d;
    btn.setAttribute("aria-label", d + " " + MONTH_NAMES[month] + " " + year);

    if (key === TODAY_KEY) btn.classList.add("is-today");
    if (eventDays[key]) btn.classList.add("has-events");

    var isStart = key === sf.start;
    var isEnd = !!sf.end && key === sf.end;
    if (isStart) btn.classList.add("is-start");
    if (isEnd) btn.classList.add("is-end");
    if (sf.start && sf.end && key > sf.start && key < sf.end) btn.classList.add("is-in-range");
    btn.setAttribute("aria-pressed", String(isStart || isEnd));

    grid.appendChild(btn);
  }

  block.appendChild(header);
  block.appendChild(grid);
  return block;
}

function renderCalendar(panel) {
  // days that have at least one event get a small dot
  var eventDays = {};
  document.querySelectorAll(".browseevent-card").forEach(function (card) {
    if (card.dataset.day) eventDays[card.dataset.day] = true;
  });

  panel.innerHTML = "";

  var wrap = document.createElement("div");
  wrap.className = "calendar";

  var top = document.createElement("div");
  top.className = "calendar__top";

  var tag = document.createElement("span");
  tag.className = "search-panel__tag";
  tag.textContent = "Date";

  var clear = document.createElement("button");
  clear.type = "button";
  clear.className = "calendar__clear";
  clear.textContent = "Clear dates";

  top.appendChild(tag);
  top.appendChild(clear);

  var nextMonth = calendarView.month + 1;
  var nextYear = calendarView.year;
  if (nextMonth > 11) { nextMonth = 0; nextYear++; }

  var months = document.createElement("div");
  months.className = "calendar__months";
  months.appendChild(buildMonth(calendarView.year, calendarView.month, true, false, eventDays));
  months.appendChild(buildMonth(nextYear, nextMonth, false, true, eventDays));

  wrap.appendChild(top);
  wrap.appendChild(months);
  panel.appendChild(wrap);
}

// first click = start, second click = end, a third click starts again
function pickDay(key) {
  var sf = window.searchFilters;

  if (!sf.start || sf.end) {
    sf.start = key;
    sf.end = "";
  } else if (key < sf.start) {
    sf.start = key;
  } else {
    sf.end = key;
  }

  var panel = document.getElementById("panel-when");
  renderCalendar(panel);

  // re-rendering drops keyboard focus, so put it back on the day
  var again = panel.querySelector('.calendar__day[data-day="' + key + '"]');
  if (again) again.focus();

  notifySearchChange();
}

function shiftMonth(delta) {
  calendarView.month += delta;
  if (calendarView.month < 0) { calendarView.month = 11; calendarView.year--; }
  if (calendarView.month > 11) { calendarView.month = 0; calendarView.year++; }

  var panel = document.getElementById("panel-when");
  renderCalendar(panel);

  var again = panel.querySelector('[data-nav="' + delta + '"]');
  if (again) again.focus();
}

/* ---------- opening and closing the panels ---------- */

function renderPanel(name, panel) {
  var sf = window.searchFilters;

  if (name === "category") {
    renderOptions(panel, CATEGORY_OPTIONS, sf.categories, "No categories yet.");
  } else if (name === "where") {
    renderOptions(panel, suburbOptions(), sf.suburbs, "Events are still loading.");
  } else if (name === "who") {
    renderOptions(panel, WHO_OPTIONS, sf.ages, "");
  } else if (name === "when") {
    renderCalendar(panel);
  }
}

function closePanels() {
  document.querySelectorAll(".search-panel").forEach(function (p) { p.hidden = true; });
  document.querySelectorAll(".search-bar__segment").forEach(function (b) {
    b.classList.remove("is-open");
    b.setAttribute("aria-expanded", "false");
  });
}

function openPanel(name) {
  closePanels();

  var panel = document.getElementById("panel-" + name);
  var btn = document.querySelector('.search-bar__segment[data-panel="' + name + '"]');
  if (!panel || !btn) return;

  renderPanel(name, panel);
  panel.hidden = false;
  btn.classList.add("is-open");
  btn.setAttribute("aria-expanded", "true");
}

// used by the "Clear filter & sort" button in filters.js
function clearSearchBar() {
  var sf = window.searchFilters;
  sf.categories = [];
  sf.suburbs = [];
  sf.ages = [];
  sf.start = "";
  sf.end = "";
  updateLabels();
  closePanels();
}

/* ---------- saved preferences from onboarding ---------- */
 
// the logged-in user's saved preferences from onboarding, or null
function getSavedPreferences() {
  try {
    var userId = sessionStorage.getItem("mika_current_user_id");
    if (!userId) return null;
    var users = JSON.parse(localStorage.getItem("mika_users") || "[]");
    var user = users.find(function (u) { return u.id === userId; });
    return user && user.preferences ? user.preferences : null;
  } catch (e) {
    return null;
  }
}
 
// fill the bar with the visitor's saved preferences every time the page loads
function loadSavedPreferences() {
  var prefs = getSavedPreferences();
  if (!prefs) return;
 
  var validCategories = CATEGORY_OPTIONS.map(function (o) { return o.value; });
 
  window.searchFilters.categories = (prefs.categories || []).filter(function (c) {
    return validCategories.indexOf(c) !== -1;
  });
 
  // match a saved audience to an option by its label or its value
  // (onboarding saves "Teenagers", but the events use "Teens")
  window.searchFilters.ages = (prefs.audiences || []).map(function (a) {
    var match = WHO_OPTIONS.filter(function (o) { return o.label === a || o.value === a; })[0];
    return match ? match.value : null;
  }).filter(Boolean);
}

/* ---------- wiring ---------- */

document.addEventListener("DOMContentLoaded", function () {
  var bar = document.getElementById("search-bar");
  if (!bar) return;

  // Category / Where / Who: click an option to switch it on or off
  Object.keys(PANEL_KEYS).forEach(function (name) {
    var panel = document.getElementById("panel-" + name);
    if (!panel) return;

    panel.addEventListener("click", function (e) {
      var btn = e.target.closest(".search-option");
      if (!btn) return;

      var list = window.searchFilters[PANEL_KEYS[name]];
      var index = list.indexOf(btn.dataset.value);
      if (index === -1) list.push(btn.dataset.value);
      else list.splice(index, 1);

      btn.setAttribute("aria-pressed", String(index === -1));
      notifySearchChange();
    });
  });

  // When: calendar clicks
  var whenPanel = document.getElementById("panel-when");
  if (whenPanel) {
    whenPanel.addEventListener("click", function (e) {
      var dayBtn = e.target.closest(".calendar__day");
      if (dayBtn) { pickDay(dayBtn.dataset.day); return; }

      var navBtn = e.target.closest("[data-nav]");
      if (navBtn) { shiftMonth(Number(navBtn.dataset.nav)); return; }

      if (e.target.closest(".calendar__clear")) {
        window.searchFilters.start = "";
        window.searchFilters.end = "";
        renderCalendar(whenPanel);
        notifySearchChange();
      }
    });
  }

  // the four segments
  bar.querySelectorAll(".search-bar__segment").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.classList.contains("is-open")) closePanels();
      else openPanel(btn.dataset.panel);
    });
  });

  // Search button: filters already apply as you choose, so this just
  // closes the panel and jumps down to the results
  var submit = document.getElementById("search-submit");
  if (submit) {
    submit.addEventListener("click", function () {
      closePanels();
      var results = document.getElementById("browseevents");
      if (results) results.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Clear: resets only the search bar (the sidebar has its own clear button)
  var clearBtn = document.getElementById("search-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      clearSearchBar();
      if (typeof applyFiltersAndSort === "function") applyFiltersAndSort();
    });
  }

  // click outside the bar closes the panel. composedPath() is used because
  // the calendar re-draws itself on every click, which detaches the clicked
  // element before this handler runs.
  document.addEventListener("click", function (e) {
    var path = e.composedPath ? e.composedPath() : [];
    var inside = path.some(function (el) { return el === bar; });
    if (!inside) closePanels();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePanels();
  });

  loadSavedPreferences();
  updateLabels();
});