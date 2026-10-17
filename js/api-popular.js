function slugifyPopularEvent(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function splitPopularEventDateTime(formatted) {
  var match = formatted.match(/^(.*?\d{4}),\s*(.+)$/);
  if (!match) return { datePart: formatted, timePart: "" };
  return { datePart: match[1].trim(), timePart: match[2].trim() };
}

function createPopularEventInfoRow(iconClass, text) {
  var row = document.createElement("div");
  row.className = "event-detail";

  var icon = document.createElement("i");
  icon.className = iconClass;
  icon.setAttribute("aria-hidden", "true");

  var value = document.createElement("span");
  value.textContent = text;
  row.append(icon, value);
  return row;
}

function createPopularEventCard(record, index) {
  var name = record["subject"];
  var venue = record["location"];
  var date = record["formatteddatetime"] || record["start_datetime"];
  var category = record["primaryeventtype"] || record._popularCategory;
  var fallbackImages = [
    "../images/eventcard1.png",
    "../images/eventcard2.png",
    "../images/eventcard3.png",
    "../images/eventcard4.png"
  ];

  if (!name || !venue || !date) return null;

  var card = document.createElement("article");
  card.className = "browseevent-card";
  card.setAttribute("aria-label", name + ", " + date + ", " + venue);
  card.innerHTML =
    '<a class="browseevent-card__link">' +
      '<div class="browseevent-card__frame"></div>' +
      '<span class="category"></span>' +
      '<h3 class="browseevent-card__title"></h3>' +
      '<div class="browseevent-card__info"></div>' +
    '</a>';

  var link = card.querySelector(".browseevent-card__link");
  link.href = "browsingPage.html?event=" + encodeURIComponent(slugifyPopularEvent(name));

  var categoryLabel = card.querySelector(".category");
  if (category) {
    categoryLabel.textContent = category;
  } else {
    categoryLabel.remove();
  }

  card.querySelector(".browseevent-card__title").textContent = name;

  var dateTime = splitPopularEventDateTime(date);
  var info = card.querySelector(".browseevent-card__info");
  info.appendChild(createPopularEventInfoRow("fa-regular fa-calendar", dateTime.datePart));
  if (dateTime.timePart) {
    info.appendChild(createPopularEventInfoRow("fa-regular fa-clock", dateTime.timePart));
  }
  info.appendChild(createPopularEventInfoRow("fa-solid fa-location-dot", venue));

  var frame = card.querySelector(".browseevent-card__frame");
  var image = document.createElement("img");
  image.alt = "";
  image.loading = "lazy";
  image.src = record["eventimage"] || fallbackImages[index % fallbackImages.length];
  image.onerror = function () {
    image.onerror = null;
    image.src = fallbackImages[index % fallbackImages.length];
  };
  frame.appendChild(image);

  var start = new Date(record["start_datetime"]);
  if (!isNaN(start.getTime())) {
    var parts = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Brisbane",
      day: "numeric",
      month: "short"
    }).formatToParts(start);
    var badge = document.createElement("div");
    badge.className = "event-card_date";

    var day = document.createElement("strong");
    day.textContent = parts.find(function (part) { return part.type === "day"; }).value;
    var month = document.createElement("span");
    month.textContent = parts.find(function (part) { return part.type === "month"; }).value.toUpperCase();
    badge.append(day, month);
    frame.appendChild(badge);
  }

  return card;
}

function loadPopularEvents() {
  var container = document.getElementById("popular-events");
  if (!container) return;

  var datasets = [
    { id: "classes-and-workshops-events", category: "Workshops" },
    { id: "films-events", category: "Films" },
    { id: "fortitude-valley-malls-events", category: "Fortitude Valley" }
  ];
  var baseUrl = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/";
  var requests = datasets.map(function (dataset) {
    var url = baseUrl + dataset.id + "/records?" +
      new URLSearchParams({ limit: 20 }).toString();

    return fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error(dataset.id + " API responded with " + response.status);
        return response.json();
      })
      .then(function (data) {
        return (data.results || []).filter(function (record) {
          return record["subject"] && record["location"] &&
            (record["formatteddatetime"] || record["start_datetime"]);
        }).sort(function (a, b) {
          var aTime = Date.parse(a["start_datetime"]);
          var bTime = Date.parse(b["start_datetime"]);
          return (isNaN(aTime) ? Infinity : aTime) - (isNaN(bTime) ? Infinity : bTime);
        }).map(function (record) {
          record._popularCategory = dataset.category;
          return record;
        });
      });
  });

  Promise.all(requests)
    .then(function (recordsByDataset) {
      var selected = [];
      var seen = {};
      var allRecords = [].concat.apply([], recordsByDataset);

      function addIfNew(record) {
        var key = record["subject"] + "|" +
          (record["start_datetime"] || record["formatteddatetime"]);
        if (seen[key]) return;
        seen[key] = true;
        selected.push(record);
      }

      recordsByDataset.forEach(function (records) {
        if (records[0]) addIfNew(records[0]);
      });

      allRecords.forEach(function (record) {
        if (selected.length >= 4) return;
        addIfNew(record);
      });

      var cards = selected.slice(0, 4).map(createPopularEventCard);
      if (cards.length === 4 && cards.every(Boolean)) {
        container.replaceChildren.apply(container, cards);
      }
    })
    .catch(function (error) {
      console.error("Error fetching popular events:", error);
    });
}

document.addEventListener("DOMContentLoaded", loadPopularEvents);
