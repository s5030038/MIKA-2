function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")   // replace anything non-alphanumeric with a dash
    .replace(/(^-|-$)/g, "");      // trim leading/trailing dashes
}

function createEventCard(record) {
  var name = record["subject"];
  var venue = record["location"];
  var date = record["formatteddatetime"] || record["start_datetime"];

// skip incomplete records instead of showing broken card
  if (!name || !venue || !date) return null;

  var slug = slugify(name);

  var article = document.createElement("article");
  article.className = "browseevent-card";
  article.dataset.name = name;
  article.dataset.venue = venue;
  article.dataset.date = date;

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

function loadApiEvents() {
  const baseURL = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/creative-events/records";
  const requestParams = { limit: 20 };
  const fullURL = baseURL + "?" + new URLSearchParams(requestParams).toString();

  const container = document.getElementById("browseevents");
  if (!container) return;

  fetch(fullURL)
    .then(function (response) {
      if (!response.ok) throw new Error("API responded with " + response.status);
      return response.json();
    })
    .then(function (data) {
      var records = data.results || [];
      records.forEach(function (record) {
        var card = createEventCard(record);
        if (card) container.appendChild(card);
      });
    })
    .catch(function (error) {
      console.error("Error fetching events:", error);
    });
}

document.addEventListener("DOMContentLoaded", loadApiEvents);