// profile.js
// profilePage.html: tab switching, Favourites list and Settings form.
// Needs favourites.js loaded first.

var SETTINGS_KEY = "mika_settings";
var DEFAULT_SETTINGS = {
  fullName: "John Doe",
  email: "johnd@gmail.com",
  location: "Brisbane, Queensland (default)",
  preferences: [],
  notifications: { reminders: true, newEvents: false, digest: false }
};

/* ---------- small helpers ---------- */

// create an element with optional class + text (textContent keeps API data safe)
function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(classes) {
  var i = document.createElement("i");
  i.className = classes;
  return i;
}

/* ---------- tabs ---------- */

function showTab(tab) {
  document.querySelectorAll("[data-tab-panel]").forEach(function (panel) {
    panel.hidden = panel.dataset.tabPanel !== tab;
  });
  document.querySelectorAll(".profile-nav-item").forEach(function (item) {
    item.classList.toggle("active", item.dataset.tab === tab);
  });
  if (tab === "favourites") renderFavourites();
}

/* ---------- favourites ---------- */

function buildFavouriteItem(ev) {
  var link = "bookingsPage.html?event=" + encodeURIComponent(ev.slug || "");
  var item = el("article", "fav-item");

  // image area with date badge
  var image = el("a", "fav-item__image");
  image.href = link;
  image.setAttribute("aria-label", "View " + ev.name);
  if (ev.startTime != null && isFinite(ev.startTime)) {
    var d = new Date(ev.startTime);
    var badge = el("div", "fav-item__badge");
    badge.appendChild(el("strong", "", String(d.getDate())));
    badge.appendChild(el("span", "", d.toLocaleDateString("en-AU", { month: "short" }).toUpperCase()));
    image.appendChild(badge);
  }
  item.appendChild(image);

  // main details
  var body = el("div", "fav-item__body");
  body.appendChild(el("h3", "fav-item__title", ev.name));

  var tags = el("div", "fav-item__tags");
  (ev.categories || []).forEach(function (c) { tags.appendChild(el("span", "category", c)); });
  body.appendChild(tags);

  var dateLine = el("p", "fav-item__detail");
  dateLine.appendChild(icon("fa-regular fa-calendar"));
  dateLine.appendChild(el("span", "", ev.date));
  body.appendChild(dateLine);

  var venueLine = el("p", "fav-item__detail");
  venueLine.appendChild(icon("fa-solid fa-location-dot"));
  venueLine.appendChild(el("span", "", ev.venue));
  body.appendChild(venueLine);

  if (ev.cost) {
    var costLine = el("p", "fav-item__detail");
    costLine.appendChild(icon("fa-solid fa-ticket"));
    costLine.appendChild(el("span", "", ev.cost));
    body.appendChild(costLine);
  }
  item.appendChild(body);

  // saved / remove / view event
  var actions = el("div", "fav-item__actions");
  var saved = el("div", "fav-item__saved");
  var savedLabel = el("span", "fav-item__saved-label");
  savedLabel.appendChild(icon("fa-solid fa-heart"));
  savedLabel.appendChild(document.createTextNode(" Saved"));
  saved.appendChild(savedLabel);

  var removeBtn = el("button", "fav-item__remove");
  removeBtn.type = "button";
  removeBtn.appendChild(icon("fa-regular fa-trash-can"));
  removeBtn.appendChild(document.createTextNode(" Remove"));
  removeBtn.addEventListener("click", function () { removeFavourite(ev.id); });
  saved.appendChild(removeBtn);
  actions.appendChild(saved);

  var view = el("a", "fav-item__view");
  view.href = link;
  view.appendChild(document.createTextNode("View Event "));
  view.appendChild(icon("fa-solid fa-chevron-right"));
  actions.appendChild(view);

  item.appendChild(actions);
  return item;
}

function renderFavourites() {
  var list = document.getElementById("favourites-list");
  var empty = document.getElementById("favourites-empty");
  var filter = document.getElementById("favourites-filter");
  if (!list) return;

  if (typeof getFavourites !== "function") {
    console.error("favourites.js didn't load - check the <script> path in profilePage.html");
    if (empty) { empty.hidden = false; empty.textContent = "Favourites couldn't load (favourites.js missing - see console)."; }
    return;
  }

  var favs = getFavourites().sort(function (a, b) {
    // Infinity is stored as null in JSON, so treat null as "no date" (last)
    var aTime = a.startTime == null ? Infinity : a.startTime;
    var bTime = b.startTime == null ? Infinity : b.startTime;
    return aTime - bTime;
  });

  // rebuild the category filter from what's actually saved, keeping the current choice
  var current = filter ? filter.value : "all";
  if (filter) {
    var cats = [];
    favs.forEach(function (ev) {
      (ev.categories || []).forEach(function (c) { if (cats.indexOf(c) === -1) cats.push(c); });
    });
    filter.innerHTML = "";
    var allOpt = el("option", "", "All");
    allOpt.value = "all";
    filter.appendChild(allOpt);
    cats.forEach(function (c) {
      var opt = el("option", "", c);
      opt.value = c;
      filter.appendChild(opt);
    });
    filter.value = cats.indexOf(current) > -1 ? current : "all";
    current = filter.value;
  }

  var shown = favs.filter(function (ev) {
    return current === "all" || (ev.categories || []).indexOf(current) > -1;
  });

  list.innerHTML = "";
  shown.forEach(function (ev) { list.appendChild(buildFavouriteItem(ev)); });

  if (empty) {
    empty.hidden = shown.length > 0;
    empty.textContent = favs.length === 0
      ? "No favourites yet. Tap the heart on an event to save it here."
      : "No saved events in this category.";
  }
}

/* ---------- settings ---------- */

function loadSettings() {
  try {
    var saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (saved) {
      return {
        fullName: saved.fullName || DEFAULT_SETTINGS.fullName,
        email: saved.email || DEFAULT_SETTINGS.email,
        location: saved.location || DEFAULT_SETTINGS.location,
        preferences: Array.isArray(saved.preferences) ? saved.preferences : [],
        notifications: Object.assign({}, DEFAULT_SETTINGS.notifications, saved.notifications)
      };
    }
  } catch (e) { /* fall through to defaults */ }
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

// greeting at the top of the page follows the saved name/email
function updateGreeting(settings) {
  var firstName = settings.fullName.trim().split(/\s+/)[0] || "there";
  var greeting = document.getElementById("profile-greeting");
  var bio = document.getElementById("profile-email");
  if (greeting) greeting.textContent = "Hi, " + firstName;
  if (bio) bio.textContent = settings.email;
}

function fillSettingsForm(settings) {
  document.getElementById("setting-name").value = settings.fullName;
  document.getElementById("setting-email").value = settings.email;
  document.getElementById("setting-location").value = settings.location;

  document.querySelectorAll('input[name="pref"]').forEach(function (box) {
    box.checked = settings.preferences.indexOf(box.value) > -1;
  });
  document.querySelectorAll('input[name="notify"]').forEach(function (box) {
    box.checked = Boolean(settings.notifications[box.value]);
  });
}

function setSettingsMessage(text, isError) {
  var msg = document.getElementById("settings-message");
  if (!msg) return;
  msg.textContent = text;
  msg.classList.toggle("is-error", Boolean(isError));
}

function saveSettingsFromForm() {
  var name = document.getElementById("setting-name").value.trim();
  var email = document.getElementById("setting-email").value.trim();
  var location = document.getElementById("setting-location").value.trim();

  if (!name) { setSettingsMessage("Please enter your full name.", true); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setSettingsMessage("Please enter a valid email address.", true); return; }

  var settings = {
    fullName: name,
    email: email,
    location: location || DEFAULT_SETTINGS.location,
    preferences: Array.prototype.map.call(
      document.querySelectorAll('input[name="pref"]:checked'), function (b) { return b.value; }),
    notifications: {}
  };
  document.querySelectorAll('input[name="notify"]').forEach(function (box) {
    settings.notifications[box.value] = box.checked;
  });

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  updateGreeting(settings);
  setSettingsMessage("Settings saved.", false);
}

function setUpSettings() {
  var form = document.getElementById("settings-form");
  if (!form) return;

  var settings = loadSettings();
  fillSettingsForm(settings);
  updateGreeting(settings);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    saveSettingsFromForm();
  });

  // "Clear all filters" untick every event preference
  var clear = document.getElementById("clear-prefs");
  if (clear) clear.addEventListener("click", function (e) {
    e.preventDefault();
    document.querySelectorAll('input[name="pref"]').forEach(function (b) { b.checked = false; });
  });

  // log out (mock login only stores users in localStorage, so just go back to login)
  var logout = document.getElementById("logout-btn");
  if (logout) logout.addEventListener("click", function () { window.location.href = "loginpage.html"; });

  // delete everything this site stored in the browser
  var del = document.getElementById("delete-data-btn");
  if (del) del.addEventListener("click", function () {
    if (!confirm("This clears your saved settings, favourites and mock account from this browser. Continue?")) return;
    ["mika_settings", "mika_favourites", "mika_users"].forEach(function (k) { localStorage.removeItem(k); });
    fillSettingsForm(DEFAULT_SETTINGS);
    updateGreeting(DEFAULT_SETTINGS);
    renderFavourites();
    setSettingsMessage("Your saved data has been cleared.", false);
  });
}

/* ---------- start-up ---------- */

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".profile-nav-item").forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      showTab(item.dataset.tab);
      history.replaceState(null, "", "#" + item.dataset.tab);
    });
  });

  // "Edit Profile" button jumps to Settings
  var editBtn = document.querySelector(".edit-profile");
  if (editBtn) editBtn.addEventListener("click", function () {
    showTab("settings");
    var name = document.getElementById("setting-name");
    if (name) name.focus();
  });

  // Favourites filter + live updates when a favourite is removed
  var filter = document.getElementById("favourites-filter");
  if (filter) filter.addEventListener("change", renderFavourites);
  document.addEventListener("favourites-changed", renderFavourites);

  setUpSettings();

  // open the right tab from the URL: profilePage.html#favourites / #settings
  var hash = location.hash.replace("#", "");
  showTab(["events", "favourites", "settings"].indexOf(hash) > -1 ? hash : "events");
});