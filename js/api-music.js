// Loads events from the Brisbane City Council "music-events" dataset and
// renders them as cards. 
// Uses the older global-function style: all functions and variables are global, so they can clash
// with the same names in other api-*-events.js files loaded on the same page.

// change event name into URL safe identifier
function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")   // replace anything non-alphanumeric with a dash
    .replace(/(^-|-$)/g, "");      // trim leading/trailing dashes
}

function parsePrice(cost) {
  if (!cost) return "";
  if (/^free/i.test(cost.trim())) return "0";
  var match = cost.match(/\$\s*(\d+(?:\.\d+)?)/);
  return match ? match[1] : "";
}
 
function splitDateTime(formatted) {
  var match = formatted.match(/^(.*?\d{4}),\s*(.+)$/);
  if (!match) return { datePart: formatted, timePart: "" };
  return { datePart: match[1].trim(), timePart: match[2].trim() };
}
 
// some fields are a list in one dataset and a single string in another;
// this turns either into a plain array
function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}
 
/*- for icons -*/
function getDateBadge(startIso) {
  if (!startIso) return null;
  var d = new Date(startIso);
  if (isNaN(d)) return null;
 
  var parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    day: "numeric",
    month: "short"
  }).formatToParts(d);
 
  return {
    day: parts.find(function (p) { return p.type === "day"; }).value,
    month: parts.find(function (p) { return p.type === "month"; }).value.toUpperCase()
  };
}
 
// "2026-10-13" in Brisbane time, used by the search bar's date filter
function getBrisbaneDay(startIso) {
  var d = new Date(startIso);
  if (!startIso || isNaN(d)) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(d);
}
 
// suburb if the dataset has one, otherwise the part after the last comma of the location
function getSuburb(record) {
  var explicit = record["suburb"] || record["venue_suburb"] || record["locality"];
  if (explicit) return explicit;
 
  var loc = record["location"] || "";
  var parts = loc.split(",");
  return parts.length > 1 ? parts[parts.length - 1].trim() : loc.trim();
}
 
var ICONS = {
  calendar: "fa-regular fa-calendar",
  clock: "fa-regular fa-clock",
  pin: "fa-solid fa-location-dot"
};
 
// one icon + one line of text, using the shared .event-detail style
function createInfoRow(iconClass, text) {
  var row = document.createElement("div");
  row.className = "event-detail";
 
  var icon = document.createElement("i");
  icon.className = iconClass;
  icon.setAttribute("aria-hidden", "true");
 
  var span = document.createElement("span");
  span.textContent = text; // API text stays plain text
 
  row.appendChild(icon);
  row.appendChild(span);
  return row;
}

function createMusicEventCard(record) {
  var name = record["subject"];
  var venue = record["location"];
  var date = record["formatteddatetime"] || record["start_datetime"];


  // skip incomplete records instead of showing broken card
  if (!name || !venue || !date) return null;

  var slug = slugify(name);

  var cost = record["cost"] || "";
  var category = "Music";   // every event in this dataset is a music event
  var ages = toList(record["agerange"] || record["age"]);

  var article = document.createElement("article");
  article.className = "browseevent-card";
  article.dataset.name = name;
  article.dataset.venue = venue;
  article.dataset.date = date;
  article.dataset.category = category;
  article.dataset.cost = cost;
  article.dataset.source = "api";
  article.dataset.dataset = "music-events";
  article.dataset.start = record["start_datetime"] || "";
  article.dataset.price = parsePrice(cost);
  article.dataset.ages = ages.join("|");
  article.dataset.day = getBrisbaneDay(record["start_datetime"]);
  article.dataset.suburb = getSuburb(record);
  article.dataset.bookings =
    record["bookingsrequired"] === "Yes" ? "required" :
    record["bookingsrequired"] === "No" ? "walkin" : "";

  article.innerHTML =
    '<a href="bookingsPage.html?event=' + encodeURIComponent(slug) + '&source=music-events" class="browseevent-card__link">' +
      '<div class="browseevent-card__frame"></div>' +
      '<span class="category"></span>' +
      '<h3 class="browseevent-card__title"></h3>' +
      '<div class="browseevent-card__info"></div>' +
    '</a>';

  var link = article.querySelector(".browseevent-card__link");
  link.addEventListener("click", function () {
    localStorage.setItem("mika_current_event", JSON.stringify({
      name: name,
      venue: venue,
      date: date,
      price: parsePrice(cost) || "0",
      image: img ? img.src : "../images/eventcard1.png",
      category: category
    }));
  });

  // category pill
  var pill = article.querySelector(".category");
  if (category) {
    pill.textContent = category;
  } else {
    pill.remove();
  }

  // textContent (not innerHTML) so data from the API can't inject HTML
  article.querySelector(".browseevent-card__title").textContent = name;

  // date row, time row (if the event has one), venue row
  var dt = splitDateTime(date);
  var info = article.querySelector(".browseevent-card__info");
  info.appendChild(createInfoRow(ICONS.calendar, dt.datePart));
  if (dt.timePart) info.appendChild(createInfoRow(ICONS.clock, dt.timePart));
  info.appendChild(createInfoRow(ICONS.pin, venue));
 
  // event photo from API
  var imageUrl = record["eventimage"];
  var frame = article.querySelector(".browseevent-card__frame");
  var img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";
  img.src = imageUrl || "../images/eventcard1.png";
  img.onerror = function () {
    img.onerror = null;
    img.src = "../images/eventcard1.png";
  };
 
  frame.appendChild(img);
 
  // date badge on the photo, e.g. 22 / SEP
  var badgeInfo = getDateBadge(record["start_datetime"]);
  if (badgeInfo) {
    var badge = document.createElement("div");
    badge.className = "event-card_date";
 
    var day = document.createElement("strong");
    day.textContent = badgeInfo.day;
 
    var month = document.createElement("span");
    month.textContent = badgeInfo.month;
 
    badge.appendChild(day);
    badge.appendChild(month);
    frame.appendChild(badge);
  }

  return article;
}

function loadMusicEvents() {
  const baseURL = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/music-events/records";
  const requestParams = { limit: 20 };
  // other things you can add to requestParams:
  // order_by: "start_datetime"                 -> soonest first
  const fullURL = baseURL + "?" + new URLSearchParams(requestParams).toString();

  // use a dedicated container if the page has one, otherwise share the browse grid
  const container =
    document.getElementById("music-events") ||
    document.getElementById("browseevents");
  if (!container) return;

  fetch(fullURL)
    .then(function (response) {
      if (!response.ok) throw new Error("API responded with " + response.status);
      return response.json();
    })
    .then(function (data) {
      var records = (data.results || []).filter(function (record) {
        return record["subject"] && record["location"] &&
          (record["formatteddatetime"] || record["start_datetime"]);
      });

      // displays the real field names from the dataset
      if (records.length) console.log("Music event fields:", Object.keys(records[0]));

      // if the page was opened from an event link, show only that event
      var params = new URLSearchParams(window.location.search);
      var selectedEvent = params.get("event");
      var selectedSource = params.get("source");
 
      if (selectedEvent) {
        // the link points at a different dataset, so this one has nothing to show
        if (selectedSource && selectedSource !== "music-events") return;
        records = records.filter(function (record) {
          return slugify(record["subject"]) === selectedEvent;
        });
      }

      records.forEach(function (record) {
        var card = createMusicEventCard(record);
        if (card) container.appendChild(card);
      });

      if (typeof buildVenueFilters === "function") {
        buildVenueFilters(); // venue checkboxes come from the venues actually loaded
      }
      if (typeof applyFiltersAndSort === "function") {
        applyFiltersAndSort();
      }
    })
    .catch(function (error) {
      console.error("Error fetching music events:", error);
    });
}

document.addEventListener("DOMContentLoaded", loadMusicEvents);