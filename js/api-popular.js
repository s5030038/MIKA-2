function slugifyPopularEvent(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createPopularEventCard(record, index) {
  var name = record["subject"];
  var venue = record["location"];
  var date = record["formatteddatetime"] || record["start_datetime"];
  var fallbackImages = [
    "../images/eventcard1.png",
    "../images/eventcard2.png",
    "../images/eventcard3.png",
    "../images/eventcard4.png"
  ];

  if (!name || !venue || !date) return null;

  var link = document.createElement("a");
  link.className = "event-card";
  link.href = "browsingPage.html?event=" + encodeURIComponent(slugifyPopularEvent(name));
  link.setAttribute("aria-label", name + ", " + date + ", " + venue);

  var image = document.createElement("img");
  image.src = record["eventimage"] || fallbackImages[index];
  image.alt = "";
  image.onerror = function () {
    image.onerror = null;
    image.src = fallbackImages[index];
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

function loadPopularEvents() {
  var container = document.getElementById("popular-events");
  if (!container) return;

  var datasetIds = [
    "classes-and-workshops-events",
    "films-events",
    "fortitude-valley-malls-events"
  ];
  var baseUrl = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/";
  var requests = datasetIds.map(function (datasetId) {
    var url = baseUrl + datasetId + "/records?" +
      new URLSearchParams({ limit: 20 }).toString();

    return fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error(datasetId + " API responded with " + response.status);
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
