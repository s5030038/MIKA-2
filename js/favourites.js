// favourites.js
// Saves favourited events in localStorage so they survive page changes.
// Load this BEFORE profile.js / my-events.js on the profile page, and before script.js
// or the api-*.js files on any page that shows a heart / Save button.
//
// A saved favourite looks like:
//   { id, name, title, slug, venue, date, startTime, categories, category, cost, image }
// (older saves from the booking page used title / category / price - normaliseFavourite() handles those)

var FAV_KEY = "mika_favourites";

var FAV_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// "Sunday, 11 October 2026, 10:15am - 4:45pm" or "Sun, 27 Sep, 8PM" -> milliseconds (or null)
function parseDateLabel(label) {
  if (!label) return null;
  var text = String(label);
  var m = text.match(/(\d{1,2})\s+([A-Za-z]{3,})\w*(?:\s+(\d{4}))?/);
  if (!m) return null;
  var month = FAV_MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
  if (month === -1) return null;
  var day = parseInt(m[1], 10);
  var year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
  // no year written and that date is long past -> it must mean next year
  if (!m[3] && new Date(year, month, day).getTime() < Date.now() - 180 * 24 * 60 * 60 * 1000) year++;

  var hours = 0, minutes = 0;
  var t = text.slice(m.index + m[0].length).match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)/i);
  if (t) {
    hours = parseInt(t[1], 10) % 12 + (t[3].toLowerCase() === "pm" ? 12 : 0);
    minutes = t[2] ? parseInt(t[2], 10) : 0;
  }
  return new Date(year, month, day, hours, minutes).getTime();
}

function favSlug(name) {
  return String(name || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// "clock-tower-tour" -> "Clock Tower Tour"
function titleFromSlug(slug) {
  return String(slug || "").split("-").filter(Boolean).map(function (w) {
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(" ");
}

// "20" -> "$20", "0" -> "Free", "AU$20.00" / "Free" stay as they are
function formatCost(value) {
  if (value == null || value === "") return "";
  var s = String(value).trim();
  if (s === "0") return "Free";
  if (/^\d+(\.\d+)?$/.test(s)) return "$" + s;
  return s;
}

// Fills in anything missing from a saved event (older saves, other field names),
// so the profile page never shows a blank title, no id, no photo or no date badge.
function normaliseFavourite(ev) {
  var out = Object.assign({}, ev);

  out.name = ev.name || ev.title || ev.subject || titleFromSlug(ev.slug) || "Untitled event";
  out.title = out.name;                                   // script.js matches favourites by title
  out.venue = ev.venue || ev.location || "";
  out.date = ev.date || ev.formatteddatetime || ev.start_datetime || "";
  out.slug = ev.slug || favSlug(out.name);
  out.id = ev.id || out.slug;                             // saves from the booking page had no id
  out.image = ev.image || "";
  out.cost = ev.cost || formatCost(ev.price);

  out.categories = Array.isArray(ev.categories) && ev.categories.length
    ? ev.categories
    : (ev.category ? [ev.category] : []);

  if (out.startTime == null || !isFinite(out.startTime)) {
    var parsed = parseDateLabel(out.date);
    out.startTime = parsed == null ? null : parsed;
  }
  return out;
}

// read the saved list (always returns an array, even if storage is empty/corrupt)
function getFavourites() {
  try {
    var list = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    return Array.isArray(list) ? list.filter(Boolean).map(normaliseFavourite) : [];
  } catch (e) {
    return [];
  }
}

function saveFavourites(list) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("[favourites] couldn't save:", e);
  }
}

function isFavourite(id) {
  return getFavourites().some(function (f) { return f.id === id; });
}

// add the event if it isn't saved, remove it if it is. Returns true if now saved.
function toggleFavourite(ev) {
  var item = normaliseFavourite(ev);                      // same id rules as the saved list
  var list = getFavourites();
  var index = list.findIndex(function (f) { return f.id === item.id; });

  if (index > -1) {
    list.splice(index, 1);
  } else {
    list.push(item);   // the whole event is saved, so the profile page needs no extra fetch
  }

  saveFavourites(list);
  document.dispatchEvent(new CustomEvent("favourites-changed"));
  return index === -1;
}

// remove ONE favourite. Does nothing if the id is missing, so it can never wipe the whole list.
function removeFavourite(id) {
  if (id == null || id === "") return;
  saveFavourites(getFavourites().filter(function (f) { return f.id !== id; }));
  document.dispatchEvent(new CustomEvent("favourites-changed"));
}

// update a heart button to match saved / not saved
function setHeart(btn, on) {
  btn.textContent = on ? "♥" : "♡";
  btn.classList.toggle("is-active", on);
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  btn.setAttribute("aria-label", on ? "Remove from favourites" : "Add to favourites");
}