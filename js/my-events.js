// my-events.js
// The "My Events" tab on profilePage.html:
//   - cards are built from data
//   - filter buttons (All / Upcoming / Attended / Saved) with live counts, live search, sort dropdown
//   - working heart buttons, shared with the Favourites tab and the browsing page
//   - List / Calendar toggle: a month calendar with a selected-day panel, a "Coming up" list
//     and an "Add to my calendar" (.ics) download
// Bookings come from bookings.js (localStorage), so this tab shows what the signed-in user actually booked.
// Load order: bookings.js -> favourites.js -> profile.js -> my-events.js

(function () {
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var VIEW_KEY = "mika_my_events_view";

  var SORT_OPTIONS = [
    { value: "recent", label: "Date (Recent)" },   // upcoming soonest first, then past events (newest first)
    { value: "latest", label: "Date (Latest)" },   // furthest in the future first
    { value: "name",   label: "Name (A-Z)" }
  ];

  var EMPTY_MESSAGES = {
    all: "You haven't booked any events yet. Find something you like on the Events page!",
    upcoming: "No upcoming events. Browse events and book something new.",
    attended: "You haven't attended any events yet.",
    saved: "No saved events yet. Tap the heart on an event to save it here."
  };

  var now = new Date();
  var state = {
    filter: "all", sort: "recent", query: "", view: "list",
    calYear: now.getFullYear(), calMonth: now.getMonth(), selected: null   // selected = start of a day (ms)
  };
  var lastFiltered = [];   // what the calendar is currently showing

  /* ---------- small helpers ---------- */

  function $(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function icon(classes) { var i = document.createElement("i"); i.className = classes; i.setAttribute("aria-hidden", "true"); return i; }

  function slugify(name) {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function startOfDay(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function startOfToday() { return startOfDay(Date.now()); }
  function isSameDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }
  function keyOf(ms) { var d = new Date(ms); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }

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

  function bookingsAvailable() { return typeof getBookings === "function"; }

  // an event is "over" once its end time has passed (no end time -> assume it runs 3 hours)
  function isOver(item) {
    if (item.start == null) return false;
    var end = item.end != null ? item.end : item.start + 3 * 60 * 60 * 1000;
    return Date.now() > end;
  }

  function favouritesAvailable() { return typeof getFavourites === "function" && typeof toggleFavourite === "function"; }

  /* ---------- event photos from the Brisbane open data API ---------- */

  var API_BASE = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/";
  var IMAGE_DATASETS = ["creative-events", "music-events", "classes-and-workshops-events"];
  var imageTried = {};   // each booking is looked up at most once per page load

  function isPlaceholder(url) { return !url || url.indexOf("/images/eventcard") !== -1; }

  // look the event up by name in each dataset until one has a photo ("" if none does)
  function fetchEventImage(name, datasets) {
    if (!datasets.length) return Promise.resolve("");
    var safe = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    var url = API_BASE + datasets[0] + "/records?limit=1&where=" + encodeURIComponent('subject="' + safe + '"');
    return fetch(url)
      .then(function (r) { if (!r.ok) throw new Error("bad response"); return r.json(); })
      .then(function (data) {
        var record = (data.results || [])[0];
        var img = record && record["eventimage"];
        return typeof img === "string" && img ? img : fetchEventImage(name, datasets.slice(1));
      })
      .catch(function () { return fetchEventImage(name, datasets.slice(1)); });
  }

  // bookings saved without a real photo get it from the API, then the cards redraw
  function fillMissingImages() {
    if (typeof getBookings !== "function" || typeof updateBooking !== "function" || typeof fetch !== "function") return;
    getBookings().forEach(function (b) {
      if (!isPlaceholder(b.image) || imageTried[b.id]) return;
      imageTried[b.id] = true;
      var order = b.source ? [b.source].concat(IMAGE_DATASETS.filter(function (d) { return d !== b.source; })) : IMAGE_DATASETS;
      fetchEventImage(b.name, order).then(function (url) { if (url) updateBooking(b.id, { image: url }); });
    });
  }

  /* ---------- data ---------- */

  // The signed-in user's bookings + any saved events (e.g. hearted on the browsing page), de-duplicated
  function buildItems() {
    var favs = favouritesAvailable() ? getFavourites() : [];
    var bookings = bookingsAvailable() ? getBookings() : [];
    var favBySlug = {};
    favs.forEach(function (f) { if (f.slug) favBySlug[f.slug] = f; });

    var items = [];
    var usedFavIds = {};

    bookings.forEach(function (b) {
      var slug = b.slug || slugify(b.name);
      var dateLabel = b.start != null ? formatDate(b.start) : (b.dateLabel || "Date to be confirmed");
      var timeLabel = "";
      if (b.start != null && b.start !== startOfDay(b.start)) {
        timeLabel = formatTime(b.start) + (b.end != null ? " \u2013 " + formatTime(b.end) : "");
      }
      // if the same event is also hearted, reuse that favourite so the heart shows as filled
      var fav = favBySlug[slug] || {
        id: "booking-" + b.id, name: b.name, slug: slug, venue: b.venue,
        date: dateLabel + (timeLabel ? ", " + timeLabel : ""), startTime: b.start,
        categories: [b.category], cost: b.price === "0" ? "Free" : (b.price ? "$" + b.price : "")
      };
      usedFavIds[fav.id] = true;
      items.push({
        id: "booking-" + b.id, name: b.name, slug: slug, source: b.source || "",
        category: b.category || "Event", venue: b.venue,
        start: b.start, end: b.end, image: b.image || "", going: true,
        dateLabel: dateLabel, timeLabel: timeLabel, fav: fav,
        saved: Boolean(favBySlug[slug])
      });
    });

    // saved-only events (not booked)
    favs.forEach(function (f) {
      if (usedFavIds[f.id]) return;
      items.push({
        id: f.id, name: f.name, slug: f.slug || slugify(f.name), source: "",
        category: (f.categories && f.categories[0]) || "Event",
        venue: f.venue, start: f.startTime == null ? null : f.startTime, end: null,
        image: "", going: false, saved: true,
        dateLabel: f.date, timeLabel: "", fav: f
      });
    });

    return items;
  }

  var FILTERS = {
    all:      function () { return true; },
    upcoming: function (i) { return i.start != null && !isOver(i); },
    attended: function (i) { return i.going && isOver(i); },
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
        if (time(a) === Infinity) return 1;
        if (time(b) === Infinity) return -1;
        return time(b) - time(a);
      });
    }
    return copy.sort(function (a, b) {
      var aUp = time(a) >= today, bUp = time(b) >= today;
      if (aUp !== bUp) return aUp ? -1 : 1;
      return aUp ? time(a) - time(b) : time(b) - time(a);
    });
  }

  // "attending" / "attended" for events you're going to, "saved" for the rest
  function statusOf(item) {
    if (item.going) return isOver(item) ? "attended" : "attending";
    return "saved";
  }

  /* ---------- list card ---------- */

  // the pill under each card, worked out from the event's real date/time:
  //   booked:      Today (happening today) / Attending (still to come) / Attended (finished)
  //   saved only:  Today / Upcoming / Past event
  function buildStatusPill(item) {
    var over = isOver(item);
    var today = item.start != null && isSameDay(item.start, Date.now()) && !over;
    var key, label, iconClass = "";

    if (today) { key = "today"; label = "Today"; }
    else if (item.going) {
      key = over ? "attended" : "attending";
      label = over ? "Attended" : "Attending";
      iconClass = "fa-solid fa-check";
    } else if (item.start == null) { key = "saved"; label = "Saved"; iconClass = "fa-solid fa-heart"; }
    else { key = over ? "past" : "upcoming"; label = over ? "Past event" : "Upcoming"; }

    var pill = el("span", "event-status " + key);
    if (iconClass) { pill.appendChild(icon(iconClass)); pill.appendChild(document.createTextNode(" ")); }
    pill.appendChild(document.createTextNode(label));
    return pill;
  }

  function buildCard(item) {
    var card = el("article", "browseevent-card");
    card.dataset.id = item.id;

    var frame = el("div", "browseevent-card__frame");
    if (item.image) {
      var img = document.createElement("img");
      img.src = item.image;
      img.alt = item.name;
      img.addEventListener("error", function () { img.remove(); frame.classList.add("no-image"); });
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

    content.appendChild(buildStatusPill(item));

    card.appendChild(content);
    return card;
  }

  /* ---------- calendar ---------- */

  function eventsByDay(items) {
    var map = {};
    items.forEach(function (i) {
      if (i.start == null) return;
      var k = keyOf(i.start);
      (map[k] = map[k] || []).push(i);
    });
    Object.keys(map).forEach(function (k) { map[k].sort(function (a, b) { return a.start - b.start; }); });
    return map;
  }

  function setSelected(ms) {
    state.selected = startOfDay(ms);
    var d = new Date(ms);
    state.calYear = d.getFullYear();
    state.calMonth = d.getMonth();
    renderCalendar();
  }

  // after moving to another month: keep today if it's in that month, else the first day with events, else the 1st
  function moveMonth(delta) {
    var d = new Date(state.calYear, state.calMonth + delta, 1);
    state.calYear = d.getFullYear();
    state.calMonth = d.getMonth();

    var today = new Date();
    if (today.getFullYear() === state.calYear && today.getMonth() === state.calMonth) {
      state.selected = startOfToday();
    } else {
      var map = eventsByDay(lastFiltered);
      var daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
      var pick = 1;
      for (var day = 1; day <= daysInMonth; day++) {
        if (map[state.calYear + "-" + state.calMonth + "-" + day]) { pick = day; break; }
      }
      state.selected = new Date(state.calYear, state.calMonth, pick).getTime();
    }
    renderCalendar();
  }

  function buildCell(date, inMonth, events) {
    var btn = el("button", "cal-cell");
    btn.type = "button";
    var ms = date.getTime();
    var isToday = isSameDay(ms, Date.now());
    var isSelected = state.selected != null && isSameDay(ms, state.selected);

    if (!inMonth) btn.classList.add("is-outside");
    if (isToday) btn.classList.add("is-today");
    if (isSelected) btn.classList.add("is-selected");
    btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
    btn.setAttribute("aria-label", FULL_DAYS[date.getDay()] + " " + date.getDate() + " " + FULL_MONTHS[date.getMonth()] +
      (events.length ? ", " + events.length + (events.length === 1 ? " event" : " events") : ""));

    btn.appendChild(el("span", "cal-cell__num", String(date.getDate())));

    var list = el("span", "cal-cell__events");
    events.slice(0, 2).forEach(function (ev) {
      list.appendChild(el("span", "cal-ev is-" + statusOf(ev), ev.name));
    });
    if (events.length > 2) list.appendChild(el("span", "cal-more", "+" + (events.length - 2) + " more"));
    btn.appendChild(list);

    btn.addEventListener("click", function () { setSelected(ms); });
    return btn;
  }

  function renderCalendarGrid(map) {
    var grid = $("cal-grid");
    var title = $("cal-title");
    if (!grid) return;

    if (title) title.textContent = FULL_MONTHS[state.calMonth] + " " + state.calYear;

    var first = new Date(state.calYear, state.calMonth, 1);
    var offset = (first.getDay() + 6) % 7;                                   // Monday first
    var daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
    var rows = Math.ceil((offset + daysInMonth) / 7);

    grid.innerHTML = "";
    for (var i = 0; i < rows * 7; i++) {
      var date = new Date(state.calYear, state.calMonth, 1 - offset + i);
      var inMonth = date.getMonth() === state.calMonth;
      grid.appendChild(buildCell(date, inMonth, map[keyOf(date.getTime())] || []));
    }
  }

  function buildPanelEvent(ev) {
    var box = el("div", "cal-event");

    var top = el("div", "cal-event__top");
    var thumb = el("div", "cal-event__thumb");
    if (ev.image) {
      var img = document.createElement("img");
      img.src = ev.image; img.alt = "";
      img.addEventListener("error", function () { img.remove(); });
      thumb.appendChild(img);
    }
    top.appendChild(thumb);
    var titles = el("div", "cal-event__titles");
    titles.appendChild(el("span", "category " + slugify(ev.category), ev.category));
    titles.appendChild(el("h4", "", ev.name));
    top.appendChild(titles);
    box.appendChild(top);

    var timeText = ev.timeLabel || (ev.start != null && ev.start !== startOfDay(ev.start) ? formatTime(ev.start) : "");
    if (timeText) {
      var t = el("p", "cal-event__detail");
      t.appendChild(icon("fa-regular fa-clock"));
      t.appendChild(el("span", "", timeText));
      box.appendChild(t);
    }
    var v = el("p", "cal-event__detail");
    v.appendChild(icon("fa-solid fa-location-dot"));
    v.appendChild(el("span", "", ev.venue));
    box.appendChild(v);

    var actions = el("div", "cal-event__actions");
    var status = statusOf(ev);
    var pill = el("span", "cal-status is-" + status);
    if (status !== "saved") pill.appendChild(icon("fa-solid fa-check"));
    pill.appendChild(document.createTextNode(status === "attending" ? " Attending" : status === "attended" ? " Attended" : "Saved"));
    actions.appendChild(pill);

    var view = el("a", "cal-btn", "View Event");
    view.href = "bookingsPage.html?event=" + encodeURIComponent(ev.slug) +
      (ev.source ? "&source=" + encodeURIComponent(ev.source) : "");
    actions.appendChild(view);

    var heart = el("button", "cal-heart" + (ev.saved ? " is-active" : ""));
    heart.type = "button";
    heart.setAttribute("aria-pressed", ev.saved ? "true" : "false");
    heart.setAttribute("aria-label", (ev.saved ? "Remove " : "Save ") + ev.name + (ev.saved ? " from" : " to") + " favourites");
    heart.appendChild(icon(ev.saved ? "fa-solid fa-heart" : "fa-regular fa-heart"));
    heart.addEventListener("click", function () { if (favouritesAvailable()) toggleFavourite(ev.fav); });
    actions.appendChild(heart);
    box.appendChild(actions);

    return box;
  }

  function renderCalendarPanel(map) {
    var panel = $("calendar-panel");
    if (!panel) return;
    panel.innerHTML = "";

    var sel = new Date(state.selected);
    panel.appendChild(el("p", "calendar-panel__label", "SELECTED DAY"));
    panel.appendChild(el("h3", "calendar-panel__date", FULL_DAYS[sel.getDay()] + ", " + sel.getDate() + " " + FULL_MONTHS[sel.getMonth()]));
    if (isSameDay(state.selected, Date.now())) panel.appendChild(el("span", "cal-today-pill", "Today"));

    var dayEvents = map[keyOf(state.selected)] || [];
    if (dayEvents.length) {
      dayEvents.forEach(function (ev) { panel.appendChild(buildPanelEvent(ev)); });
    } else {
      var empty = el("div", "cal-empty");
      empty.appendChild(el("p", "", "No events on this day."));
      var find = el("a", "cal-link", "Find events to go to");
      find.href = "browsingPage.html";
      empty.appendChild(find);
      panel.appendChild(empty);
    }

    // coming up: the next three upcoming events (not on the selected day)
    var upcoming = lastFiltered.filter(function (i) {
      return i.start != null && !isOver(i) && !isSameDay(i.start, state.selected);
    }).sort(function (a, b) { return a.start - b.start; }).slice(0, 3);

    if (upcoming.length) {
      panel.appendChild(el("p", "calendar-panel__label", "COMING UP"));
      var list = el("div", "cal-upcoming");
      upcoming.forEach(function (ev) {
        var d = new Date(ev.start);
        var row = el("button", "cal-row");
        row.type = "button";
        var block = el("span", "cal-row__date");
        block.appendChild(el("strong", "", String(d.getDate())));
        block.appendChild(el("small", "", MONTHS[d.getMonth()].toUpperCase()));
        row.appendChild(block);

        var text = el("span", "cal-row__text");
        text.appendChild(el("span", "cal-row__title", ev.name));
        var status = statusOf(ev);
        var parts = [DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()]];
        if (ev.start !== startOfDay(ev.start)) parts.push(formatTime(ev.start));
        parts.push(status === "attending" ? "Attending" : "Saved");
        text.appendChild(el("span", "cal-row__sub", parts.join(" \u00B7 ")));
        row.appendChild(text);

        row.addEventListener("click", function () { setSelected(ev.start); });
        list.appendChild(row);
      });
      panel.appendChild(list);
    }

    // add to my calendar (.ics)
    var addBtn = el("button", "cal-add");
    addBtn.type = "button";
    addBtn.appendChild(icon("fa-regular fa-calendar-plus"));
    addBtn.appendChild(document.createTextNode(" Add to my calendar"));
    var exportable = exportItems();
    if (!exportable.length) {
      addBtn.disabled = true;
      addBtn.title = "Nothing upcoming to add yet";
    }
    addBtn.addEventListener("click", downloadIcs);
    panel.appendChild(addBtn);
  }

  function renderCalendar() {
    var map = eventsByDay(lastFiltered);
    if (state.selected == null) state.selected = startOfToday();
    renderCalendarGrid(map);
    renderCalendarPanel(map);
  }



  /* ---------- render ---------- */

  function render() {
    var grid = $("my-events-grid");
    var empty = $("my-events-empty");
    if (!grid) return;

    var items = buildItems();
    fillMissingImages();

    // live counts on the filter buttons (not affected by the search box)
    document.querySelectorAll(".event-filters .filter").forEach(function (btn) {
      var name = btn.dataset.filter;
      var count = items.filter(FILTERS[name]).length;
      var span = btn.querySelector("span");
      if (span) span.textContent = count;
      btn.classList.toggle("active", name === state.filter);
      btn.setAttribute("aria-pressed", name === state.filter ? "true" : "false");
    });

    // the filter buttons + search apply to both views
    lastFiltered = items.filter(FILTERS[state.filter]).filter(function (i) { return matchesQuery(i, state.query); });

    // view toggle
    var calendar = $("my-calendar");
    var isCalendar = state.view === "calendar";
    document.querySelectorAll(".view-toggle__btn").forEach(function (btn) {
      var active = btn.dataset.view === state.view;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    grid.hidden = isCalendar;
    if (calendar) calendar.hidden = !isCalendar;

    if (isCalendar) {
      if (empty) empty.hidden = true;
      renderCalendar();
      return;
    }

    var shown = sortItems(lastFiltered, state.sort);
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

    document.addEventListener("click", function (e) {
      if (!root.contains(e.target) && !menu.hidden) close(false);
    });

    paint();
  }

  /* ---------- start-up ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    if (!$("my-events-grid")) return;

    // remembered List / Calendar choice
    try {
      var saved = localStorage.getItem(VIEW_KEY);
      if (saved === "calendar" || saved === "list") state.view = saved;
    } catch (e) { /* storage blocked: stay on the list */ }

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

    // sort dropdown (affects the List view)
    var sortRoot = $("sort-dropdown");
    if (sortRoot) createDropdown(sortRoot, SORT_OPTIONS, state.sort, function (value) {
      state.sort = value;
      render();
    });

    // List / Calendar toggle
    document.querySelectorAll(".view-toggle__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.view = btn.dataset.view;
        try { localStorage.setItem(VIEW_KEY, state.view); } catch (e) { /* ignore */ }
        render();
      });
    });

    // calendar navigation
    var prev = $("cal-prev"), next = $("cal-next"), today = $("cal-today");
    if (prev) prev.addEventListener("click", function () { moveMonth(-1); });
    if (next) next.addEventListener("click", function () { moveMonth(1); });
    if (today) today.addEventListener("click", function () { setSelected(Date.now()); });

    // hearts toggled anywhere (this tab, Favourites tab) refresh the counts and the views
    document.addEventListener("favourites-changed", render);
    document.addEventListener("bookings-changed", render);

    // bookings made in another tab, coming back to this tab, and time passing
    // (an event flips from Attending to Attended once it ends) all refresh the page
    window.addEventListener("storage", function (e) {
      if (!e.key || e.key === "mika_bookings" || e.key === "mika_favourites" || e.key === "mika_current_user") render();
    });
    window.addEventListener("pageshow", render);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) render(); });
    setInterval(render, 60 * 1000);

    render();
  });
})();