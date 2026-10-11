//subnav tabs and save to favourites button logic
document.addEventListener('DOMContentLoaded', () => {
    // --- Sub-nav tab switching ---
    const tabLinks = document.querySelectorAll('.sub-nav .tab-link');
    const sections = document.querySelectorAll('.content-sub-nav .left-side section');

    sections.forEach(section => {
        if (section.id === 'overview') {
            section.classList.add('active');
        }
    });
    tabLinks.forEach(link => {
        if (link.getAttribute('href') === '#overview') {
            link.classList.add('active');
        }
    });

    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            tabLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            link.classList.add('active');
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    // --- Save to Favourites logic with reliable persistence ---
    const saveBtn = document.getElementById("save-event-btn");
    const eventNameEl = document.querySelector(".event-name");
    
    if (saveBtn) {
        const getCurrentEventData = () => ({
            title: eventNameEl?.textContent.trim() || "Event Title",
            price: document.getElementById("event-price")?.textContent.trim() || "Free",
            venue: document.getElementById("card-venue")?.textContent.trim() || document.getElementById("event-venue")?.textContent.trim() || "Venue Location",
            date: document.getElementById("card-date")?.textContent.trim() || document.getElementById("event-date")?.textContent.trim() || "Event Date",
            image: document.getElementById("event-image")?.src || "../images/market.jpg",
            category: "General"
        });

        const updateButtonState = () => {
            const eventData = getCurrentEventData();
            // Ignore if it's still showing the default placeholder
            if (eventData.title === "Event Title") return; 

            let favourites = JSON.parse(localStorage.getItem("mika_favourites")) || [];
            const isSaved = favourites.some(fav => fav.title === eventData.title);

            if (isSaved) {
                saveBtn.textContent = "♥ Saved";
                saveBtn.style.backgroundColor = "#800020";
            } else {
                saveBtn.textContent = "♡ Save";
                saveBtn.style.backgroundColor = "";
            }
        };

        // Check immediately and also use a MutationObserver to catch when the loader updates the title text
        updateButtonState();

        if (eventNameEl) {
            const observer = new MutationObserver(() => {
                updateButtonState();
            });
            observer.observe(eventNameEl, { childList: true, characterData: true, subtree: true });
        }

        // Handle click to toggle save/unsave
        saveBtn.addEventListener("click", () => {
            const eventData = getCurrentEventData();
            let favourites = JSON.parse(localStorage.getItem("mika_favourites")) || [];
            const index = favourites.findIndex(fav => fav.title === eventData.title);

            if (index === -1) {
                favourites.push(eventData);
                localStorage.setItem("mika_favourites", JSON.stringify(favourites));
                saveBtn.textContent = "♥ Saved";
                saveBtn.style.backgroundColor = "#800020";
            } else {
                favourites.splice(index, 1);
                localStorage.setItem("mika_favourites", JSON.stringify(favourites));
                saveBtn.textContent = "♡ Save";
                saveBtn.style.backgroundColor = ""; 
            }
        });
    }
});

//S FOR CONNECTING BRISBANE DATABASE TO THE FRONT END//
function iterateRecords(data) {
    // Log the data to the console so that we can see what is being passed to the function
    console.log("Data returned: "+JSON.stringify(data));
    // Looking at what is returned, we can see that the data records are stored in the results object, which we pull out so we can iterate over each record
    var records = data.results;
    //to iterate over each of the values, we use Object.values - passing it the records and then using forEach to look at each value in the object
    Object.values(records).forEach(value => {
        
        // what other data can we get from the records?
        var subject = value["subject"];
        var location = value["location"];
        var start_datetime = value["start_datetime"];
        var end_datetime = value["end_datetime"];
        var formatteddatetime = value["formatteddatetime"];
        
        // check that we have data for each of the fields we want to display
        if(subject && location && start_datetime) {
                // Use jQuery DOM manipulation to insert a section for each record in the set
                $("#records").append(
                    $('<section class="record">').append(
                        $('<h2>').text(subject),
                        $('<p>').text("Location: "+location),
                        $('<p>').text("Start Time: "+start_datetime),
                        $('<p>').text("End Time: "+end_datetime),
                        $('<p>').text("Formatted Date: "+formatteddatetime)
                    )
                );
        }
    });
}
/** 
* When the document has loaded, we will call the API and request some data.
*/
$(document).ready(function() {
    var data = {};
    // set the base URL for the dataset you are connecting to
    const creativeEventsAPIURL = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/creative-events/records";
    // define request parameters that can be sent to refine the results. What other parameters could we send for this dataset?
    const requestParams = {
        limit: 20, // the number of records to return
        // **** where: 'subject: "Clock Tower Tour" AND location: "Museum of Brisbane, Brisbane City"' // the subject and location to return records for
        };
    //create a string from the request parameter object that we can add to the end of the API url
    const queryString = new URLSearchParams(requestParams).toString(); //slightly convoluted way to construct the URL but can help to avoid errors in the text
    
    //construct the full API call URl by concatenating the apiURL with the request parameters, the ? indicates there are parameters to come
    const fullURL = creativeEventsAPIURL + "?" + queryString;
    
    console.log("URL: " + fullURL); // log the fullURL for error checking
    
    /**
    * Using fetch, we pass it the fullURL to connect to, 
    * We specify that we want the response to return json - what other response formats can we ask for?
    * We specify a function to process the data that is returned
    * We specify how to deal with errors that occur
    */
    fetch(fullURL)
        .then(response => response.json())
        .then(data => iterateRecords(data))
        .catch(error => console.error("Error fetching data:", error));
});

// For Map in Browsing Page Overview //
function iterateMapRecords(data) {
    var myMap = L.map("map").setView([-27, 153], 8);
    
    L.tileLayer("https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiazI5NDgiLCJhIjoiY212MjBiOGdnMDBqaDJ4cHZ6cml1cnBhcCJ9.Op705rX5vE2Waabq3-AwqQ", {
      maxZoom: 18,
      id: 'mapbox/streets-v11',
      tileSize: 512,
      zoomOffset: -1,
    }).addTo(myMap);

    var defaultCustomIcon = L.icon({
        iconUrl: '../images/marker-icon.png',
        iconRetinaUrl: '../images/marker-icon-2x.png',
        shadowUrl: '../images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    var records = data.result && data.result.records ? data.result.records : [];

    if (records.length === 0) {
        return;
    }

    Object.entries(records).forEach(([key, value]) => {
        var lat = value["Lat"] || (value["geolocation"] ? value["geolocation"]["lat"] : null);
        var long = value["Lon"] || (value["geolocation"] ? value["geolocation"]["lon"] : null);
        
        var recordTitle = value["Title"] || value["subject"];
        var recordLink = value["Link"] || value["web_link"];
        var recordDescription = value["Description"] || value["description"];
        
        var parsedLat = parseFloat(lat);
        var parsedLong = parseFloat(long);

        if (!isNaN(parsedLat) && !isNaN(parsedLong)) {
            var marker = L.marker([parsedLat, parsedLong], { icon: defaultCustomIcon }).addTo(myMap);
            var popupText = "<strong>" + recordTitle + "</strong><br /><a href='" + recordLink + "'>" + recordLink + "</a><br />" + recordDescription;
            var popUp = L.popup({
                content: popupText, 
                className: "mapUp"
            });
            marker.bindPopup(popUp);
        }
    });

    setTimeout(function() {
        myMap.invalidateSize();
    }, 100);
}

$(document).ready(function() {
    const apiURL = "https://www.data.qld.gov.au/api/3/action/datastore_search";
    const requestParams = {
        resource_id: "9eaeeceb-e8e3-49a1-928a-4df76b059c2d",
        limit: 100,
        q: "queensland"
    };
    const queryString = new URLSearchParams(requestParams).toString();
    const fullURL = apiURL + "?" + queryString;
    
    fetch(fullURL)
        .then(response => response.json())
        .then(data => iterateMapRecords(data))
        .catch(error => console.error("Error fetching data:", error));
});

// --- Ticket Modal Popup Logic AI WILL CHANGE AFTER MON ---
const modal = document.getElementById('ticket-modal');
const getTicketsBtn = document.querySelector('.get-tickets');
const closeBtn = document.getElementById('modal-close-btn');

if (getTicketsBtn && modal) {
    // Open modal on click
    getTicketsBtn.addEventListener('click', () => {
        // Pull current event info from the page to populate the modal
        document.getElementById('modal-event-title').textContent = document.querySelector('.event-name')?.textContent || "Event Title";
        document.getElementById('modal-host-name').textContent = document.getElementById('event-host')?.textContent || "Host Name";
        document.getElementById('modal-venue').textContent = document.getElementById('card-venue')?.textContent || "Venue Location";
        document.getElementById('modal-date').textContent = document.getElementById('card-date')?.textContent || "Event Date";
        
        modal.hidden = false;
    });

    // Close modal on click of X
    closeBtn.addEventListener('click', () => {
        modal.hidden = true;
    });

    // Close modal when clicking outside the container backdrop
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.hidden = true;
        }
    });

    // Interactive quantity and price calculation inside modal
    let currentQty = 1;
    let currentUnitPrice = 20;

    const qtySpan = document.getElementById('ticket-qty');
    const tierTotalEl = document.getElementById('selected-tier-total');
    const cartItemDesc = document.getElementById('cart-item-desc');
    const cartItemPrice = document.getElementById('cart-item-price');
    const cartTotalPrice = document.getElementById('cart-total-price');

    const updateTotals = () => {
        qtySpan.textContent = currentQty;
        const total = currentQty * currentUnitPrice;
        const formattedTotal = `AU$${total.toFixed(2)}`;
        
        tierTotalEl.textContent = formattedTotal;
        cartItemDesc.textContent = `${currentQty}x ${document.getElementById('selected-tier-name').textContent}`;
        cartItemPrice.textContent = formattedTotal;
        cartTotalPrice.textContent = formattedTotal;
    };

    document.getElementById('qty-plus').addEventListener('click', () => {
        currentQty++;
        updateTotals();
    });

    document.getElementById('qty-minus').addEventListener('click', () => {
        if (currentQty > 1) {
            currentQty--;
            updateTotals();
        }
    });

    // Handle clicking different ticket tier pills
    document.querySelectorAll('.ticket-type-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.ticket-type-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            const tierName = pill.getAttribute('data-type');
            currentUnitPrice = parseFloat(pill.getAttribute('data-price'));
            document.getElementById('selected-tier-name').textContent = tierName;
            currentQty = 1; // reset quantity on tier switch
            updateTotals();
        });
    });

    // --- View Switching and Payment Logic ---
    const ticketSelectionView = document.getElementById('ticket-selection-view');
    const checkoutView = document.getElementById('checkout-view');
    const proceedCheckoutBtn = document.getElementById('proceed-checkout-btn');
    const backToTicketsBtn = document.getElementById('back-to-tickets-btn');

    let isAtCheckout = false;

    if (proceedCheckoutBtn && checkoutView && ticketSelectionView) {
        proceedCheckoutBtn.addEventListener('click', () => {
            if (!isAtCheckout) {
                // Step 1: Switch from Ticket Selection view to Checkout Form view
                ticketSelectionView.hidden = true;
                checkoutView.hidden = false;
                isAtCheckout = true;
                
                // Change button text from "Checkout" to "Pay"
                proceedCheckoutBtn.textContent = "Pay";
            } else {
            // Step 2: Clicked "Pay" -> Handle successful payment state
            proceedCheckoutBtn.textContent = "Paid ✓";
            proceedCheckoutBtn.style.backgroundColor = "#2E6B3A"; 
            proceedCheckoutBtn.disabled = true;

            // --- SAVE EVENT TO "MY EVENTS" ---
            const eventData = {
                title: document.getElementById('modal-event-title')?.textContent.trim() || "Event Title",
                venue: document.getElementById('modal-venue')?.textContent.trim() || "Venue Location",
                date: document.getElementById('modal-date')?.textContent.trim() || "Event Date",
                image: document.getElementById('event-image')?.src || "../images/market.jpg",
                category: "Attending", // or whatever category/status label you use
                status: "Attending"
            };

            // Get existing user events or initialize an empty array
            let myEvents = JSON.parse(localStorage.getItem("mika_my_events")) || [];
            
            // Check if it's already added to avoid duplicates
            const alreadyAdded = myEvents.some(ev => ev.title === eventData.title);
            if (!alreadyAdded) {
                myEvents.push(eventData);
                localStorage.setItem("mika_my_events", JSON.stringify(myEvents));
            }
            // ---------------------------------

            setTimeout(() => {
                modal.hidden = true;
                // Reset everything for next time
                proceedCheckoutBtn.textContent = "Checkout";
                proceedCheckoutBtn.style.backgroundColor = "";
                proceedCheckoutBtn.disabled = false;
                checkoutView.hidden = true;
                ticketSelectionView.hidden = false;
                isAtCheckout = false;
            }, 1500);
        }
        });

        if (backToTicketsBtn) {
            backToTicketsBtn.addEventListener('click', () => {
                checkoutView.hidden = true;
                ticketSelectionView.hidden = false;
                isAtCheckout = false;
                proceedCheckoutBtn.textContent = "Checkout";
        });
    }
    }
}