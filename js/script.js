// Wait until entire webpage HTML is fully loaded before running any code
document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    //  SUBNAV TABS LOGIC
    // =========================================================================
    // Finds all tab buttons and content sections on the page.
    const tabLinks = document.querySelectorAll('.sub-nav .tab-link');
    const sections = document.querySelectorAll('.content-sub-nav .left-side section');

    // Automatically sets the '#overview' tab and section as active when the page opens
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

    // Listens for clicks on any subnav tab link
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Stop the page from jumping or reloading

            // Remove 'active' class from all tabs and sections
            tabLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Highlight only the tab that was clicked
            link.classList.add('active');

            // Find the matching content section using the href attributes (e.g., #overview) and show it
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    // =========================================================================
    //  SAVE TO FAVOURITES LOGIC (with Browser Persistence)
    // =========================================================================
    // --- Save to Favourites logic with reliable persistence ---
    const saveBtn = document.getElementById("save-event-btn");
    const eventNameEl = document.querySelector(".event-name");
    
    if (saveBtn) {
        // Helper function to gather all current event details from the page HTML
        const getCurrentEventData = () => ({
            title: eventNameEl?.textContent.trim() || "Event Title",
            price: document.getElementById("event-price")?.textContent.trim() || "Free",
            venue: document.getElementById("card-venue")?.textContent.trim() || document.getElementById("event-venue")?.textContent.trim() || "Venue Location",
            date: document.getElementById("card-date")?.textContent.trim() || document.getElementById("event-date")?.textContent.trim() || "Event Date",
            image: document.getElementById("event-image")?.src || "../images/market.jpg",
            category: "General"
        });

        // Function to check if this event is already saved in browser storage and update button look
        const updateButtonState = () => {
            const eventData = getCurrentEventData();
            if (eventData.title === "Event Title") return; 

            // Get saved favourites list from browser memory (localStorage)
            let favourites = JSON.parse(localStorage.getItem("mika_favourites")) || [];
            const isSaved = favourites.some(fav => fav.title === eventData.title);

            // Change button text and colour depending on whether it's saved 
            if (isSaved) {
                saveBtn.textContent = "♥ Saved";
                saveBtn.style.backgroundColor = "#D45060";
            } else {
                saveBtn.textContent = "♡ Save";
                saveBtn.style.backgroundColor = "";
            }
        };

        // Run state check immediately
        updateButtonState();

        // Use a MutationObserver to watch the event title element
        // This updates the favourite button automatically once an API finishes loading the title text
        if (eventNameEl) {
            const observer = new MutationObserver(() => {
                updateButtonState();
            });
            observer.observe(eventNameEl, { childList: true, characterData: true, subtree: true });
        }

        // When the user clicks the save/favourites button
        saveBtn.addEventListener("click", () => {
            const eventData = getCurrentEventData();
            let favourites = JSON.parse(localStorage.getItem("mika_favourites")) || [];
            const index = favourites.findIndex(fav => fav.title === eventData.title);

            if (index === -1) {
                // If not in favourites yet, add it and save to browser storage
                favourites.push(eventData);
                localStorage.setItem("mika_favourites", JSON.stringify(favourites));
                saveBtn.textContent = "♥ Saved";
                saveBtn.style.backgroundColor = "#D45060";
            } else {
                // If already saved, removie it from favourites storage
                favourites.splice(index, 1);
                localStorage.setItem("mika_favourites", JSON.stringify(favourites));
                saveBtn.textContent = "♡ Save";
                saveBtn.style.backgroundColor = ""; 
            }
        });
    }
    
    
    // =========================================================================
    //  REVIEW FILTER BUTTONS TOGGLE LOGIC
    // =========================================================================
    // Allows users to click filter pills (e.g., "5 Stars", "Recent") to sort reviews
    const filterPills = document.querySelectorAll('.review-filters .filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            // Remove 'active' from all filter buttons, then add it to the clicked one
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
        });
    });

    // =========================================================================
    //  POST NEW REVIEW LOGIC
    // =========================================================================
    const postBtn = document.getElementById('post-review-btn');
    const reviewInput = document.getElementById('review-input');
    const reviewsList = document.getElementById('reviews-list');

    if (postBtn && reviewInput && reviewsList) {
        
        // Helper function to create a unique storage key based on the event title
        const getReviewStorageKey = () => {
            const eventTitle = eventNameEl?.textContent.trim() || "default_event";
            return `mika_reviews_${eventTitle}`;
        };

        // Pulls previously saved reviews from browser memory and places them at the top without touching your static HTML reviews.
        const loadSavedReviews = () => {
            const storageKey = getReviewStorageKey();
            const savedReviews = JSON.parse(localStorage.getItem(storageKey)) || [];
            
            // Loop through saved reviews and prepend them so they appear above static reviews
            savedReviews.slice().reverse().forEach(text => {
                const reviewCard = document.createElement('article');
                reviewCard.className = 'review-card user-posted-review';
                reviewCard.innerHTML = `
                    <div class="avatar-circle avatar-user">YOU</div>
                    <div class="review-body">
                        <h4 class="reviewer-name">You</h4>
                        <p class="review-text">${text}</p>
                    </div>
                `;
                reviewsList.prepend(reviewCard);
            });
        };

        // Run this load function immediately when the page opens
        loadSavedReviews();

        // Create & Post new review
        const createAndPostReview = () => {
            const text = reviewInput.value.trim();
            if (!text) return; // Stop if input box is empty

            // Build the new review card element on the fly
            const newReviewCard = document.createElement('article');
            newReviewCard.className = 'review-card user-posted-review';
            newReviewCard.innerHTML = `
                <div class="avatar-circle avatar-user">YOU</div>
                <div class="review-body">
                    <h4 class="reviewer-name">You</h4>
                    <p class="review-text">${text}</p>
                </div>
            `;
            
            // Add the review to the very top of the list on the screen
            reviewsList.prepend(newReviewCard);

            // Save the review text into browser LocalStorage so it stays after a refresh
            const storageKey = getReviewStorageKey();
            let savedReviews = JSON.parse(localStorage.getItem(storageKey)) || [];
            savedReviews.push(text);
            localStorage.setItem(storageKey, JSON.stringify(savedReviews));

            // Clear out the input box text
            reviewInput.value = '';
        };

        // Trigger when clicking the post button
        postBtn.addEventListener('click', createAndPostReview);
        
        // Also trigger when pressing the "Enter" key
        reviewInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                createAndPostReview();
            }
        });
    }

    // =========================================================================
    //  DYNAMIC EVENT MAP LOGIC (Leaflet & Nominatim Geocoding API)
    // =========================================================================
    const mapContainer = document.getElementById("map");
    if (!mapContainer) return;

    // Initialise the Leaflet map centred over Brisbane, Australia
    var myMap = A = L.map("map").setView([-27.4698, 153.0251], 13);
    
    // Load OpenStreetMap design tiles onto map container
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(myMap);

    // Fix Default marker icon image link in Leaflet
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    // Wait 800 milliseconds for external API text data to render in the HTML
    setTimeout(() => {
        const venueText = document.getElementById("event-venue")?.textContent || "";
        const eventTitle = document.querySelector(".event-name")?.textContent || "Event Location";

        if (!venueText || venueText === "Venue Location") {
            console.warn("Venue location not yet loaded from API.");
            myMap.invalidateSize();
            return;
        }

        // Clean up duplicated address words for a cleaner map search query 
        let cleanVenue = venueText;
        if (cleanVenue.toLowerCase().includes("petrie terrace gallery")) {
            cleanVenue = "Petrie Terrace Gallery, Petrie Terrace";
        }

        // Format the address string and encode it safely into a URL search query
        const queryAddress = `${cleanVenue}, Brisbane, Queensland, Australia`;
        const geocodeURL = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryAddress)}`;

        // Fetch geographic coordinates (latitude and longtitude) from OpenStreetMap
        fetch(geocodeURL)
            .then(res => res.json())
            .then(results => {
                let lat, lon;
                if (results && results.length > 0) {
                    lat = parseFloat(results[0].lat);
                    lon = parseFloat(results[0].lon);
                } else {
                    // Fallback coordinates if search fails 
                    console.warn("Using fallback coordinates for Petrie Terrace Gallery");
                    lat = -27.4583;
                    lon = 153.0135;
                }

                // Move map camera to location, drop a pin, and open the popup label
                myMap.setView([lat, lon], 16);
                L.marker([lat, lon]).addTo(myMap)
                    .bindPopup(`<strong>${eventTitle}</strong><br>${venueText}`)
                    .openPopup();
                myMap.invalidateSize();
            })
    }, 800);
});


// ============================================================================
//  FOLLOW HOST BUTTON LOGIC
// ============================================================================
// Allows users to follow or unfollow event hosts, remembering their choice using browser storage
const followBtn = document.getElementById("follow-host-btn");
const hostNameEl = document.querySelector(".host-name");

if (followBtn) {
    // Generates a unqiue storage key using the host's name 
    const getHostKey = () => {
        const hostName = hostNameEl?.textContent.trim() || "Host Name";
        return `mika_followed_${hostName}`;
    };
    // Check browser memory (localStorage) to see if this host is already followed and styles the button
    const updateFollowState = () => {
        const hostKey = getHostKey();
        const isFollowed = localStorage.getItem(hostKey) === "true";

        if (isFollowed) {
            followBtn.textContent = "Following";
            followBtn.style.backgroundColor = "#D45060";
            followBtn.style.color = "#fff";
        } else {
            followBtn.textContent = "Follow";
            followBtn.style.backgroundColor = "";
            followBtn.style.color = "";
        }
    };

    // Run the check immediately on page load
    updateFollowState();

    // Uses a MutationObserver to watch if the host name loads later via an API, then updates button state
    if (hostNameEl) {
        const hostObserver = new MutationObserver(() => {
            updateFollowState();
        });
        hostObserver.observe(hostNameEl, { childList: true, characterData: true, subtree: true });
    }

    // When the user clicks the follow button, toggle between following and unfollowing
    followBtn.addEventListener("click", () => {
        const hostKey = getHostKey();
        const isFollowed = localStorage.getItem(hostKey) === "true";

        if (isFollowed) {
            localStorage.removeItem(hostKey); // Remove from saved memory
        } else {
            localStorage.setItem(hostKey, "true"); // Save to browser memory
        }
        updateFollowState(); // Refresh button look
    });
}

// ============================================================================
//  BRISBANE DATABASE CONNECTION HELPER (API Data Loader)
// ============================================================================
// Takes raw data returned from Brisbane City Council's database and builds HTML elements for each record
function iterateRecords(data) {
    var records = data.results;
    if (!records) return;

    // Loop through each event record returned by the database
    Object.values(records).forEach(value => {
        var subject = value["subject"];
        var location = value["location"];
        var start_datetime = value["start_datetime"];
        var end_datetime = value["end_datetime"];
        var formatteddatetime = value["formatteddatetime"];
        
        // If mandatory details exist, create a new card section and inject it into the webpage
        if(subject && location && start_datetime) {
            $("#records").append(
                $('<section class="record">').append(
                    $('<h2>').text(subject),$('<p>').text("Location: "+location),
                    $('<p>').text("Start Time: "+start_datetime),
                    $('<p>').text("End Time: "+end_datetime),
                    $('<p>').text("Formatted Date: "+formatteddatetime)
                )
            );
        }
    });
}

// Runs when the document is fully ready, sending a request to Brisban'e Open Data API
$(document).ready(function() {
    const creativeEventsAPIURL = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/creative-events/records";
    const requestParams = { limit: 20 };
    const queryString = new URLSearchParams(requestParams).toString();
    const fullURL = creativeEventsAPIURL + "?" + queryString;
    
    // Fetch data from web API
    fetch(fullURL)
        .then(response => response.json())
        .then(data => iterateRecords(data))
        .catch(error => console.error("Error fetching data:", error));
});

// ============================================================================
//  TICKET MODAL POPUP & CART LOGIC
// ============================================================================
const modal = document.getElementById('ticket-modal');
const getTicketsBtn = document.querySelector('.get-tickets');
const closeBtn = document.getElementById('modal-close-btn');

if (getTicketsBtn && modal) {
    let currentQty = 1;             // default ticket quantity
    let currentUnitPrice = 20;      // default price
    let isFreeEvent = false;        // tracks whether the event is free

    // Grab elements inside the modal where totals and descriptions are displayed
    const qtySpan = document.getElementById('ticket-qty');
    const tierTotalEl = document.getElementById('selected-tier-total');
    const cartItemDesc = document.getElementById('cart-item-desc');
    const cartItemPrice = document.getElementById('cart-item-price');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const ticketTypesContainer = document.querySelector('.ticket-types');

    // Function to calculate and update all price labels and counters on the screen 
    const updateTotals = () => {
        if (qtySpan) qtySpan.textContent = currentQty;
        const total = currentQty * currentUnitPrice;
        const formattedTotal = isFreeEvent || currentUnitPrice === 0 ? "Free" : `AU$${total.toFixed(2)}`;
        
        if (tierTotalEl) tierTotalEl.textContent = formattedTotal;
        
        const tierName = document.getElementById('selected-tier-name')?.textContent || "Ticket";
        if (cartItemDesc) cartItemDesc.textContent = `${currentQty}x ${tierName}`;
        if (cartItemPrice) cartItemPrice.textContent = formattedTotal;
        if (cartTotalPrice) cartTotalPrice.textContent = formattedTotal;
    };

    // When user clicks "Get Tickets" , open the modal and populate data from the page
    getTicketsBtn.addEventListener('click', () => {
        document.getElementById('modal-event-title').textContent = document.querySelector('.event-name')?.textContent || "Event Title";
        document.getElementById('modal-host-name').textContent = document.querySelector('.host-name')?.textContent || "Host Name";
        document.getElementById('modal-venue').textContent = document.getElementById('card-venue')?.textContent || document.getElementById('event-venue')?.textContent || "Venue Location";
        document.getElementById('modal-date').textContent = document.getElementById('card-date')?.textContent || document.getElementById('event-date')?.textContent || "Event Date";
        
        // Parse event price text to figure out if it's free or has numeric price
        const rawPriceText = document.getElementById('event-price')?.textContent.trim() || "Free";
        const numericMatch = rawPriceText.match(/\d+(\.\d+)?/);
        
        if (!numericMatch || rawPriceText.toLowerCase().includes("free") || parseFloat(numericMatch[0]) === 0) {
            isFreeEvent = true;
            currentUnitPrice = 0;
        } else {
            isFreeEvent = false;
            currentUnitPrice = parseFloat(numericMatch[0]);
        }

        // Dynamically generate ticket selection buttons depending on whether it's free
        if (ticketTypesContainer) {
            if (isFreeEvent) {
                ticketTypesContainer.innerHTML = `
                    <button type="button" class="ticket-type-pill active" data-type="Free Admission" data-price="0">
                        <i class="fa-solid fa-ticket"></i> Free Admission
                    </button>
                `;
            } else {
                ticketTypesContainer.innerHTML = `
                    <button type="button" class="ticket-type-pill active" data-type="General Admission" data-price="${currentUnitPrice}">
                        General Admission
                    </button>
                    <button type="button" class="ticket-type-pill" data-type="Accessible Seating" data-price="${currentUnitPrice}">
                        <i class="fa-solid fa-wheelchair"></i> Accessible Seating
                    </button>
                `;
            }

            // Allow users to click different ticket type pills to switch types 
            document.querySelectorAll('.ticket-type-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    document.querySelectorAll('.ticket-type-pill').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                    
                    const tierName = pill.getAttribute('data-type');
                    currentUnitPrice = parseFloat(pill.getAttribute('data-price'));
                    document.getElementById('selected-tier-name').textContent = tierName;
                    currentQty = 1; // Reset quantity back to 1 when switching ticket types
                    updateTotals();
                });
            });
        }

        // Set initial modal view states
        document.getElementById('selected-tier-name').textContent = isFreeEvent ? "Free Admission" : "General Admission";
        currentQty = 1;
        updateTotals();

        // Change checkout button text depending on whether tickets cost money or are free
        const proceedCheckoutBtn = document.getElementById('proceed-checkout-btn');
        if (proceedCheckoutBtn) {
            proceedCheckoutBtn.textContent = isFreeEvent ? "Register" : "Checkout";
        }

        modal.hidden = false; // Show the modal popup window
    });

    // Close modal when clicking the 'X' close button
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.hidden = true;
        });
    }

    // Close modal if user clicks anywhere on the dark background backdrop outside the box
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.hidden = true;
        }
    });

    // Plus (+) quantity counter button logic
    const qtyPlus = document.getElementById('qty-plus');
    const qtyMinus = document.getElementById('qty-minus');
    if (qtyPlus) {
        qtyPlus.addEventListener('click', () => {
            currentQty++;
            updateTotals();
        });
    }

    // Minus (-) quantity counter button logic (prevents going below 1 ticket)
    if (qtyMinus) {
        qtyMinus.addEventListener('click', () => {
            if (currentQty > 1) {
                currentQty--;
                updateTotals();
            }
        });
    }

    // VIEW SWITCHING LOGIC (Checkout vs. Register & Booking Flow)
    const ticketSelectionView = document.getElementById('ticket-selection-view');
    const checkoutView = document.getElementById('checkout-view');
    const proceedCheckoutBtn = document.getElementById('proceed-checkout-btn');
    const backToTicketsBtn = document.getElementById('back-to-tickets-btn');
    let isAtCheckout = false; // Tracks whether the user is currently looking at the checkout/payment screen

    if (proceedCheckoutBtn && checkoutView && ticketSelectionView) {

        // When the main action button (Checkout / Pay / Book) is clicked
        proceedCheckoutBtn.addEventListener('click', () => {

            // STEP 1: If we are still on the ticket selection screen, move to checkout 
            if (!isAtCheckout) {
                ticketSelectionView.hidden = true;      // Hide ticket options
                checkoutView.hidden = false;            // Show checkout screen
                isAtCheckout = true;
                
                // Grab checkout header title and billing/payment options container
                const checkoutHeaderTitle = checkoutView.querySelector('.modal-event-title');
                const billingSection = checkoutView.querySelector('.billing-info-section');
                
                // Adjust wording and fields depending on whether the event is free or paid
                if (isFreeEvent) {
                    if (checkoutHeaderTitle) checkoutHeaderTitle.textContent = "Register";
                    if (billingSection) billingSection.hidden = true; // Hide credit card box for free events
                    proceedCheckoutBtn.textContent = "Book";
                } else {
                    if (checkoutHeaderTitle) checkoutHeaderTitle.textContent = "Checkout";
                    if (billingSection) billingSection.hidden = false; // Show payment fields for paid events
                    proceedCheckoutBtn.textContent = "Pay";
                }

            } else {
                
                // STEP 2: Confirmation State (User has clicked Book or Pay)
                proceedCheckoutBtn.textContent = isFreeEvent ? "Booked!" : "Paid";
                proceedCheckoutBtn.style.backgroundColor = "#D45060";
                proceedCheckoutBtn.disabled = true; // Turn button success color

                // Gather event details to save into the user's "Attending" events history
                const eventData = {
                    title: document.getElementById('modal-event-title')?.textContent.trim() || "Event Title",
                    venue: document.getElementById('modal-venue')?.textContent.trim() || "Venue Location",
                    date: document.getElementById('modal-date')?.textContent.trim() || "Event Date",
                    image: document.getElementById('event-image')?.src || "../images/market.jpg",
                    category: "Attending",
                    status: "Attending"
                };

                // Save the event into browser storage under "mika_my_events"
                let myEvents = JSON.parse(localStorage.getItem("mika_my_events")) || [];
                const alreadyAdded = myEvents.some(ev => ev.title === eventData.title);
                if (!alreadyAdded) {
                    myEvents.push(eventData);
                    localStorage.setItem("mika_my_events", JSON.stringify(myEvents));
                }

                // Wait 1.5 seconds, then close the modal and reset everything back to the start state
                setTimeout(() => {
                    modal.hidden = true;
                    proceedCheckoutBtn.textContent = isFreeEvent ? "Register" : "Checkout";
                    proceedCheckoutBtn.style.backgroundColor = "";
                    proceedCheckoutBtn.disabled = false;
                    checkoutView.hidden = true;
                    ticketSelectionView.hidden = false;
                    isAtCheckout = false;
                }, 1500);
            }
        });

        // Back button logic: allows users to go back from checkout to ticket selection
        if (backToTicketsBtn) {
            backToTicketsBtn.addEventListener('click', () => {
                checkoutView.hidden = true;
                ticketSelectionView.hidden = false;
                isAtCheckout = false;
                proceedCheckoutBtn.textContent = isFreeEvent ? "Register" : "Checkout";
            });
        }
    }

    // Modal Heart / Save Logic
    // Synchronizes the heart favorite buttons inside the modal popup with browser storage
    const modalFavBtns = document.querySelectorAll('.modal-overlay .fav-btn');
    if (modalFavBtns.length > 0) {

        // Function to check if the current event is saved in favourites and style the modal heart icons
        const updateModalFavButtonsState = () => {
            const eventTitle = document.querySelector('.event-name')?.textContent.trim() || "Event Title";
            let favourites = JSON.parse(localStorage.getItem("mika_favourites")) || [];
            const isSaved = favourites.some(fav => fav.title === eventTitle);

            modalFavBtns.forEach(btn => {
                if (isSaved) {
                    btn.textContent = "♥";
                    btn.classList.add("is-active");
                    btn.style.color = "#D45060";
                } else {
                    btn.textContent = "♡";
                    btn.classList.remove("is-active");
                    btn.style.color = "";
                }
            });
        };

        // Update heart button look whenever the ticket modal is opened
        getTicketsBtn.addEventListener('click', updateModalFavButtonsState);

        // When a user clicks the heart icon inside the modal window
        modalFavBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const eventData = {
                    title: document.querySelector('.event-name')?.textContent.trim() || "Event Title",
                    price: document.getElementById("event-price")?.textContent.trim() || "Free",
                    venue: document.getElementById("card-venue")?.textContent.trim() || document.getElementById("event-venue")?.textContent.trim() || "Venue Location",
                    date: document.getElementById("card-date")?.textContent.trim() || document.getElementById("event-date")?.textContent.trim() || "Event Date",
                    image: document.getElementById("event-image")?.src || "../images/market.jpg",
                    category: "General"
                };

                // Add or remove the event from browser localStorage favourites
                let favourites = JSON.parse(localStorage.getItem("mika_favourites")) || [];
                const index = favourites.findIndex(fav => fav.title === eventData.title);

                if (index === -1) {
                    favourites.push(eventData); // Save to favourites
                } else {
                    favourites.splice(index, 1); // Remove from favourites
                }
                
                localStorage.setItem("mika_favourites", JSON.stringify(favourites));
                updateModalFavButtonsState(); // Refresh modal heart icon appearance
                
                // Also update the main page's favorite button so everything stays synced up
                const mainSaveBtn = document.getElementById("save-event-btn");
                if (mainSaveBtn) {
                    const isNowSaved = favourites.some(fav => fav.title === eventData.title);
                    if (isNowSaved) {
                        mainSaveBtn.textContent = "♥ Saved";
                        mainSaveBtn.style.backgroundColor = "#D45060";
                    } else {
                        mainSaveBtn.textContent = "♡ Save";
                        mainSaveBtn.style.backgroundColor = "";
                    }
                }
            });
        });
    }
}

