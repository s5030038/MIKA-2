// bookings.js
// Shared helpers for "who is signed in" and "what have they booked".
// Load this BEFORE profile.js and my-events.js (profilePage.html), and on bookingsPage.html.
//
// localStorage keys used:
//   mika_current_user   -> (sessionStorage, written by auth.js) the email of the signed-in account
//   mika_bookings       -> (localStorage) every booking made on this browser (each one remembers its user)
//   mika_current_event  -> the event the visitor last clicked (written by the api-*.js files)

var BK_USER_KEY = "mika_current_user";
var BK_BOOKINGS_KEY = "mika_bookings";
var BK_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
var BK_DEFAULT_MS = 3 * 60 * 60 * 1000;   // if an event has no end time, assume it runs 3 hours

/* ---------- signed-in user ---------- */

// auth.js keeps the signed-in email in sessionStorage; "" means nobody is signed in
function getCurrentUser() {
  try { return (sessionStorage.getItem(BK_USER_KEY) || "").trim().toLowerCase(); } catch (e) { return ""; }
}

// auth.js already does this at login / sign up, so you rarely need it
function setCurrentUser(email) {
  try { sessionStorage.setItem(BK_USER_KEY, String(email || "").trim().toLowerCase()); } catch (e) { /* storage blocked */ }
}

// call this on log out
function clearCurrentUser() {
  try {
    sessionStorage.removeItem(BK_USER_KEY);
    sessionStorage.removeItem("mika_current_user_id");
  } catch (e) { /* storage blocked */ }
}

// "jane.doe92@gmail.com" -> "Jane Doe"   (sign up only asks for an email, so the name starts from that)
function displayNameFromEmail(email) {
  var local = String(email || "").split("@")[0];
  var words = local.replace(/[0-9]+/g, " ").split(/[._\-+\s]+/).filter(Boolean);
  return words.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join(" ");
}

/* ---------- dates ---------- */

// "Sunday, 11 October 2026, 10:15am - 4:45pm" -> { start: ms, end: ms | null }
function parseBookingRange(label) {
  var text = String(label || "");
  var m = text.match(/(\d{1,2})\s+([A-Za-z]{3,})\w*(?:\s+(\d{4}))?/);
  if (!m) return { start: null, end: null };
  var month = BK_MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
  if (month === -1) return { start: null, end: null };
  var day = parseInt(m[1], 10);
  var year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
  // no year written (e.g. "Sun, 27 Sep, 8PM"): if that date is long past, it must mean next year
  if (!m[3] && new Date(year, month, day).getTime() < Date.now() - 180 * 24 * 60 * 60 * 1000) year++;

  function toMs(t) {
    var p = t.match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)/i);
    var hours = parseInt(p[1], 10) % 12 + (p[3].toLowerCase() === "pm" ? 12 : 0);
    return new Date(year, month, day, hours, p[2] ? parseInt(p[2], 10) : 0).getTime();
  }

  var times = text.slice(m.index + m[0].length).match(/\d{1,2}(?::\d{2})?\s*[ap]m/ig) || [];
  return {
    start: times[0] ? toMs(times[0]) : new Date(year, month, day).getTime(),
    end: times[1] ? toMs(times[1]) : null
  };
}

// accepts a number (ms), an ISO string or a date label; returns ms or null
function toTimestamp(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return isFinite(value) ? value : null;
  var t = Date.parse(value);
  if (!isNaN(t)) return t;
  return parseBookingRange(value).start;
}

function bookingSlug(name) {
  return String(name || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/* ---------- bookings ---------- */

function readAllBookings() {
  try {
    var list = JSON.parse(localStorage.getItem(BK_BOOKINGS_KEY) || "[]");
    return Array.isArray(list) ? list.filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

function writeAllBookings(list) {
  localStorage.setItem(BK_BOOKINGS_KEY, JSON.stringify(list));
  document.dispatchEvent(new CustomEvent("bookings-changed"));
}

// bookings for whoever is signed in (or the guest bucket if nobody is)
function getBookings() {
  var user = getCurrentUser();
  var all = readAllBookings();

  // Bookings made while nobody was signed in (e.g. the session had ended) join the account
  // as soon as someone is signed in, so they don't vanish from the profile.
  if (user && all.some(function (b) { return !b.userEmail; })) {
    all.forEach(function (b) { if (!b.userEmail) b.userEmail = user; });
    try { localStorage.setItem(BK_BOOKINGS_KEY, JSON.stringify(all)); } catch (e) { /* storage blocked */ }
  }

  return all.filter(function (b) { return (b.userEmail || "") === user; });
}

// Save a booking for the signed-in user.
// ev = { name, venue, category, date (label), start, end, image, price, tickets, total, slug, source }
// Returns the saved booking, or null if the event has no name. Booking the same event twice does nothing.
function addBooking(ev) {
  if (!ev || !ev.name) return null;

  var range = parseBookingRange(ev.date);
  var start = toTimestamp(ev.start);
  if (start == null) start = range.start;
  var end = toTimestamp(ev.end);
  if (end == null) end = range.end;

  var slug = ev.slug || bookingSlug(ev.name);
  var user = getCurrentUser();
  var id = slug + "@" + (start == null ? "undated" : start);

  var all = readAllBookings();
  var existing = all.filter(function (b) { return b.id === id && (b.userEmail || "") === user; })[0];
  if (existing) return existing;

  var booking = {
    id: id,
    userEmail: user,
    slug: slug,
    source: ev.source || "",
    name: ev.name,
    venue: ev.venue || "",
    category: ev.category || "Event",
    start: start,
    end: end,
    dateLabel: ev.date || "",
    image: ev.image || "",
    price: ev.price == null ? "" : String(ev.price),
    tickets: ev.tickets || "",     // e.g. "2x VIP"
    total: ev.total || "",         // e.g. "AU$60.00"
    bookedAt: Date.now()
  };
  all.push(booking);
  writeAllBookings(all);
  return booking;
}

function removeBooking(id) {
  var user = getCurrentUser();
  writeAllBookings(readAllBookings().filter(function (b) {
    return !(b.id === id && (b.userEmail || "") === user);
  }));
}

// change fields on one of the signed-in user's bookings (e.g. fill in an image found later)
function updateBooking(id, fields) {
  var user = getCurrentUser();
  var changed = false;
  var all = readAllBookings();
  all.forEach(function (b) {
    if (b.id === id && (b.userEmail || "") === user) { Object.assign(b, fields); changed = true; }
  });
  if (changed) writeAllBookings(all);
}

// Call this when the booking is confirmed on bookingsPage.html:
// it books whichever event the visitor clicked on (saved by the api-*.js files as "mika_current_event").
function bookCurrentEvent() {
  var current = null;
  try { current = JSON.parse(localStorage.getItem("mika_current_event") || "null"); } catch (e) { /* ignore */ }
  return current ? addBooking(current) : null;
}

/* ---------- event preferences (chosen at onboarding, changeable in Settings) ---------- */

// the same options as onboarding.js, so the onboarding page and the Settings page always match
var PREFERENCE_CATEGORIES = ["Music", "Festivals", "Creative", "Tours", "Exhibitions", "Workshops"];
var PREFERENCE_AUDIENCES = ["Seniors", "Adults (30+)", "Young adults", "Teenagers", "Kids", "Preschool kids", "Infants & toddlers"];

function readUserAccounts() {
  try {
    var raw = JSON.parse(localStorage.getItem("mika_users") || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

// { categories: [...], audiences: [...] } for the signed-in account (empty lists if none)
function getUserPreferences() {
  var email = getCurrentUser();
  var account = readUserAccounts().filter(function (u) { return u && u.email === email; })[0];
  var prefs = (account && account.preferences) || {};
  return {
    categories: Array.isArray(prefs.categories) ? prefs.categories.slice() : [],
    audiences: Array.isArray(prefs.audiences) ? prefs.audiences.slice() : []
  };
}

// saves into the account that onboarding.js wrote to; returns false if nobody is signed in
function saveUserPreferences(categories, audiences) {
  var email = getCurrentUser();
  var users = readUserAccounts();
  var account = users.filter(function (u) { return u && u.email === email; })[0];
  if (!account) return false;
  account.preferences = Object.assign({}, account.preferences, { categories: categories, audiences: audiences });
  localStorage.setItem("mika_users", JSON.stringify(users));
  document.dispatchEvent(new CustomEvent("preferences-changed"));
  return true;
}