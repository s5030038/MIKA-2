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

function createEventCard(record) {
  var name = record["subject"];
  var venue = record["location"];
  var date = record["formatteddatetime"] || record["start_datetime"];

// skip incomplete records instead of showing broken card
  if (!name || !venue || !date) return null;

  var slug = slugify(name);

  var cost = record["cost"] || "";
  var category = Array.isArray(record["category"])
    ? record["category"].join("|")
    : (record["category"] || "");

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
    record["bookingsrequired"] === "No" ? "dropin" : "";

  article.innerHTML =
    '<a href="bookingsPage.html?event=' + encodeURIComponent(slug) + '" class="browseevent-card__link">' +
      '<div class="browseevent-card__frame"></div>' +
      '<h3 class="browseevent-card__title"></h3>' +
      '<p class="browseevent-card__meta"></p>' +
      '<p class="browseevent-card__venue"></p>' +
    '</a>';

  article.querySelector(".browseevent-card__title").textContent = name;
  article.querySelector(".browseevent-card__meta").textContent = date;
  article.querySelector(".browseevent-card__venue").textContent = venue;

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