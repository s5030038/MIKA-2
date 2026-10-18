// js/booking-loader.js

function slugify(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

async function initBookingLoader() {
    const urlParams = new URLSearchParams(window.location.search);
    const requestedID = urlParams.get("event") || urlParams.get("id");

    let matchedEvent = null;

    // 1. INSTANT CACHE: Read the exact event clicked from localStorage (100% reliable for all exhibitions, festivals, and API cards)
    const cachedEvent = localStorage.getItem("mika_current_event");
    if (cachedEvent) {
        try {
            const parsed = JSON.parse(cachedEvent);
            // Verify it matches the requested slug or load it directly if slug matches or no ID specified
            if (!requestedID || slugify(parsed.name) === requestedID) {
                matchedEvent = parsed;
            }
        } catch (e) {
            console.error("Error parsing cached event:", e);
        }
    }

    // 2. LOCAL EVENTS FALLBACK: Check events-data.js if cache didn't match
    if (!matchedEvent && requestedID && typeof EVENTS !== "undefined") {
        const localKey = Object.keys(EVENTS).find(key => key === requestedID || slugify(EVENTS[key].name) === requestedID);
        if (localKey) {
            const ev = EVENTS[localKey];
            matchedEvent = {
                name: ev.name,
                venue: ev.venue,
                date: ev.date,
                price: ev.price ? ev.price.toString() : "0",
                image: ev.image || "../images/eventcard1.png"
            };
        }
    }

    // 3. SAFE DEFAULT FALLBACK
    if (!matchedEvent) {
        matchedEvent = {
            name: "Petrie Terrace Gallery Exhibition",
            venue: "Petrie Terrace Gallery, Petrie Terrace",
            date: "Sat, 24 Oct 2026, 12 - 3pm",
            price: "375",
            image: "../images/eventcard1.png"
        };
    }

    // Safely update DOM elements
    const eventNameEl = document.querySelector(".event-name");
    if (eventNameEl) eventNameEl.textContent = matchedEvent.name;

    const eventVenueEl = document.getElementById("event-venue");
    if (eventVenueEl) eventVenueEl.textContent = matchedEvent.venue;

    const eventDateEl = document.getElementById("event-date");
    if (eventDateEl) eventDateEl.textContent = matchedEvent.date;

    const overviewVenue = document.getElementById("overview-venue");
    if (overviewVenue) overviewVenue.textContent = matchedEvent.venue;

    const cardVenue = document.getElementById("card-venue");
    if (cardVenue) cardVenue.textContent = matchedEvent.venue;

    const cardDate = document.getElementById("card-date");
    if (cardDate) cardDate.textContent = matchedEvent.date;

    const priceEl = document.getElementById("event-price");
    if (priceEl) {
        const priceText = (!matchedEvent.price || matchedEvent.price === "0" || /^free/i.test(matchedEvent.price)) 
            ? "Free Entry" 
            : (matchedEvent.price.startsWith("$") ? matchedEvent.price : `From AU$${matchedEvent.price}`);
        priceEl.textContent = priceText;
    }

    const imgElement = document.getElementById("event-image");
    if (imgElement && matchedEvent.image) {
        imgElement.src = matchedEvent.image;
        imgElement.alt = matchedEvent.name;
    }
}

// Ensure it runs safely once DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBookingLoader);
} else {
    initBookingLoader();
}