// api-creative-events.js
// Loads events from the Brisbane City Council "creative-events" dataset (Creative).
// Based on the shared api-events.js template, for this ONE dataset.
// Everything is wrapped in a function, so this file can sit on the same page as the other
// api-*-events.js files without their function names clashing.
//
// Where the cards go (whichever containers exist on the page):
//   #browseevents      -> the browsing page grid (cards are appended to it)
//   #creative-events   -> an optional section just for this dataset (e.g. a carousel on the home page)
//   #popular-events    -> the 4 "Explore what's popular" cards on the home page

(function () {
  var DATASET_ID = "creative-events";
  var DEFAULT_CATEGORY = "Creative";           // pill text if a record has no event type of its own
  var FALLBACK_IMAGE = "../images/eventcard1.png";             // used when an event has no photo
  var SECTION_ID = "creative-events";
  var LIMIT = 20;                                  // records to request
  var SECTION_COUNT = 8;                           // cards shown in the dedicated section

  var API_URL = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/" + DATASET_ID + "/records";

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

  // some fields are a list in one dataset and a single string in another (e.g. agerange / age)
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
    var category = record["primaryeventtype"] || toList(record["event_type"])[0] || DEFAULT_CATEGORY;
    var ages = toList(record["agerange"] || record["age"]);

    var article = document.createElement("article");
    article.className = "browseevent-card";
    article.dataset.name = name;
    article.dataset.venue = venue;
    article.dataset.date = date;
    article.dataset.category = category;
    article.dataset.cost = cost || "";
    article.dataset.source = "api";
    article.dataset.dataset = DATASET_ID;
    article.dataset.start = record["start_datetime"] || ""; 
    article.dataset.price = parsePrice(cost);                
    article.dataset.ages = ages.join("|"); 
    article.dataset.bookings =
      record["bookingsrequired"] === "Yes" ? "required" :
      record["bookingsrequired"] === "No" ? "walkin" : "";

    // "source" tells the booking page which dataset to look the event up in
    article.innerHTML =
      '<a href="bookingsPage.html?event=' + encodeURIComponent(slug) +
          '&source=' + encodeURIComponent(DATASET_ID) + '" class="browseevent-card__link">' +
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
    img.src = imageUrl || FALLBACK_IMAGE;
    img.onerror = function () {
      img.onerror = null; 
      img.src = FALLBACK_IMAGE;
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

  // the 4 image cards in "Explore what's popular" on the home page
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
    link.href = "browsingPage.html?event=" + encodeURIComponent(slugify(name)) + "&source=" + encodeURIComponent(DATASET_ID);
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

  // fetch the records; asks for the soonest events first and retries without sorting if the API refuses
  function fetchRecords() {
    var sortedURL = API_URL + "?" + new URLSearchParams({ limit: LIMIT, order_by: "start_datetime" }).toString();
    var plainURL  = API_URL + "?" + new URLSearchParams({ limit: LIMIT }).toString();

    function get(url) {
      return fetch(url).then(function (response) {
        if (!response.ok) throw new Error(DATASET_ID + " responded with " + response.status);
        return response.json();
      });
    }

    return get(sortedURL).catch(function () { return get(plainURL); });
  }

  function startTime(record) {
    var t = Date.parse(record["start_datetime"]);
    return isNaN(t) ? Infinity : t;
  }

  function loadEvents() {
    var browseContainer = document.getElementById("browseevents");
    var sectionContainer = document.getElementById(SECTION_ID);
    var popularContainer = document.getElementById("popular-events");
    if (!browseContainer && !sectionContainer && !popularContainer) return;

    fetchRecords()
      .then(function (data) {
        var results = data.results || [];
        // handy while developing: shows the real field names of this dataset
        if (results.length) console.log(DATASET_ID + " fields:", Object.keys(results[0]));

        var records = results
          .filter(function (record) {
            return record["subject"] && record["location"] &&
              (record["formatteddatetime"] || record["start_datetime"]);
          })
          .sort(function (a, b) { return startTime(a) - startTime(b); });

        if (browseContainer) {
          var params = new URLSearchParams(window.location.search);
          var selectedEvent = params.get("event");
          var selectedSource = params.get("source");   // optional: which dataset the event is from

          // a link to an event from another dataset: nothing for this file to show
          if (!selectedSource || selectedSource === DATASET_ID) {
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
        }

        if (sectionContainer) {
          sectionContainer.innerHTML = "";
          var sectionCards = records.slice(0, SECTION_COUNT).map(createEventCard).filter(Boolean);
          if (sectionCards.length === 0) {
            var empty = document.createElement("p");
            empty.textContent = "No events available right now. Check back soon!";
            sectionContainer.appendChild(empty);
          }
          sectionCards.forEach(function (card) { sectionContainer.appendChild(card); });
        }

        if (popularContainer) {
          var popularCards = records.slice(0, 4).map(createPopularEventCard);
          if (popularCards.length === 4 && popularCards.every(Boolean)) {
            popularContainer.replaceChildren.apply(popularContainer, popularCards);
          }
        }
      })
      .catch(function (error) {
        console.error("Error fetching " + DATASET_ID + " events:", error);
        if (sectionContainer && !sectionContainer.children.length) {
          sectionContainer.textContent = "Couldn't load events right now.";
        }
      });
  }

  document.addEventListener("DOMContentLoaded", loadEvents);
})();