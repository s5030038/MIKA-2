// api-malls-events.js
// Loads events from the Brisbane City Council "fortitude-valley-malls-events" dataset (Fortitude Valley Malls).
// Everything is wrapped in a function, so this file can sit on the same page as the other
// api-*-events.js files without their function names clashing. - uses the IIFE style

(function () {
  var DATASET_ID = "fortitude-valley-malls-events";
  var DEFAULT_CATEGORY = "Fortitude Valley";           // pill text if a record has no event type of its own
  var FALLBACK_IMAGE = "../images/eventcard4.png";             // used when an event has no photo
  var SECTION_ID = "malls-events";
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
    if (!browseContainer && !sectionContainer) return;

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