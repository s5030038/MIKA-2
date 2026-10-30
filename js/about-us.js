// about.js
// aboutPage.html: builds the team list and the AI declaration from the data below.
// To change the page, edit the two lists in the "EDIT THIS" section. You don't need to touch the HTML.

/* ===================================================================
   Your group
   =================================================================== */
var TEAM = [
  { name: "Team member 1", role: "Role, e.g. design lead",  bio: "One or two sentences about what you worked on and why you care about it.", photo: "" },
  { name: "Team member 2", role: "Role, e.g. front-end",    bio: "One or two sentences about what you worked on and why you care about it.", photo: "" },
  { name: "Team member 3", role: "Role, e.g. data and API", bio: "One or two sentences about what you worked on and why you care about it.", photo: "" },
  { name: "Team member 4", role: "Role, e.g. content",      bio: "One or two sentences about what you worked on and why you care about it.", photo: "" }
  // photo: "../images/your-photo.jpg" shows a picture instead of initials
];

/* ===================================================================
   where AI was used (shown as the ledger in the AI declaration)
   Be specific and honest. Change anything that doesn't match what actually happened.
   =================================================================== */
var DECLARATION_UPDATED = "October 2026";

var AI_USES = [
  {
    title: "Loading events from Brisbane open data",
    ai: "Wrote the JavaScript that fetches events from Brisbane City Council datasets (creative events, classes and workshops, films, Fortitude Valley malls and music) and turns them into event cards.",
    us: "Chose the datasets, supplied our card design and styles, tested the results in the browser and reported what didn't work."
  },
  {
    title: "My Events and Favourites",
    ai: "Wrote the filters, search, sort dropdown, heart buttons, the List and Calendar views and the calendar download.",
    us: "Provided the Figma designs, tested each feature and asked for changes until it matched the design."
  },
  {
    title: "Settings and Edit Profile",
    ai: "Built the Settings tab and the Edit Profile page from our prototypes.",
    us: "Designed the prototypes and checked the pages against them."
  },
  {
    title: "Discussion board",
    ai: "Wrote a sample discussion board and drew a chat room layout on a screenshot of our event page.",
    us: "Came up with the chat room idea and decided which parts to keep."
  },
  {
    title: "Fixing bugs",
    ai: "Suggested fixes for the header dropdown, the tab transitions and card layouts when we pasted in our code.",
    us: "Found the bugs, applied the fixes to our own files and tested again."
  },
  {
    title: "This About Us page",
    ai: "Drafted the layout, the code and the first version of this declaration.",
    us: "Replaced the placeholders with our own details and checked that this declaration is accurate."
  }
];


var AVATAR_COLOURS = ["#E3B4BF", "#F2C9B8", "#D9A0AC", "#EBCFC4", "#C98A9A"];

function $(id) { return document.getElementById(id); }

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}


function initials(name) {
  var words = name.replace(/[^A-Za-z\s]/g, "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  var first = words[0].charAt(0);
  var last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

/* ---------- team ---------- */

function renderTeam() {
  var list = $("team-list");
  if (!list) return;
  list.innerHTML = "";

  TEAM.forEach(function (person, index) {
    var item = el("li", "member");

    var avatar = el("div", "member__avatar");
    if (person.photo) {
      var img = document.createElement("img");
      img.src = person.photo;
      img.alt = person.name;
      avatar.appendChild(img);
    } else {
      avatar.textContent = initials(person.name);
      avatar.style.background = AVATAR_COLOURS[index % AVATAR_COLOURS.length];
      avatar.setAttribute("aria-hidden", "true");
    }
    item.appendChild(avatar);

    var text = el("div", "member__text");
    text.appendChild(el("h3", "member__name", person.name));
    text.appendChild(el("p", "member__role", person.role));
    text.appendChild(el("p", "member__bio", person.bio));
    item.appendChild(text);

    list.appendChild(item);
  });
}

/* ---------- AI declaration ledger ---------- */

function renderLedger() {
  var ledger = $("ai-ledger");
  if (!ledger) return;
  ledger.innerHTML = "";

  AI_USES.forEach(function (use, index) {
    var item = el("div", "ledger-item");
    var bodyId = "ledger-body-" + index;

    // the clickable title
    var heading = el("h4", "ledger-item__heading");
    var button = el("button", "ledger-toggle");
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", bodyId);
    button.appendChild(el("span", "", use.title));
    var chevron = el("span", "ledger-toggle__chevron");
    chevron.setAttribute("aria-hidden", "true");
    button.appendChild(chevron);
    heading.appendChild(button);
    item.appendChild(heading);

    // the two columns that open and close
    var body = el("div", "ledger-body");
    body.id = bodyId;
    body.setAttribute("role", "region");
    body.setAttribute("aria-label", use.title);

    var inner = el("div", "ledger-body__inner");

    var aiCol = el("div", "ledger-col ledger-col--ai");
    aiCol.appendChild(el("p", "ledger-col__label", "What the AI did"));
    aiCol.appendChild(el("p", "", use.ai));

    var usCol = el("div", "ledger-col ledger-col--us");
    usCol.appendChild(el("p", "ledger-col__label", "What we did"));
    usCol.appendChild(el("p", "", use.us));

    inner.appendChild(aiCol);
    inner.appendChild(usCol);
    body.appendChild(inner);
    item.appendChild(body);

    button.addEventListener("click", function () {
      setOpen(item, !item.classList.contains("is-open"));
      updateExpandAllLabel();
    });

    ledger.appendChild(item);
  });
}

function setOpen(item, open) {
  item.classList.toggle("is-open", open);
  item.querySelector(".ledger-toggle").setAttribute("aria-expanded", open ? "true" : "false");
}

// "Expand all" <-> "Collapse all"
function updateExpandAllLabel() {
  var button = $("expand-all");
  if (!button) return;
  var items = document.querySelectorAll(".ledger-item");
  var allOpen = items.length > 0 && document.querySelectorAll(".ledger-item.is-open").length === items.length;
  button.textContent = allOpen ? "Collapse all" : "Expand all";
}

function setUpExpandAll() {
  var button = $("expand-all");
  if (!button) return;
  button.addEventListener("click", function () {
    var items = document.querySelectorAll(".ledger-item");
    var allOpen = document.querySelectorAll(".ledger-item.is-open").length === items.length;
    items.forEach(function (item) { setOpen(item, !allOpen); });
    updateExpandAllLabel();
  });
}

/* ---------- start-up ---------- */

document.addEventListener("DOMContentLoaded", function () {
  renderTeam();
  renderLedger();
  setUpExpandAll();

  var updated = $("declaration-updated");
  if (updated) updated.textContent = DECLARATION_UPDATED;

  // open the first item so people can see how the ledger works
  var first = document.querySelector(".ledger-item");
  if (first) { setOpen(first, true); updateExpandAllLabel(); }
});