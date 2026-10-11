// favourites.js
// Saves favourited events in localStorage so they survive page changes.
// Load this BEFORE api-events.js on every page that shows event cards.

var FAV_KEY = "mika_favourites";

var FAV_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// "Sunday, 11 October 2026, 10:15am - 4:45pm" -> milliseconds (or null if it can't be read)
function parseDateLabel(label) {
  if (!label) return null;
  var m = String(label).match(/(\d{1,2})\s+([A-Za-z]{3,})\w*\s+(\d{4})/);
  if (!m) return null;
  var month = FAV_MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
  if (month === -1) return null;
  var hours = 0, minutes = 0;
  var t = String(label).match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
  if (t) {
    hours = parseInt(t[1], 10) % 12 + (t[3].toLowerCase() === "pm" ? 12 : 0);
    minutes = parseInt(t[2], 10);
  }
  return new Date(parseInt(m[3], 10), month, parseInt(m[1], 10), hours, minutes).getTime();
}

// "clock-tower-tour" -> "Clock Tower Tour"
function titleFromSlug(slug) {
  return String(slug || "").split("-").filter(Boolean).map(function (w) {
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(" ");
}

// Fills in anything missing from a saved event (older saves, other field names),
// so the profile page never shows a blank title / no category / no date badge.
function normaliseFavourite(ev) {
  var out = Object.assign({}, ev);
  out.name = ev.name || ev.title || ev.subject || titleFromSlug(ev.slug) || "Untitled event";
  out.venue = ev.venue || ev.location || "";
  out.date = ev.date || ev.formatteddatetime || ev.start_datetime || "";
  out.slug = ev.slug || out.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
  localStorage.setItem(FAV_KEY, JSON.stringify(list));
}

function isFavourite(id) {
  return getFavourites().some(function (f) { return f.id === id; });
}

// add the event if it isn't saved, remove it if it is. Returns true if now saved.
function toggleFavourite(ev) {
  var list = getFavourites();
  var index = list.findIndex(function (f) { return f.id === ev.id; });

  if (index > -1) {
    list.splice(index, 1);
  } else {
    list.push(ev);   // the whole event is saved, so the profile page needs no extra fetch
  }

  saveFavourites(list);
  document.dispatchEvent(new CustomEvent("favourites-changed"));
  return index === -1;
}

function removeFavourite(id) {
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