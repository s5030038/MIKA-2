// ai was used in this file 
//api-events.js
// Loads events from SEVERAL Brisbane City Council datasets, all built from the same template.
// Every record is tagged with the dataset it came from (record._dataset), so the card and
// popular-card builders stay almost identical to the single-dataset template.
// To add another dataset later, add one line to DATASETS below.
//   forceCategory: (optional) overrides the category pill for EVERY event in that dataset.

var API_BASE_URL = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/";
var PER_DATASET_LIMIT = 20;

var DATASETS = [
  { id: "creative-events",               label: "Creative",               defaultCategory: "Creative" },
  { id: "classes-and-workshops-events",  label: "Classes & Workshops",    defaultCategory: "Workshops" },
  { id: "films-events",                  label: "Films",                  defaultCategory: "Films" },
  { id: "fortitude-valley-malls-events", label: "Fortitude Valley Malls", defaultCategory: "Fortitude Valley" },
  { id: "music-events",                  label: "Music",                  defaultCategory: "Music", forceCategory: "Music" }
];

// fallback pictures when an event has no photo (one per dataset, so the grid has some variety)
var FALLBACK_IMAGES = [
  "../images/eventcard1.png",
  "../images/eventcard2.png",
  "../images/eventcard3.png",
  "../images/eventcard4.png"
];

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

// Some fields are a list in one dataset and a single string in another (e.g. agerange / age).
// This turns either into a plain array.
function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function datasetIndex(dataset) {
  var index = DATASETS.indexOf(dataset);
  return index === -1 ? 0 : index;
}

// the category pill: the dataset's forced category (e.g. Music) if it has one,
// otherwise the record's own type, otherwise the dataset's default
function getCategory(record) {
  var dataset = record._dataset || DATASETS[0];
  return dataset.forceCategory ||
         record["primaryeventtype"] ||
         toList(record["event_type"])[0] ||
         dataset.defaultCategory;
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

// "2026-10-13" in Brisbane time, to match the calendar's day keys
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

function createEventCard(record) {
  var name = record["subject"];
  var venue = record["location"];
  var date = record["formatteddatetime"] || record["start_datetime"];
  var dataset = record._dataset || DATASETS[0];

  // skip incomplete records instead of showing broken card
  if (!name || !venue || !date) return null;

  var slug = slugify(name);

  var cost = record["cost"] || "";
  var category = getCategory(record);
  var ages = toList(record["agerange"] || record["age"]);   // films-events calls it "age"

  var article = document.createElement("article");
  article.className = "browseevent-card";
  article.dataset.name = name;
  article.dataset.venue = venue;
  article.dataset.date = date;
  article.dataset.category = category;
  article.dataset.cost = cost || "";
  article.dataset.source = "api";
  article.dataset.dataset = dataset.id;                       // which dataset it came from
  article.dataset.start = record["start_datetime"] || "";
  article.dataset.price = parsePrice(cost);
  article.dataset.ages = ages.join("|");
  article.dataset.day = getBrisbaneDay(record["start_datetime"]);
  article.dataset.suburb = getSuburb(record);
  article.dataset.bookings =
    record["bookingsrequired"] === "Yes" ? "required" :
    record["bookingsrequired"] === "No" ? "walkin" : "";

  // "source" tells the booking page which dataset to look the event up in
  article.innerHTML =
    '<a href="bookingsPage.html?event=' + encodeURIComponent(slug) +
        '&source=' + encodeURIComponent(dataset.id) + '" class="browseevent-card__link">' +
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

  //category pill (from Isabel's figma design)
  var pill = article.querySelector(".category");
  if (category) {
    pill.textContent = category;
  } else {
    pill.remove();
  }

  article.querySelector(".browseevent-card__title").textContent = name;

  var dt = splitDateTime(date);
  var info = article.querySelector(".browseevent-card__info");
  info.appendChild(createInfoRow(ICONS.calendar, dt.datePart));
  if (dt.timePart) info.appendChild(createInfoRow(ICONS.clock, dt.timePart));
  info.appendChild(createInfoRow(ICONS.pin, venue));

  // event photo from API
  var fallback = FALLBACK_IMAGES[datasetIndex(dataset) % FALLBACK_IMAGES.length];
  var imageUrl = record["eventimage"];
  var frame = article.querySelector(".browseevent-card__frame");
  var img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";
  img.src = imageUrl || fallback;
  img.onerror = function () {
    img.onerror = null;
    img.src = fallback;
  };

  frame.appendChild(img);

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

function createPopularEventCard(record, index) {
  var name = record["subject"];
  var venue = record["location"];
  var date = record["formatteddatetime"] || record["start_datetime"];
  var images = FALLBACK_IMAGES;

  if (!name || !venue || !date) return null;

  var link = document.createElement("a");
  link.className = "event-card";
  link.href = "browsingPage.html?event=" + encodeURIComponent(slugify(name));
  link.setAttribute("aria-label", name + ", " + date + ", " + venue);

  var image = document.createElement("img");
  image.src = record["eventimage"] || images[index];
  image.alt = "";
  image.onerror = function () {
    image.onerror = null;
    image.src = images[index];
  };

  var details = document.createElement("div");
  details.className = "event-card__details";

  var title = document.createElement("h3");
  title.className = "event-card__title";
  title.textContent = name;

  var meta = document.createElement("p");
  meta.className = "event-card__meta";
  meta.textContent = date + " | " + venue;

  details.append(title, meta);
  link.append(image, details);
  return link;
}

/* ---------- loading ---------- */

// one dataset -> array of records, each tagged with record._dataset.
// Asks for the soonest events first; if the API rejects that, retries without sorting.
function fetchDatasetRecords(dataset) {
  var base = API_BASE_URL + dataset.id + "/records";
  var sortedURL = base + "?" + new URLSearchParams({ limit: PER_DATASET_LIMIT, order_by: "start_datetime" }).toString();
  var plainURL  = base + "?" + new URLSearchParams({ limit: PER_DATASET_LIMIT }).toString();

  function get(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) throw new Error(dataset.id + " responded with " + response.status);
      return response.json();
    });
  }

  return get(sortedURL)
    .catch(function () { return get(plainURL); })
    .then(function (data) {
      var results = data.results || [];
      // handy while developing: shows the real field names of each dataset
      if (results.length) console.log(dataset.id + " fields:", Object.keys(results[0]));
      return results.map(function (record) { record._dataset = dataset; return record; });
    })
    .catch(function (error) {
      console.error("Error fetching " + dataset.id + ":", error);
      return [];   // one dataset failing won't break the others
    });
}

function startTime(record) {
  var t = Date.parse(record["start_datetime"]);
  return isNaN(t) ? Infinity : t;
}

// 4 cards for the home page: the soonest event from each dataset, topped up from the rest
function pickPopularRecords(recordsByDataset, allRecords) {
  var picked = [];
  recordsByDataset.forEach(function (list) { if (list[0]) picked.push(list[0]); });
  allRecords.forEach(function (record) {
    if (picked.length < 4 && picked.indexOf(record) === -1) picked.push(record);
  });
  return picked.slice(0, 4);
}

function loadApiEvents() {
  const browseContainer = document.getElementById("browseevents");
  const popularContainer = document.getElementById("popular-events");
  if (!browseContainer && !popularContainer) return;

  Promise.all(DATASETS.map(fetchDatasetRecords)).then(function (lists) {
    var isUsable = function (record) {
      return record["subject"] && record["location"] &&
        (record["formatteddatetime"] || record["start_datetime"]);
    };

    // drop events that appear in more than one dataset (same name + start time).
    // Datasets are checked in DATASETS order, so the first one listed keeps the event.
    var seen = {};
    var isNew = function (record) {
      var key = record["subject"] + "|" + record["start_datetime"];
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    };

    // usable, de-duplicated records per dataset, soonest first
    var byDataset = lists.map(function (list) {
      return list
        .filter(isUsable)
        .filter(isNew)
        .sort(function (a, b) { return startTime(a) - startTime(b); });
    });
    // everything together, soonest first
    var records = [].concat.apply([], byDataset).sort(function (a, b) { return startTime(a) - startTime(b); });

    if (browseContainer) {
      var params = new URLSearchParams(window.location.search);
      var selectedEvent = params.get("event");
      var selectedSource = params.get("source");   // optional: which dataset the event is from

      var browseRecords = selectedEvent
        ? records.filter(function (record) {
            return slugify(record["subject"]) === selectedEvent &&
              (!selectedSource || record._dataset.id === selectedSource);
          })
        : records;

      browseRecords.forEach(function (record) {
        var card = createEventCard(record);
        if (card) browseContainer.appendChild(card);
      });

      if (typeof buildVenueFilters === "function") {
        buildVenueFilters(); // venue checkboxes come from the venues actually loaded
      }
      if (typeof applyFiltersAndSort === "function") {
        applyFiltersAndSort();
      }
    }

    if (popularContainer) {
      var popularRecords = pickPopularRecords(byDataset, records);
      var popularCards = popularRecords.map(createPopularEventCard);
      if (popularCards.length === 4 && popularCards.every(Boolean)) {
        popularContainer.replaceChildren.apply(popularContainer, popularCards);
      }
    }
  }).catch(function (error) {
    console.error("Error fetching events:", error);
  });
}

document.addEventListener("DOMContentLoaded", loadApiEvents);