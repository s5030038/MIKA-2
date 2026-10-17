// js/booking-loader.js

function slugify(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const requestedID = urlParams.get("event") || urlParams.get("id");
    const requestedSource = urlParams.get("source"); // e.g., "films-events", "music-events", etc.

    let matchedEvent = null;

    if (requestedID) {
        // Try fetching from the specific dataset source passed in URL first
        if (requestedSource) {
            matchedEvent = await fetchEventFromDataset(requestedID, requestedSource);
        }

        // If not found yet, loop through all available Council datasets as a fallback
        if (!matchedEvent) {
            const allDatasets = [
                "creative-events",
                "classes-and-workshops-events",
                "films-events",
                "fortitude-valley-malls-events",
                "music-events"
            ];

            for (const ds of allDatasets) {
                if (ds === requestedSource) continue; // already checked
                matchedEvent = await fetchEventFromDataset(requestedID, ds);
                if (matchedEvent) break;
            }
        }
    }

    if (!matchedEvent) {
        console.warn("Event not found in any API dataset.");
        return;
    }

    // Update Page DOM elements securely
    document.querySelector(".event-name").textContent = matchedEvent.name;
    document.getElementById("event-venue").textContent = matchedEvent.venue;
    document.getElementById("event-date").textContent = matchedEvent.date;

    const overviewVenue = document.getElementById("overview-venue");
    if (overviewVenue) overviewVenue.textContent = matchedEvent.venue;

    const cardVenue = document.getElementById("card-venue");
    if (cardVenue) cardVenue.textContent = matchedEvent.venue;

    const cardDate = document.getElementById("card-date");
    if (cardDate) cardDate.textContent = matchedEvent.date;

    const priceText = (!matchedEvent.price || matchedEvent.price === "0" || /^free/i.test(matchedEvent.price)) 
        ? "Free Entry" 
        : (matchedEvent.price.startsWith("$") ? matchedEvent.price : `From AU$${matchedEvent.price}`);
    
    document.getElementById("event-price").textContent = priceText;

    const imgElement = document.getElementById("event-image");
    if (imgElement && matchedEvent.image) {
        imgElement.src = matchedEvent.image;
        imgElement.alt = matchedEvent.name;
    }
});

// Helper function to query a specific Brisbane City Council dataset
async function fetchEventFromDataset(slug, datasetId) {
    try {
        const apiURL = `https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/${datasetId}/records?limit=100`;
        const res = await fetch(apiURL);
        if (!res.ok) return null;
        
        const data = await res.json();
        const records = data.results || [];
        
        const match = records.find(r => r.subject && slugify(r.subject) === slug);
        if (match) {
            return {
                name: match.subject,
                venue: match.location,
                date: match.formatteddatetime || match.start_datetime,
                price: match.cost || "0",
                image: match.eventimage || "../images/eventcard1.png"
            };
        }
    } catch (e) {
        console.error(`Error fetching dataset ${datasetId}:`, e);
    }
    return null;
}