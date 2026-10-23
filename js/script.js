//script.js
//subnav tabs and save to favourites button logic
document.addEventListener('DOMContentLoaded', () => {
    // --- Dynamic Event Map Logic using API Location ---
    const mapContainer = document.getElementById("map");
    if (!mapContainer) return;
    var myMap = A = L.map("map").setView([-27.4698, 153.0251], 13);
    
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(myMap);
    // Fix Leaflet Default Icon Path 404 Errors explicitly
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
    setTimeout(() => {
        const venueText = document.getElementById("event-venue")?.textContent || "";
        const eventTitle = document.querySelector(".event-name")?.textContent || "Event Location";
        if (!venueText || venueText === "Venue Location") {
            console.warn("Venue location not yet loaded from API.");
            myMap.invalidateSize();
            return;
        }
        // Clean up duplicated words like "Petrie Terrace Gallery, Petrie Terrace" 
        // to make it a clean query for Nominatim
        let cleanVenue = venueText;
        if (cleanVenue.toLowerCase().includes("petrie terrace gallery")) {
            cleanVenue = "Petrie Terrace Gallery, Petrie Terrace";
        }
        const queryAddress = `${cleanVenue}, Brisbane, Queensland, Australia`;
        const geocodeURL = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryAddress)}`;
        fetch(geocodeURL)
            .then(res => res.json())
            .then(results => {
                let lat, lon;
                if (results && results.length > 0) {
                    lat = parseFloat(results[0].lat);
                    lon = parseFloat(results[0].lon);
                } else {
                    // Fallback coordinates for Petrie Terrace Gallery if Nominatim misses it
                    console.warn("Using fallback coordinates for Petrie Terrace Gallery");
                    lat = -27.4583;
                    lon = 153.0135;
                }
                // Move map view to the exact spot and drop the pin
                myMap.setView([lat, lon], 16);
                L.marker([lat, lon]).addTo(myMap)
                    .bindPopup(`<strong>${eventTitle}</strong><br>${venueText}`)
                    .openPopup();
                myMap.invalidateSize();
            })
            .catch(err => {
                console.error("Geocoding fetch error:", err);
                // Fallback on total fetch failure
                const lat = -27.4583;
                const lon = 153.0135;
                myMap.setView([lat, lon], 16);
                L.marker([lat, lon]).addTo(myMap)
                    .bindPopup(`<strong>${eventTitle}</strong><br>${venueText}`)
                    .openPopup();
                myMap.invalidateSize();
            });
    }, 800);
    
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
                saveBtn.style.backgroundColor = "#D45060";
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
                saveBtn.style.backgroundColor = "#D45060";
            } else {
                favourites.splice(index, 1);
                localStorage.setItem("mika_favourites", JSON.stringify(favourites));
                saveBtn.textContent = "♡ Save";
                saveBtn.style.backgroundColor = ""; 
            }
        });
    }
    // --- Review Filter Buttons Toggle Logic ---
    const filterPills = document.querySelectorAll('.review-filters .filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            // Remove 'active' class from all buttons
            filterPills.forEach(p => p.classList.remove('active'));
            // Add 'active' class to clicked button
            pill.classList.add('active');
        });
    });
    // --- Post New Review Logic ---
    const postBtn = document.getElementById('post-review-btn');
    const reviewInput = document.getElementById('review-input');
    const reviewsList = document.getElementById('reviews-list');
    if (postBtn && reviewInput && reviewsList) {
        const createAndPostReview = () => {
            const text = reviewInput.value.trim();
            if (!text) return; // Ignore empty comments
            // Create card HTML element dynamically
            const newReviewCard = document.createElement('article');
            newReviewCard.className = 'review-card';
            newReviewCard.innerHTML = `
                <div class="avatar-circle avatar-user">YOU</div>
                <div class="review-body">
                    <h4 class="reviewer-name">You</h4>
                    <p class="review-text">${text}</p>
                </div>
            `;
            // Prepend new review at the top of the list
            reviewsList.prepend(newReviewCard);
            // Clear input box
            reviewInput.value = '';
        };
        // Trigger on button click
        postBtn.addEventListener('click', createAndPostReview);
        // Allow pressing "Enter" key to post
        reviewInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                createAndPostReview();
            }
        });
    }
});
    // --- Follow Host Button Logic ---
    const followBtn = document.getElementById("follow-host-btn");
    const hostNameEl = document.querySelector(".host-name");
    if (followBtn) {
        // Function to get a unique key for the current host
        const getHostKey = () => {
            const hostName = hostNameEl?.textContent.trim() || "Host Name";
            return `mika_followed_${hostName}`;
        };
        // Check localStorage to set initial state on page load
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
        // Run immediately
        updateFollowState();
        // If host name changes dynamically via data loader, observe it
        if (hostNameEl) {
            const hostObserver = new MutationObserver(() => {
                updateFollowState();
            });
            hostObserver.observe(hostNameEl, { childList: true, characterData: true, subtree: true });
        }
        // Toggle follow state on click
        followBtn.addEventListener("click", () => {
            const hostKey = getHostKey();
            const isFollowed = localStorage.getItem(hostKey) === "true";
            if (isFollowed) {
                localStorage.removeItem(hostKey);
            } else {
                localStorage.setItem(hostKey, "true");
            }
            updateFollowState();
        });
}
// --- Brisbane Database Connection Helper ---
function iterateRecords(data) {
    var records = data.results;
    if (!records) return;
    Object.values(records).forEach(value => {
        var subject = value["subject"];
        var location = value["location"];
        var start_datetime = value["start_datetime"];
        var end_datetime = value["end_datetime"];
        var formatteddatetime = value["formatteddatetime"];
        
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
$(document).ready(function() {
    const creativeEventsAPIURL = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/creative-events/records";
    const requestParams = { limit: 20 };
    const queryString = new URLSearchParams(requestParams).toString();
    const fullURL = creativeEventsAPIURL + "?" + queryString;
    
    fetch(fullURL)
        .then(response => response.json())
        .then(data => iterateRecords(data))
        .catch(error => console.error("Error fetching data:", error));
});

// --- Ticket Modal Popup Logic ---
const modal = document.getElementById('ticket-modal');
const getTicketsBtn = document.querySelector('.get-tickets');
const closeBtn = document.getElementById('modal-close-btn');

if (getTicketsBtn && modal) {
    let currentQty = 1;
    let currentUnitPrice = 20;
    let isFreeEvent = false;

    const qtySpan = document.getElementById('ticket-qty');
    const tierTotalEl = document.getElementById('selected-tier-total');
    const cartItemDesc = document.getElementById('cart-item-desc');
    const cartItemPrice = document.getElementById('cart-item-price');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const ticketTypesContainer = document.querySelector('.ticket-types');

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

    // Open modal on click & initialize dynamic prices/labels
    getTicketsBtn.addEventListener('click', () => {
        document.getElementById('modal-event-title').textContent = document.querySelector('.event-name')?.textContent || "Event Title";
        document.getElementById('modal-host-name').textContent = document.querySelector('.host-name')?.textContent || "Host Name";
        document.getElementById('modal-venue').textContent = document.getElementById('card-venue')?.textContent || document.getElementById('event-venue')?.textContent || "Venue Location";
        document.getElementById('modal-date').textContent = document.getElementById('card-date')?.textContent || document.getElementById('event-date')?.textContent || "Event Date";
        
        // --- Dynamic Price Parsing ---
        const rawPriceText = document.getElementById('event-price')?.textContent.trim() || "Free";
        const numericMatch = rawPriceText.match(/\d+(\.\d+)?/);
        
        if (!numericMatch || rawPriceText.toLowerCase().includes("free") || parseFloat(numericMatch[0]) === 0) {
            isFreeEvent = true;
            currentUnitPrice = 0;
        } else {
            isFreeEvent = false;
            currentUnitPrice = parseFloat(numericMatch[0]);
        }

        // --- Dynamically Render Ticket Tier Pills ---
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

            // Re-attach click listeners to new pills
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
        }

        // Set default initial selection
        document.getElementById('selected-tier-name').textContent = isFreeEvent ? "Free Admission" : "General Admission";
        currentQty = 1;
        updateTotals();

        // Set action button label for View 1
        const proceedCheckoutBtn = document.getElementById('proceed-checkout-btn');
        if (proceedCheckoutBtn) {
            proceedCheckoutBtn.textContent = isFreeEvent ? "Register" : "Checkout";
        }

        modal.hidden = false;
    });

    // Close modal on click of X
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.hidden = true;
        });
    }

    // Close modal when clicking backdrop
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.hidden = true;
        }
    });

    // Quantity Counter Buttons
    const qtyPlus = document.getElementById('qty-plus');
    const qtyMinus = document.getElementById('qty-minus');
    if (qtyPlus) {
        qtyPlus.addEventListener('click', () => {
            currentQty++;
            updateTotals();
        });
    }
    if (qtyMinus) {
        qtyMinus.addEventListener('click', () => {
            if (currentQty > 1) {
                currentQty--;
                updateTotals();
            }
        });
    }

    // --- View Switching (Checkout vs Register) ---
    const ticketSelectionView = document.getElementById('ticket-selection-view');
    const checkoutView = document.getElementById('checkout-view');
    const proceedCheckoutBtn = document.getElementById('proceed-checkout-btn');
    const backToTicketsBtn = document.getElementById('back-to-tickets-btn');
    let isAtCheckout = false;

    if (proceedCheckoutBtn && checkoutView && ticketSelectionView) {
        proceedCheckoutBtn.addEventListener('click', () => {
            if (!isAtCheckout) {
                // Step 1: Switch View
                ticketSelectionView.hidden = true;
                checkoutView.hidden = false;
                isAtCheckout = true;
                
                // Update Checkout View Header & Billing section visibility for Free events
                const checkoutHeaderTitle = checkoutView.querySelector('.modal-event-title');
                const billingSection = checkoutView.querySelector('.billing-info-section');
                
                if (isFreeEvent) {
                    if (checkoutHeaderTitle) checkoutHeaderTitle.textContent = "Register";
                    if (billingSection) billingSection.hidden = true; // Hide payment options for free events
                    proceedCheckoutBtn.textContent = "Book";
                } else {
                    if (checkoutHeaderTitle) checkoutHeaderTitle.textContent = "Checkout";
                    if (billingSection) billingSection.hidden = false;
                    proceedCheckoutBtn.textContent = "Pay";
                }
            } else {
                // Step 2: Confirmation State
                proceedCheckoutBtn.textContent = isFreeEvent ? "Booked!" : "Paid";
                proceedCheckoutBtn.style.backgroundColor = "#D45060"; 
                proceedCheckoutBtn.disabled = true;

                // --- SAVE EVENT TO "MY EVENTS" ---
                const eventData = {
                    title: document.getElementById('modal-event-title')?.textContent.trim() || "Event Title",
                    venue: document.getElementById('modal-venue')?.textContent.trim() || "Venue Location",
                    date: document.getElementById('modal-date')?.textContent.trim() || "Event Date",
                    image: document.getElementById('event-image')?.src || "../images/market.jpg",
                    category: "Attending",
                    status: "Attending"
                };

                let myEvents = JSON.parse(localStorage.getItem("mika_my_events")) || [];
                const alreadyAdded = myEvents.some(ev => ev.title === eventData.title);
                if (!alreadyAdded) {
                    myEvents.push(eventData);
                    localStorage.setItem("mika_my_events", JSON.stringify(myEvents));
                }

                setTimeout(() => {
                    modal.hidden = true;
                    // Reset modal state
                    proceedCheckoutBtn.textContent = isFreeEvent ? "Register" : "Checkout";
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
                proceedCheckoutBtn.textContent = isFreeEvent ? "Register" : "Checkout";
            });
        }
    }

    // Modal Heart / Save Logic
    const modalFavBtns = document.querySelectorAll('.modal-overlay .fav-btn');
    if (modalFavBtns.length > 0) {
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

        getTicketsBtn.addEventListener('click', updateModalFavButtonsState);

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
                let favourites = JSON.parse(localStorage.getItem("mika_favourites")) || [];
                const index = favourites.findIndex(fav => fav.title === eventData.title);
                if (index === -1) {
                    favourites.push(eventData);
                } else {
                    favourites.splice(index, 1);
                }
                localStorage.setItem("mika_favourites", JSON.stringify(favourites));
                updateModalFavButtonsState();
                
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

