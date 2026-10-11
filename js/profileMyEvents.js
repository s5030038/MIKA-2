// my-events.js
// The "My Events" tab on profilePage.html:
//   - cards are built from data (no more hard-coded HTML)
//   - filter buttons (All / Upcoming / Attended / Saved) with live counts
//   - live search + a custom, styled "Sort by" dropdown
//   - working heart buttons, shared with the Favourites tab and the browsing page
// Load order: favourites.js -> profile.js -> my-events.js

(function () {
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /* ---------- sample "my events" ----------
     Replace this with real bookings later (e.g. read them from localStorage).
     The two September events are fixed dates; the others are relative to today,
     so the Upcoming filter and the "Today" badge always have something to show. */
  function inDays(days, hour, minute) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d.getTime();
  }

  var MY_EVENTS = [
    { id: "twilight-markets", name: "Brisbane Twilight Markets", category: "Market", venue: "South Bank",
      start: new Date(2026, 8, 13, 16, 0).getTime(), end: new Date(2026, 8, 13, 21, 0).getTime(), image: "../images/market.jpg" },
    { id: "pottery-beginners", name: "Pottery for Beginners", category: "Workshop", venue: "West End",
      start: new Date(2026, 8, 20, 10, 0).getTime(), end: new Date(2026, 8, 20, 12, 0).getTime(), image: "../images/pottery.jpg" },
    { id: "open-mic-night", name: "Open Mic Night", category: "Music", venue: "Fortitude Valley",
      start: inDays(0, 18, 0), end: inDays(0, 20, 30), image: "" },
    { id: "linocut-workshop", name: "Linocut Printmaking Workshop", category: "Workshop", venue: "West End",
      start: inDays(6, 13, 0), end: inDays(6, 16, 0), image: "" },
    { id: "riverside-film-night", name: "Riverside Film Night", category: "Creative", venue: "South Bank",
      start: inDays(14, 18, 30), end: inDays(14, 21, 0), image: "" }
  ];

  var SORT_OPTIONS = [
    { value: "recent", label: "Date (Recent)" },   // upcoming soonest first, then past events (newest first)
    { value: "latest", label: "Date (Latest)" },   // furthest in the future first
    { value: "name",   label: "Name (A-Z)" }
  ];

  var EMPTY_MESSAGES = {
    all: "You don't have any events yet. Find something you like on the Events page!",
    upcoming: "No upcoming events. Browse events and book something new.",
    attended: "You haven't attended any events yet.",
    saved: "No saved events yet. Tap the heart on an event to save it here."
  };

  var state = { filter: "all", sort: "recent", query: "" };

  /* ---------- small helpers ---------- */

  function $(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function icon(classes) { var i = document.createElement("i"); i.className = classes; return i; }

  function slugify(name) {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function startOfToday() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function isSameDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }

  function formatDate(ms) {
    var d = new Date(ms);
    return DAYS[d.getDay()] + ", " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }

  function formatTime(ms) {
    var d = new Date(ms);
    var h = d.getHours();
    var suffix = h >= 12 ? "PM" : "AM";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ":" + String(d.getMinutes()).padStart(2, "0") + " " + suffix;
  }

  function favouritesAvailable() { return typeof getFavourites === "function" && typeof toggleFavourite === "function"; }

  /* ---------- data ---------- */

  // My events + any saved events (e.g. hearted on the browsing page), de-duplicated
  function buildItems() {
    var favs = favouritesAvailable() ? getFavourites() : [];
    var savedIds = {};
    favs.forEach(function (f) { savedIds[f.id] = true; });

    var items = MY_EVENTS.map(function (s) {
      var id = "my-" + s.id;
      var dateLabel = formatDate(s.start);
      var timeLabel = formatTime(s.start) + " \u2013 " + formatTime(s.end);
      return {
        id: id, name: s.name, category: s.category, venue: s.venue,
        start: s.start, image: s.image, going: true,
        dateLabel: dateLabel, timeLabel: timeLabel,
        // the object that gets stored when the heart is tapped (same shape as the API events)
        fav: {
          id: id, name: s.name, slug: slugify(s.name), venue: s.venue,
          date: dateLabel + ", " + timeLabel, startTime: s.start,
          categories: [s.category], cost: ""
        }
      };
    });

    var seen = {};
    items.forEach(function (i) { seen[i.id] = true; });

    favs.forEach(function (f) {
      if (seen[f.id]) return;
      items.push({
        id: f.id, name: f.name,
        category: (f.categories && f.categories[0]) || "Event",
        venue: f.venue, start: f.startTime == null ? null : f.startTime,
        image: "", going: false,
        dateLabel: f.date, timeLabel: "", fav: f
      });
    });

    items.forEach(function (i) { i.saved = Boolean(savedIds[i.id]); });
    return items;
  }

  var FILTERS = {
    all:      function () { return true; },
    upcoming: function (i) { return i.start != null && i.start >= startOfToday(); },
    attended: function (i) { return i.going && i.start != null && i.start < startOfToday(); },
    saved:    function (i) { return i.saved; }
  };

  function matchesQuery(item, query) {
    if (!query) return true;
    return (item.name + " " + item.venue + " " + item.category).toLowerCase().indexOf(query) !== -1;
  }

  function sortItems(items, mode) {
    var today = startOfToday();
    var copy = items.slice();
    var time = function (i) { return i.start == null ? Infinity : i.start; };

    if (mode === "name") {
      return copy.sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
    if (mode === "latest") {
      return copy.sort(function (a, b) {
        if (time(a) === time(b)) return 0;
        if (time(a) === Infinity) return 1;       // undated events go last
        if (time(b) === Infinity) return -1;
        return time(b) - time(a);
      });
    }
    // "recent": upcoming events soonest first, then past events newest first
    return copy.sort(function (a, b) {
      var aUp = time(a) >= today, bUp = time(b) >= today;
      if (aUp !== bUp) return aUp ? -1 : 1;
      return aUp ? time(a) - time(b) : time(b) - time(a);
    });
  }

  /* ---------- card ---------- */

  function buildCard(item) {
    var card = el("article", "browseevent-card");
    card.dataset.id = item.id;

    // image frame (+ date badge + heart)
    var frame = el("div", "browseevent-card__frame");
    if (item.image) {
      var img = document.createElement("img");
      img.src = item.image;
      img.alt = item.name;
      img.addEventListener("error", function () {          // missing image -> coloured placeholder
        img.remove();
        frame.classList.add("no-image");
      });
      frame.appendChild(img);
    } else {
      frame.classList.add("no-image");
    }

    if (item.start != null) {
      var d = new Date(item.start);
      var badge = el("div", "event-card_date");
      badge.appendChild(el("strong", "", String(d.getDate())));
      badge.appendChild(el("span", "", MONTHS[d.getMonth()].toUpperCase()));
      frame.appendChild(badge);
    }

    var heart = el("button", "event_card-heart-button");
    heart.type = "button";
    heart.classList.toggle("is-active", item.saved);
    heart.setAttribute("aria-pressed", item.saved ? "true" : "false");
    heart.setAttribute("aria-label", (item.saved ? "Remove " : "Save ") + item.name + (item.saved ? " from" : " to") + " favourites");
    heart.appendChild(icon(item.saved ? "fa-solid fa-heart" : "fa-regular fa-heart"));
    heart.addEventListener("click", function () {
      if (favouritesAvailable()) toggleFavourite(item.fav);   // fires "favourites-changed" -> re-render
    });
    frame.appendChild(heart);
    card.appendChild(frame);

    // text content
    var content = el("div", "event-content");
    content.appendChild(el("span", "category " + slugify(item.category), item.category));
    content.appendChild(el("h3", "", item.name));

    var dateRow = el("div", "event-detail");
    dateRow.appendChild(icon("fa-regular fa-calendar"));
    dateRow.appendChild(el("span", "", item.dateLabel));
    content.appendChild(dateRow);

    if (item.timeLabel) {
      var timeRow = el("div", "event-detail");
      timeRow.appendChild(icon("fa-regular fa-clock"));
      timeRow.appendChild(el("span", "", item.timeLabel));
      content.appendChild(timeRow);
    }

    var venueRow = el("div", "event-detail");
    venueRow.appendChild(icon("fa-solid fa-location-dot"));
    venueRow.appendChild(el("span", "", item.venue));
    content.appendChild(venueRow);

    // status pill
    if (item.start != null && isSameDay(item.start, Date.now())) {
      content.appendChild(el("span", "event-status today", "Today"));
    } else if (item.going) {
      var status = el("span", "event-status attending");
      status.appendChild(icon("fa-solid fa-check"));
      status.appendChild(document.createTextNode(item.start >= startOfToday() ? " Attending" : " Attended"));
      content.appendChild(status);
    }

    card.appendChild(content);
    return card;
  }

  /* ---------- render ---------- */

  function render() {
    var grid = $("my-events-grid");
    var empty = $("my-events-empty");
    if (!grid) return;

    var items = buildItems();

    // live counts on the filter buttons (not affected by the search box)
    document.querySelectorAll(".event-filters .filter").forEach(function (btn) {
      var name = btn.dataset.filter;
      var count = items.filter(FILTERS[name]).length;
      var span = btn.querySelector("span");
      if (span) span.textContent = count;
      btn.classList.toggle("active", name === state.filter);
      btn.setAttribute("aria-pressed", name === state.filter ? "true" : "false");
    });

    var shown = sortItems(
      items.filter(FILTERS[state.filter]).filter(function (i) { return matchesQuery(i, state.query); }),
      state.sort
    );

    grid.innerHTML = "";
    shown.forEach(function (item) { grid.appendChild(buildCard(item)); });

    if (empty) {
      empty.hidden = shown.length > 0;
      empty.textContent = state.query
        ? "No events match \u201C" + $("my-events-search").value.trim() + "\u201D."
        : EMPTY_MESSAGES[state.filter];
    }
  }

  /* ---------- custom dropdown ---------- */

  // Replaces a native <select> with a styled, keyboard-friendly dropdown.
  function createDropdown(root, options, value, onChange) {
    root.innerHTML = "";

    var button = el("button", "dropdown__button");
    button.type = "button";
    button.id = root.id + "-button";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    var valueLabel = el("span", "dropdown__value");
    button.appendChild(valueLabel);
    button.appendChild(icon("fa-solid fa-chevron-down dropdown__chevron"));

    var menu = el("ul", "dropdown__menu");
    menu.setAttribute("role", "listbox");
    menu.tabIndex = -1;
    menu.hidden = true;

    var optionEls = options.map(function (opt) {
      var li = el("li", "dropdown__option", opt.label);
      li.setAttribute("role", "option");
      li.tabIndex = -1;
      li.dataset.value = opt.value;
      menu.appendChild(li);
      return li;
    });

    root.appendChild(button);
    root.appendChild(menu);

    var current = value;

    function paint() {
      optionEls.forEach(function (li) {
        var selected = li.dataset.value === current;
        li.setAttribute("aria-selected", selected ? "true" : "false");
        li.classList.toggle("is-selected", selected);
      });
      var match = options.filter(function (o) { return o.value === current; })[0];
      valueLabel.textContent = match ? match.label : "";
    }

    function open() {
      menu.hidden = false;
      root.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      var selected = optionEls.filter(function (li) { return li.dataset.value === current; })[0] || optionEls[0];
      selected.focus();
    }

    function close(returnFocus) {
      menu.hidden = true;
      root.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      if (returnFocus) button.focus();
    }

    function choose(newValue) {
      var changed = newValue !== current;
      current = newValue;
      paint();
      close(true);
      if (changed) onChange(current);
    }

    button.addEventListener("click", function () { if (menu.hidden) open(); else close(false); });
    button.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(); }
    });

    optionEls.forEach(function (li, index) {
      li.addEventListener("click", function () { choose(li.dataset.value); });
      li.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") { e.preventDefault(); optionEls[Math.min(index + 1, optionEls.length - 1)].focus(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); optionEls[Math.max(index - 1, 0)].focus(); }
        else if (e.key === "Home") { e.preventDefault(); optionEls[0].focus(); }
        else if (e.key === "End") { e.preventDefault(); optionEls[optionEls.length - 1].focus(); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(li.dataset.value); }
        else if (e.key === "Escape") { e.preventDefault(); close(true); }
        else if (e.key === "Tab") { close(false); }
      });
    });

    // click anywhere else closes it
    document.addEventListener("click", function (e) {
      if (!root.contains(e.target) && !menu.hidden) close(false);
    });

    paint();
  }

  /* ---------- start-up ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    if (!$("my-events-grid")) return;

    // filter buttons
    document.querySelectorAll(".event-filters .filter").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.filter = btn.dataset.filter;
        render();
      });
    });

    // live search
    var search = $("my-events-search");
    if (search) search.addEventListener("input", function () {
      state.query = search.value.trim().toLowerCase();
      render();
    });

    // sort dropdown
    var sortRoot = $("sort-dropdown");
    if (sortRoot) createDropdown(sortRoot, SORT_OPTIONS, state.sort, function (value) {
      state.sort = value;
      render();
    });

    // hearts toggled anywhere (this tab, Favourites tab) refresh the counts and the list
    document.addEventListener("favourites-changed", render);

    render();
  });
})();