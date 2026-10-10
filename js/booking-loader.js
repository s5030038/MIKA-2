document.addEventListener("DOMContentLoaded", () => {
    //Get all keys from EVENTS object//
    const eventKeys = Object.keys(EVENTS);

    if (eventKeys.length == 0) {
        console.error("No events found in this dataset.");
        return;
    }

    //Read URL query parameter//
    const urlParams = new URLSearchParams(window.location.search);
    const requestedID = urlParams.get("id") || urlParams.get("event");

    //Define activeKey dynamically//
    const activeKey = (requestedID && EVENTS[requestedID]) ? requestedID : eventKeys[0];
    const event = EVENTS[activeKey];

    if (!event) return;

    //Update the page dynamically using matched event//
    document.title = `${event.name} - Bookings`;

    document.getElementById("event-name").textContent = event.name;
    document.getElementById("event-venue").textContent = event.venue;
    document.getElementById("event-date").textContent = event.date;

    if (document.getElementById("overview-venue")) {
        document.getElementById("overview-venue").textContent = event.venue;
    }

    //Format price//
    const priceText = event.price == 0? "Free Entry" : `From AU$${event.price}`;
    document .getElementById("event-price").textContent = event.price;

    //Image Update//
    const imgElement = document.getElementById("event-image");
    if (imgElement && event.image) {
        imgElement.src = event.image;
        imgElement.alt = event.name;
    }
});
