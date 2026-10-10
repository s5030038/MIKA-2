function slugify(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

document.addEventListener("DOMContentLoaded", async () => {
    const eventKeys = Object.keys(EVENTS);
    const urlParams = new URLSearchParams(window.location.search);
    const requestedID = urlParams.get("event") || urlParams.get("id");

    let matchedEvent = null;

    if (requestedID) {
        // 1. Check static EVENTS dictionary
        if (EVENTS[requestedID]) {
            matchedEvent = EVENTS[requestedID];
        } else {
            const foundKey = eventKeys.find(key => slugify(EVENTS[key].name) === requestedID || key === requestedID);
            if (foundKey) {
                matchedEvent = EVENTS[foundKey];
            }
        }
    }

    // 2. If still not found, check Brisbane City Council API datasets as a fallback
    if (!matchedEvent && requestedID) {
        matchedEvent = await fetchEventFromApi(requestedID);
    }

    // 3. Final fallback to first event if nothing matches anywhere
    const event = matchedEvent || EVENTS[eventKeys[0]];
    if (!event) return;

    // Update Page DOM
    document.title = `${event.name} - Bookings`;
    document.getElementById("event-name").textContent = event.name;
    document.getElementById("event-venue").textContent = event.venue;
    document.getElementById("event-date").textContent = event.date;

    const overviewVenue = document.getElementById("overview-venue");
    if (overviewVenue) {
        overviewVenue.textContent = event.venue;
    }

    const cardVenue = document.getElementById("card-venue");
    if (cardVenue) {
        cardVenue.textContent = event.venue;
    }

    const cardDate = document.getElementById("card-date");
    if (cardDate) {
        cardDate.textContent = event.date;
    }

    // Fixed price bug assignment using priceText
    const priceText = (event.price == 0 || event.price === "0") ? "Free Entry" : `From AU$${event.price}`;
    document.getElementById("event-price").textContent = priceText;

    const imgElement = document.getElementById("event-image");
    if (imgElement && event.image) {
        imgElement.src = event.image;
        imgElement.alt = event.name;
    }
});

// API Fallback helper function
async function fetchEventFromApi(slug) {
    const datasets = ["creative-events", "music-events"];
    for (const ds of datasets) {
        try {
            const res = await fetch(`https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/${ds}/records?limit=50`);
            if (!res.ok) continue;
            const data = await res.json();
            const match = (data.results || []).find(r => r.subject && slugify(r.subject) === slug);
            if (match) {
                return {
                    name: match.subject,
                    venue: match.location,
                    date: match.formatteddatetime || match.start_datetime,
                    price: match.cost || 0,
                    image: match.eventimage || "../images/eventcard1.png"
                };
            }
        } catch (e) {
            console.error("API fetch error:", e);
        }
    }
    return null;
}