// Saves favourited events in localStorage so they survive page changes.

var FAV_KEY = "mika_favourites";

// read the saved list (always returns an array, even if storage is empty/corrupt)
function getFavourites() {
  try {
    var list = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    return Array.isArray(list) ? list : [];
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