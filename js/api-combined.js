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

function createEventCard(record) {
  var name = record["subject"];
  var venue = record["location"];
  var date = record["formatteddatetime"] || record["start_datetime"];

// skip incomplete records instead of showing broken card
  if (!name || !venue || !date) return null;

  var slug = slugify(name);

  var cost = record["cost"] || "";
  var category = record._category || record["primaryeventtype"] || "";

  var article = document.createElement("article");
  article.className = "browseevent-card";
  article.dataset.name = name;
  article.dataset.venue = venue;
  article.dataset.date = date;
  article.dataset.category = category;
  article.dataset.cost = cost || "";
  article.dataset.source = "api";
  article.dataset.start = record["start_datetime"] || ""; 
  article.dataset.price = parsePrice(cost);                
  article.dataset.ages = (record["agerange"] || []).join("|"); 
  article.dataset.bookings =
    record["bookingsrequired"] === "Yes" ? "required" :
    record["bookingsrequired"] === "No" ? "walkin" : "";

  article.innerHTML =
    '<a href="bookingsPage.html?event=' + encodeURIComponent(slug) + '" class="browseevent-card__link">' +
      '<div class="browseevent-card__frame"></div>' +
      '<span class="category"></span>' +
      '<h3 class="browseevent-card__title"></h3>' +
      '<div class="browseevent-card__info"></div>' +
    '</a>';
  
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
  var images = [
    "../images/eventcard1.png",
    "../images/eventcard2.png",
    "../images/eventcard3.png",
    "../images/eventcard4.png"
  ];

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

// to combine music & creative API for browsing page to show both
var EVENT_SOURCES = [
  {
    url: "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/creative-events/records",
    forceCategory: ""        
  },
  {
    url: "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/music-events/records",
    forceCategory: "Music"   
  }
];

function fetchRecords(source) {
  var url = source.url + "?" + new URLSearchParams({ limit: 20 }).toString();

  return fetch(url)
    .then(function (response) {
      if (!response.ok) throw new Error("API responded with " + response.status);
      return response.json();
    })
    .then(function (data) {
      return (data.results || []).map(function (record) {
        record._category = source.forceCategory || record["primaryeventtype"] || "";
        return record;
      });
    })
    .catch(function (error) {
      console.error("Error fetching " + source.url, error);
      return [];
    });
}

function loadApiEvents() {
  const browseContainer = document.getElementById("browseevents");
  const popularContainer = document.getElementById("popular-events");
  if (!browseContainer && !popularContainer) return;

  Promise.all(EVENT_SOURCES.map(fetchRecords))
    .then(function (lists) {
      var seen = {};
      var records = [].concat.apply([], lists).filter(function (record) {
        if (!(record["subject"] && record["location"] &&
              (record["formatteddatetime"] || record["start_datetime"]))) return false;

        // drop events that appear in both datasets (same name + start time)
        var key = record["subject"] + "|" + record["start_datetime"];
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });

      if (browseContainer) {
        var selectedEvent = new URLSearchParams(window.location.search).get("event");
        var browseRecords = selectedEvent
          ? records.filter(function (record) { return slugify(record["subject"]) === selectedEvent; })
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
        var popularRecords = records.slice(0, 4);
        var popularCards = popularRecords.map(createPopularEventCard);
        if (popularCards.length === 4 && popularCards.every(Boolean)) {
          popularContainer.replaceChildren.apply(popularContainer, popularCards);
        }
      }
    
    });
}

document.addEventListener("DOMContentLoaded", loadApiEvents);