// Loads events from the Brisbane City Council "music-events" dataset and
// renders them as cards. 

// change event name into URL safe identifier
function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")   // replace anything non-alphanumeric with a dash
    .replace(/(^-|-$)/g, "");      // trim leading/trailing dashes
}

// small helper: add a little tag (cost / age / booking) to a card
function addTag(parent, text, extraClass) {
  if (!text) return;
  var tag = document.createElement("span");
  tag.className = "browseevent-card__tag" + (extraClass ? " " + extraClass : "");
  tag.textContent = text;
  parent.appendChild(tag);
}

function createMusicEventCard(record) {
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

  // textContent (not innerHTML) so data from the API can't inject HTML
  article.querySelector(".browseevent-card__title").textContent = name;
  article.querySelector(".browseevent-card__meta").textContent = date;
  article.querySelector(".browseevent-card__venue").textContent = venue;

  var tags = article.querySelector(".browseevent-card__tags");
  return article;
}

function loadMusicEvents() {
  const baseURL = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/music-events/records";
  const requestParams = { limit: 20 };
  // other things you can add to requestParams:
  // order_by: "start_datetime"                 -> soonest first
  const fullURL = baseURL + "?" + new URLSearchParams(requestParams).toString();

  // use a dedicated container if the page has one, otherwise share the browse grid
  const container =
    document.getElementById("music-events") ||
    document.getElementById("browseevents");
  if (!container) return;

  fetch(fullURL)
    .then(function (response) {
      if (!response.ok) throw new Error("API responded with " + response.status);
      return response.json();
    })
    .then(function (data) {
      var records = data.results || [];

      // displays the real field names from the dataset
      if (records.length) console.log("Music event fields:", Object.keys(records[0]));

      records.forEach(function (record) {
        var card = createMusicEventCard(record);
        if (card) container.appendChild(card);
      });
    })
    .catch(function (error) {
      console.error("Error fetching music events:", error);
    });
}

document.addEventListener("DOMContentLoaded", loadMusicEvents);