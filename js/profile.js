var SETTINGS_KEY = "settings";
var DEFAULT_SETTINGS = {
  fullName: "John Doe",
  email: "jdoe@gmail.com",
  location: "Brisbane, Queensland (default)",
  preferences: [],
  notifications: { eventReminders: true, bookedReminders: true, savedUpdates: true, newEvents: true }
};


// the signed-in account's email (set by bookings.js -> setCurrentUser at login / sign up), or "" for a guest
function currentEmail() {
  return typeof getCurrentUser === "function" ? getCurrentUser() : "";
}

// accounts saved by auth.js (an array; older prototypes used an object keyed by email)
function readAccounts() {
  try {
    var raw = JSON.parse(localStorage.getItem("mika_users") || "[]");
    if (Array.isArray(raw)) return raw;
    return Object.keys(raw || {}).map(function (email) { return Object.assign({ email: email }, raw[email]); });
  } catch (e) { return []; }
}

function findAccount(email) {
  return readAccounts().filter(function (u) { return u && u.email === email; })[0] || null;
}

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


/* show tab function to display tabs that are selected */
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
  // event photo (falls back to the photo saved with a booking of the same event)
  var photo = ev.image || "";
  if (!photo && typeof getBookings === "function") {
    var match = getBookings().filter(function (b) { return b.slug === ev.slug && b.image; })[0];
    if (match) photo = match.image;
  }
  if (photo) {
    var img = document.createElement("img");
    img.src = photo;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", function () { img.remove(); });  // keep the gradient if it fails
    image.appendChild(img);
  }
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

// defaults for the signed-in account: sign up only asks for an email, so the name starts from it
function accountDefaults(account) {
  var base = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  if (!account) return base;
  base.email = account;
  base.fullName = (typeof displayNameFromEmail === "function" && displayNameFromEmail(account)) || DEFAULT_SETTINGS.fullName;
  base.owner = account;
  // the categories picked during onboarding start as the event preferences
  var acct = findAccount(account);
  if (acct && acct.preferences && Array.isArray(acct.preferences.categories)) base.preferences = acct.preferences.categories.slice();
  return base;
}

function loadSettings() {
  var account = currentEmail();
  try {
    var saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");

    if (saved && account) {
      // settings that belong to a different account are not shown to this one
      if (saved.owner && saved.owner !== account) saved = null;
      // old placeholder settings from before sign up existed
      else if (!saved.owner && saved.email === DEFAULT_SETTINGS.email && saved.email !== account) saved = null;
    }

    if (saved) {
      var defaults = accountDefaults(account);
      return {
        fullName: saved.fullName || defaults.fullName,
        email: saved.email || defaults.email,
        location: saved.location || DEFAULT_SETTINGS.location,
        preferences: Array.isArray(saved.preferences) ? saved.preferences : [],   // only used when nobody is signed in
        audiences: Array.isArray(saved.audiences) ? saved.audiences : [],
        notifications: Object.assign({}, DEFAULT_SETTINGS.notifications, saved.notifications),
        dob: saved.dob || "",
        avatar: saved.avatar || "",
        owner: account || saved.owner || ""
      };
    }
  } catch (e) { /* fall through to defaults */ }
  return accountDefaults(account);
}

// greeting at the top of the page follows the saved name/email
function updateGreeting(settings) {
  var firstName = settings.fullName.trim().split(/\s+/)[0] || "there";
  var greeting = document.getElementById("profile-greeting");
  var bio = document.getElementById("profile-email");
  if (greeting) greeting.textContent = "Hi, " + firstName;
  if (bio) bio.textContent = settings.email;

  // photo chosen on the Edit Profile page
  var avatarImg = document.querySelector(".avatar-img");
  if (avatarImg && settings.avatar) avatarImg.src = settings.avatar;
  // a new account that has no photo yet gets the default one, not the previous account's
  var defaultAvatar = "../images/profile-picture.png";
  if (avatarImg && !settings.avatar && avatarImg.getAttribute("src") !== defaultAvatar) avatarImg.src = defaultAvatar;
}

function fillSettingsForm(settings) {
  document.getElementById("setting-name").value = settings.fullName;
  document.getElementById("setting-email").value = settings.email;
  document.getElementById("setting-location").value = settings.location;

  renderPreferenceOptions(loadPreferences(settings));
  document.querySelectorAll('input[name="notify"]').forEach(function (box) {
    box.checked = Boolean(settings.notifications[box.value]);
  });
}

var messageTimer = null;
function setSettingsMessage(text, isError) {
  var msg = document.getElementById("settings-message");
  if (!msg) return;
  msg.textContent = text;
  msg.classList.toggle("is-error", Boolean(isError));
  clearTimeout(messageTimer);
  if (text && !isError) {
    messageTimer = setTimeout(function () { msg.textContent = ""; }, 2500);
  }
}

/* ---------- event preferences (shared with the onboarding page) ---------- */

// The signed-in account's choices from onboarding are the single source of truth.
// With nobody signed in, fall back to what was kept in the local settings.
function loadPreferences(settings) {
  if (currentEmail() && findAccount(currentEmail()) && typeof getUserPreferences === "function") return getUserPreferences();
  return { categories: settings.preferences || [], audiences: settings.audiences || [] };
}

// builds one tick-box per onboarding option, ticked from what the user chose
function renderOptionGroup(containerId, inputName, options, selected) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  options.forEach(function (value) {
    var label = el("label", "settings-check");
    var input = document.createElement("input");
    input.type = "checkbox";
    input.name = inputName;
    input.value = value;
    input.checked = selected.indexOf(value) > -1;
    label.appendChild(input);
    label.appendChild(document.createTextNode(" " + value));
    container.appendChild(label);
  });
}

function renderPreferenceOptions(prefs) {
  var categories = typeof PREFERENCE_CATEGORIES !== "undefined" ? PREFERENCE_CATEGORIES : [];
  var audiences = typeof PREFERENCE_AUDIENCES !== "undefined" ? PREFERENCE_AUDIENCES : [];
  renderOptionGroup("pref-categories", "pref", categories, prefs.categories);
  renderOptionGroup("pref-audiences", "aud", audiences, prefs.audiences);
}

function checkedValues(name) {
  return Array.prototype.map.call(document.querySelectorAll('input[name="' + name + '"]:checked'), function (b) { return b.value; });
}

// saves the tick-boxes straight back into the account, so onboarding and Settings stay in step
function savePreferencesFromForm() {
  var categories = checkedValues("pref");
  var audiences = checkedValues("aud");

  var saved = false;
  if (currentEmail() && findAccount(currentEmail()) && typeof saveUserPreferences === "function") {
    saved = saveUserPreferences(categories, audiences);
  }
  if (!saved) {   // nobody signed in: keep them in the local settings instead
    var settings = loadSettings();
    settings.preferences = categories;
    settings.audiences = audiences;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
  setSettingsMessage("Preferences saved.", false);
}

// reads the whole form and saves it (called automatically whenever something changes)
function saveSettingsFromForm() {
  var name = document.getElementById("setting-name").value.trim();
  var email = document.getElementById("setting-email").value.trim();
  var location = document.getElementById("setting-location").value.trim();

  if (!name) { setSettingsMessage("Please enter your full name.", true); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setSettingsMessage("Please enter a valid email address.", true); return; }

  var settings = loadSettings();   // keeps the photo + date of birth set on the Edit Profile page
  settings.fullName = name;
  settings.email = email;
  settings.location = location || DEFAULT_SETTINGS.location;
  if (currentEmail()) settings.owner = currentEmail();
  settings.notifications = {};
  document.querySelectorAll('input[name="notify"]').forEach(function (box) {
    settings.notifications[box.value] = box.checked;
  });

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  updateGreeting(settings);
  setSettingsMessage("Changes saved.", false);
}

// change password (mock): passwords live in the same localStorage "mika_users" that auth.js uses
function updatePassword() {
  var msg = document.getElementById("password-message");
  var current = document.getElementById("pw-current").value;
  var next = document.getElementById("pw-new").value;
  var confirmPw = document.getElementById("pw-confirm").value;
  var email = currentEmail() || document.getElementById("setting-email").value.trim();

  function fail(text) { msg.textContent = text; msg.classList.add("is-error"); }

  if (next.length < 8) return fail("New password must be at least 8 characters.");
  if (next !== confirmPw) return fail("The new passwords don't match.");

  var users = readAccounts();
  var account = users.filter(function (u) { return u.email === email; })[0];
  if (!account) return fail("Log in with your account to change its password.");
  if (account.password !== current) return fail("Current password is incorrect.");

  account.password = next;
  localStorage.setItem("mika_users", JSON.stringify(users));

  ["pw-current", "pw-new", "pw-confirm"].forEach(function (id) { document.getElementById(id).value = ""; });
  msg.textContent = "Password updated.";
  msg.classList.remove("is-error");
}

function setUpSettings() {
  var form = document.getElementById("settings-form");
  if (!form) return;

  var settings = loadSettings();
  fillSettingsForm(settings);
  updateGreeting(settings);

  // no Save button: any change saves straight away (except the password fields)
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  form.addEventListener("change", function (e) {
    if (e.target.closest("#password-panel")) return;
    if (e.target.name === "pref" || e.target.name === "aud") { savePreferencesFromForm(); return; }
    saveSettingsFromForm();
  });

  // "Clear all filters" unticks every event preference
  var clear = document.getElementById("clear-prefs");
  if (clear) clear.addEventListener("click", function (e) {
    e.preventDefault();
    document.querySelectorAll('input[name="pref"], input[name="aud"]').forEach(function (b) { b.checked = false; });
    savePreferencesFromForm();
  });

  // Change password row opens / closes its panel
  var pwBtn = document.getElementById("change-password-btn");
  var pwPanel = document.getElementById("password-panel");
  if (pwBtn && pwPanel) pwBtn.addEventListener("click", function () {
    pwPanel.hidden = !pwPanel.hidden;
    pwBtn.setAttribute("aria-expanded", pwPanel.hidden ? "false" : "true");
    pwBtn.classList.toggle("is-open", !pwPanel.hidden);
  });

  var pwUpdate = document.getElementById("update-password-btn");
  if (pwUpdate) pwUpdate.addEventListener("click", updatePassword);

  // log out (the mock login only stores users in localStorage, so just go back to login)
  var logout = document.getElementById("logout-btn");
  if (logout) logout.addEventListener("click", function () {
    if (typeof clearCurrentUser === "function") clearCurrentUser();
    window.location.href = "loginpage.html";
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

  // the Logout link in the header dropdown also signs the user out
  document.querySelectorAll('.dropdown-content-profile a[href*="oginPage"], .dropdown-content-profile a[href*="oginpage"]').forEach(function (link) {
    link.addEventListener("click", function () {
      if (typeof clearCurrentUser === "function") clearCurrentUser();
    });
  });

  // "Edit Profile" button opens the Edit Profile page
  var editBtn = document.querySelector(".edit-profile");
  if (editBtn) editBtn.addEventListener("click", function () {
    window.location.href = "editProfilePage.html";
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