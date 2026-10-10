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

// "Tuesday, 22 September 2026, 10:15am - 4:45pm"
//   -> date: "Tuesday, 22 September 2026", time: "10:15am - 4:45pm"
// Dates with no time, like "Friday, 25 September 2026", stay whole.
function splitDateTime(formatted) {
  var match = formatted.match(/^(.*?\d{4}),\s*(.+)$/);
  if (!match) return { datePart: formatted, timePart: "" };
  return { datePart: match[1].trim(), timePart: match[2].trim() };
}

function createEventCard(record) {
  var name = record["subject"];
  var venue = record["location"];
  var date = record["formatteddatetime"] || record["start_datetime"];

// skip incomplete records instead of showing broken card
  if (!name || !venue || !date) return null;

  var slug = slugify(name);

  var cost = record["cost"] || "";
  var category = record["primaryeventtype"] || "";

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
      '<h3 class="browseevent-card__title"></h3>' +
      '<p class="browseevent-card__meta"></p>' +
      '<p class="browseevent-card__venue"></p>' +
    '</a>';

  article.querySelector(".browseevent-card__title").textContent = name;
  
  var dt = splitDateTime(date);
  var metaEl = article.querySelector(".browseevent-card__meta");
  metaEl.textContent = dt.datePart;
  if (dt.timePart) {
    metaEl.appendChild(document.createElement("br"));
    metaEl.appendChild(document.createTextNode(dt.timePart));
}

  article.querySelector(".browseevent-card__venue").textContent = venue;

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

function loadApiEvents() {
  const baseURL = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/creative-events/records";
  const requestParams = { limit: 20 };
  const fullURL = baseURL + "?" + new URLSearchParams(requestParams).toString();

  const browseContainer = document.getElementById("browseevents");
  const popularContainer = document.getElementById("popular-events");
  if (!browseContainer && !popularContainer) return;

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
    })
    .catch(function (error) {
      console.error("Error fetching events:", error);
    });
}

document.addEventListener("DOMContentLoaded", loadApiEvents);