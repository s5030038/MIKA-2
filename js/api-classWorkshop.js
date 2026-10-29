// api-classes-events.js
// Loads events from the Brisbane City Council "classes-and-workshops-events" dataset (Classes & Workshops).
// Generative AI: Claude Sonnet 5.5 was used to help connect API data to the MIKA² event card design,
// and ...
// styled cards are shown within browseevents and classes-events section. 
// #browseevents = the main browse page (supports filtering/sorting and single-event lookup via ?event= and &source= in the URL)
// #classes-events = a dedicated section showing the soonest events only


// AI-assisted: this is an IIFE (Immediately Invoked Function Expression). The "(function () { ... })();"
// wrapper runs straight away and keeps every variable/function inside it private. Without it, the
// slugify/createEventCard/etc. in this file would be global and overwrite the same-named functions
// from the other API files if they are loaded on the same page.
(function () {
  var DATASET_ID = "classes-and-workshops-events";
  var DEFAULT_CATEGORY = "Workshops";           // pill text if a record has no event type of its own
  var FALLBACK_IMAGE = "../images/eventcard2.png";             // used when an event has no photo
  var SECTION_ID = "classes-events";
  var LIMIT = 20;                                  // records to request
  var SECTION_COUNT = 8;                           // cards shown in the dedicated section



  var API_URL = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/" + DATASET_ID + "/records";

  
  //change event name into URL safe identifier
  // AI-assisted: regex breakdown. /[^a-z0-9]+/g = "one or more characters that are NOT a-z or 0-9"

  function slugify(name) {
    return name
      .toLowerCase()
      .trim()
        // (the ^ inside [] means "not"), and g = replace every match, not just the first. So
        // "Jazz & Wine Night!" -> "jazz-wine-night-".
      .replace(/[^a-z0-9]+/g, "-")   // replace anything non-alphanumeric with  dash
      // The second replace, /(^-|-$)/g, removes a dash at the
      // very start (^-) or very end (-$) so the slug is "jazz-wine-night".
      .replace(/(^-|-$)/g, "");      // trim leading/trailing dashes
  }

  // AI-assisted: turns the API's free-text cost (e.g. "Free", "$25 per person") into a number string.
  // /^free/i = starts with "free", ignoring upper/lower case. /\$\s*(\d+(?:\.\d+)?)/ = a "$", optional
  // spaces, then digits with an optional decimal part; the brackets "capture" the number so
  // match[1] is just the digits (the (?: ) group is non-capturing, it only groups the decimal part).
  // Returns "" when the price can't be worked out.
  function parsePrice(cost) {
    if (!cost) return "";
    if (/^free/i.test(cost.trim())) return "0";
    var match = cost.match(/\$\s*(\d+(?:\.\d+)?)/);
    return match ? match[1] : "";
  }

  // AI-assisted:splits "Saturday 24 October 2026, 7:00pm" into a date part and a time
  // part. (.*?\d{4}) grabs everything up to a 4-digit year - lazy method, then ",\s*" matches the comma, and
  // (.+) grabs the rest as the time. If the text doesn't match that shape, the whole string is used as
  // the date and the time is left blank.
  function splitDateTime(formatted) {
    var match = formatted.match(/^(.*?\d{4}),\s*(.+)$/);
    if (!match) return { datePart: formatted, timePart: "" };
    return { datePart: match[1].trim(), timePart: match[2].trim() };
  }
 
  // AI-assisted: age and age-range are structured differently, so this function allows the rest of code to treat it as
  // an array - .filter(Boolean) removes empty/null items.
  function toList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string" && value.trim()) return [value.trim()];
    return [];
  }
 
  /* for icons */ 
  // AI-assisted: retrieves  day number and short month like ' 24 / OCT ' for the date badge on the photo.
  // Intl.DateTimeFormat with timeZone "Australia/Brisbane" ensure everyone sees Brisbane's date
  function getDateBadge(startIso) {
    if (!startIso) return null;
    var d = new Date(startIso);
    // new Date("rubbish") gives an "Invalid Date", which isNaN() detects
    if (isNaN(d)) return null;   
 
    var parts = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Brisbane",
      day: "numeric",
      month: "short"
    // formatToParts() returns the pieces as a list like
    }).formatToParts(d);
    // [{type:"day", value:"24"}, {type:"month", value:"Oct"}], and .find() picks out the piece we want.
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
 
  // one icon & one line of text, using the shared .event-detail style
  function createInfoRow(iconClass, text) {
    var row = document.createElement("div");
    row.className = "event-detail";
 
    var icon = document.createElement("i");
    icon.className = iconClass;
    icon.setAttribute("aria-hidden", "true");
 
    var span = document.createElement("span");
    // textContent (not innerHTML) treats the API text as plain text, so any HTML or
    // <script> inside an event name can't run on our page (protects against XSS).
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
    // AI-assisted: "||" picks the first value that exists, so this tries the dataset's event type,
    // then the first item of event_type (if it is a list), then the default pill text.
    var category = record["primaryeventtype"] || toList(record["event_type"])[0] || DEFAULT_CATEGORY;
    var ages = toList(record["agerange"] || record["age"]);
 
    // AI-assisted: the data-* attributes below are stored on the card's HTML so the filter/sort code
    // in the browsing page can read them later (e.g. card.dataset.price) without calling the API again.
    //dataset values are always stored as text
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
    // AI-assisted: encodeURIComponent makes the slug/dataset safe to put in a URL. 
    // The card is built as an empty HTML skeleton first; the real (untrusted) text is filled in below with textContent.
    article.innerHTML =
      '<a href="bookingsPage.html?event=' + encodeURIComponent(slug) +
          '&source=' + encodeURIComponent(DATASET_ID) + '" class="browseevent-card__link">' +
        '<div class="browseevent-card__frame"></div>' +
        '<span class="category"></span>' +
        '<h3 class="browseevent-card__title"></h3>' +
        '<div class="browseevent-card__info"></div>' +
      '</a>';
 
    var link = article.querySelector(".browseevent-card__link");
    // AI-assisted: when a card is interacted with, event details are saved in localStorage (as a JSON string)

    link.addEventListener("click", function () {
      localStorage.setItem("mika_current_event", JSON.stringify({
        name: name,
        venue: venue,
        date: date,
        price: parsePrice(cost) || "0",
      // "img" is declared with var further down this function. Because of hoisting the variable exists
        image: img ? img.src : "../images/eventcard1.png",
        category: category,
        slug: slug,
        source: DATASET_ID,
        start: record["start_datetime"] || "",
        end: record["end_datetime"] || ""
      }));
    });
 
    //category pill if exists
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
 
    // event image from API 
    var imageUrl = record["eventimage"];
    var frame = article.querySelector(".browseevent-card__frame");
    var img = document.createElement("img");
    img.alt = ""; 
    img.loading = "lazy";
    img.src = imageUrl || FALLBACK_IMAGE;
    // AI-assisted: if the photo URL is broken the browser fires "onerror" and we swap in the fallback.
    // Setting onerror to null first stops an infinite loop in case the fallback image also fails.
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
 
  // fetch the records
  // asks for the soonest events first and retries without sorting if the API refuses
  // AI-assisted: fetch() returns Promise, and .then() runs once the response arrives. fetch does NOT
  // treat a 404/500 as an error by itself, so we check response.ok and throw ourselves. 
  //  URLSearchParams builds "?limit=20&order_by=start_datetime" safely.
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
 
  // AI-assisted: converts the start time into a number (milliseconds) so records can be compared.
  function startTime(record) {
    var t = Date.parse(record["start_datetime"]);
    return isNaN(t) ? Infinity : t;
  }
 
  function loadEvents() {
    var browseContainer = document.getElementById("browseevents");
    var sectionContainer = document.getElementById(SECTION_ID);
    // AI-assisted: if this page has neither container, stop straight away so the script does no
    // pointless API call on pages (e.g. login) that have no event grid.
    if (!browseContainer && !sectionContainer) return;
 
    fetchRecords()
      .then(function (data) {
        var results = data.results || [];
        // handy while developing: shows the real field names of this dataset
        if (results.length) console.log(DATASET_ID + " fields:", Object.keys(results[0]));
 
        // AI-assisted: .filter() keeps only complete records, then .sort() orders them. A sort
        // callback returns a negative number if a comes first, positive if b comes first, so
        // "startTime(a) - startTime(b)" gives soonest-first.
        var records = results
          .filter(function (record) {
            return record["subject"] && record["location"] &&
              (record["formatteddatetime"] || record["start_datetime"]);
          })
          .sort(function (a, b) { return startTime(a) - startTime(b); });
 
        if (browseContainer) {
          // AI-assisted: reads the page URL's query string, e.g. browsingPage.html?event=jazz-night&source=classes-and-workshops-events
          var params = new URLSearchParams(window.location.search);
          var selectedEvent = params.get("event");
          var selectedSource = params.get("source");   // optional: which dataset the event is from
 
          // a link to an event from another dataset: nothing for this file to show
          if (!selectedSource || selectedSource === DATASET_ID) {
            // AI-assisted: if ?event= is in the URL, show only the record whose slug matches it;
            // otherwise show everything. Slugs are compared, not names, because the URL holds the slug.
            var browseRecords = selectedEvent
              ? records.filter(function (record) { return slugify(record["subject"]) === selectedEvent; })
              : records;
 
            browseRecords.forEach(function (record) {
              var card = createEventCard(record);
              if (card) browseContainer.appendChild(card);
            });
 
            // AI-assisted: these two functions live in another script (the browse page's filter code).
            // "typeof x === 'function'" checks they exist first, so this file doesn't crash on pages
            // that don't load that script.
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
          // AI-assisted: slice(0, 8) takes the first 8 (soonest) records, .map() turns each into a card,
          // and .filter(Boolean) drops the nulls returned for incomplete records.
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
 
  // AI-assisted: waits until the page's HTML has loaded so getElementById can find the containers.
  document.addEventListener("DOMContentLoaded", loadEvents);
})();