// ============================================================================
//  SLUGIFY HELPER FUNCTION
// ============================================================================
// Converts regular event titles into clean URL-friendly slugs (e.g., "Art Workshop 101!" becomes "art-workshop-101")
function slugify(name) {
    return name
        .toLowerCase()                     // Convert all letters to lowercase
        .trim()                            // Remove extra spaces from start and end
        .replace(/[^a-z0-9]+/g, "-")       // Replace special characters and spaces with hyphens (-)
        .replace(/(^-|-$)/g, "");          // Remove any leftover hyphens at the very beginning or end
}


// ============================================================================
//  MAIN BOOKING LOADER FUNCTION
// ============================================================================
async function initBookingLoader() {
    
    // Look at the web address URL parameters (e.g., ?event=art-workshop or ?id=123) to see which event was requested
    const urlParams = new URLSearchParams(window.location.search);
    const requestedID = urlParams.get("event") || urlParams.get("id");

    let matchedEvent = null;

    // STEP 1: INSTANT CACHE LOOKUP 
    // Read the last-clicked event stored in the browser's memory (localStorage)
    const cachedEvent = localStorage.getItem("mika_current_event");
    if (cachedEvent) {
        try {
            const parsed = JSON.parse(cachedEvent); // Convert text back into a usable JavaScript object
            
            // If no ID was requested, or if the cached event's name matches the requested URL slug, use it!
            if (!requestedID || slugify(parsed.name) === requestedID) {
                matchedEvent = parsed;
            }
        } catch (error) {
            console.warn("Could not parse cached event:", error);
        }
    }

    // STEP 2: SAFE DEFAULT FALLBACK 
    // If no cached event was found, fall back to a default sample event so the page doesn't look blank
    if (!matchedEvent) {
        matchedEvent = {
            name: "Petrie Terrace Gallery Exhibition",
            venue: "Petrie Terrace Gallery, Petrie Terrace",
            date: "Sat, 24 Oct 2026, 12 - 3pm",
            price: "375",
            image: "../images/eventcard1.png"
        };
    }

    // =========================================================================
    //  POPULATE THE WEBPAGE DOM ELEMENTS WITH EVENT DATA
    // =========================================================================
    
    // Update main event title text on the page
    const eventNameEl = document.querySelector(".event-name");
    if (eventNameEl) eventNameEl.textContent = matchedEvent.name;

    // Update venue text wherever venue elements exist on the page
    const eventVenueEl = document.getElementById("event-venue");
    if (eventVenueEl) eventVenueEl.textContent = matchedEvent.venue;

    const overviewVenue = document.getElementById("overview-venue");
    if (overviewVenue) overviewVenue.textContent = matchedEvent.venue;

    const cardVenue = document.getElementById("card-venue");
    if (cardVenue) cardVenue.textContent = matchedEvent.venue;

    // Update date text wherever date elements exist on the page
    const eventDateEl = document.getElementById("event-date");
    if (eventDateEl) eventDateEl.textContent = matchedEvent.date;

    const cardDate = document.getElementById("card-date");
    if (cardDate) cardDate.textContent = matchedEvent.date;

    // Format and display the price tag (handles free events, raw numbers, and already-formatted currency)
    const priceEl = document.getElementById("event-price");
    if (priceEl) {
        const priceText = (!matchedEvent.price || matchedEvent.price === "0" || /^free/i.test(matchedEvent.price)) 
            ? "Free Entry" 
            : (matchedEvent.price.startsWith("$") ? matchedEvent.price : `From AU$${matchedEvent.price}`);
        priceEl.textContent = priceText;
    }

    // Update the event image source and alt text
    const imgElement = document.getElementById("event-image");
    if (imgElement && matchedEvent.image) {
        imgElement.src = matchedEvent.image;
        imgElement.alt = matchedEvent.name;
    }
}


// ============================================================================
//  EXECUTION TRIGGER
// ============================================================================
// Checks if the document is still loading; if so, waits for 'DOMContentLoaded'. Otherwise, runs immediately.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBookingLoader);
} else {
    initBookingLoader();
}