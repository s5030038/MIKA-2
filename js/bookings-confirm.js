// booking-confirm.js
// bookingsPage.html: when the visitor pays (any button in the checkout), save the booking
// so it shows up under My Events on their profile.
// Load AFTER bookings.js, booking-loader.js and script.js.

(function () {
  var GO_TO_PROFILE_AFTER_BOOKING = true;   // set to false to stay on this page instead

  function text(selector) {
    var node = document.querySelector(selector);
    return node ? node.textContent.trim() : "";
  }

  // the event the visitor clicked on the browse page (saved by the api-*.js files)
  function clickedEvent() {
    try { return JSON.parse(localStorage.getItem("mika_current_event") || "null") || {}; } catch (e) { return {}; }
  }

  function buildBooking() {
    var params = new URLSearchParams(window.location.search);
    var name = text(".event-name");
    var clicked = clickedEvent();
    var sameEvent = clicked.name && clicked.name === name;

    // prefer the real photo from the API over the local placeholder cards
    var pageImage = document.getElementById("event-image");
    var candidates = [sameEvent ? clicked.image : "", pageImage && pageImage.getAttribute("src") ? pageImage.src : ""]
      .filter(Boolean);
    var photo = candidates.filter(function (u) { return u.indexOf("/images/eventcard") === -1; })[0] || candidates[0] || "";
    var category = (sameEvent && clicked.category) || "";
    if (category) category = category.charAt(0).toUpperCase() + category.slice(1);

    var priceMatch = text("#event-price").match(/(\d+(?:\.\d+)?)/);
    var dateText = text("#event-date") || (sameEvent ? clicked.date : "");

    return {
      name: name,
      slug: bookingSlug(name),   // same rule booking-loader.js uses to find an event again
      source: params.get("source") || (sameEvent ? clicked.source : "") || "",
      venue: text("#event-venue"),
      date: dateText,
      start: sameEvent && clicked.start ? clicked.start : null,    // exact time from the API when we have it
      end: sameEvent && clicked.end ? clicked.end : null,
      category: category || "Event",
      image: photo,
      price: priceMatch ? priceMatch[1] : "",
      tickets: text("#cart-item-desc"),
      total: text("#cart-total-price")
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    // pre-fill the checkout email with the signed-in account
    var user = typeof getCurrentUser === "function" ? getCurrentUser() : "";
    var email = document.querySelector('#checkout-view input[type="email"]');
    if (email && user && !email.value) email.value = user;
  });

  var redirecting = false;

  function confirmBooking(trigger) {
    try {
      if (typeof addBooking !== "function") { console.error("[booking] bookings.js didn't load - check the <script> path in bookingsPage.html"); return; }

      var booking = buildBooking();
      if (!booking.name || booking.name === "Event Title") { console.warn("[booking] not saved: the event hasn't loaded on this page"); return; }

      var saved = addBooking(booking);
      console.log("[booking] saved (" + trigger + ") for", getCurrentUser() || "guest (not signed in)", saved);

      // script.js shows "Paid" for 1.5s and closes the pop-up; go to the profile just after that
      if (GO_TO_PROFILE_AFTER_BOOKING && !redirecting) {
        redirecting = true;
        setTimeout(function () { window.location.href = "profilePage.html#events"; }, 1700);
      }
    } catch (err) {
      console.error("[booking] something went wrong while saving:", err);
    }
  }

  // 1) Runs in the capture phase, i.e. BEFORE script.js reacts to the same click, so we see the
  //    checkout exactly as the visitor saw it when they pressed the button.
  document.addEventListener("click", function (e) {
    var target = e.target.closest ? e.target.closest("#checkout-view .pay-btn, #checkout-view .card-option-box, #proceed-checkout-btn") : null;
    if (!target) return;

    // The cart button is "Checkout" on step 1 (just opens the form) and the pay button on step 2.
    var checkoutView = document.getElementById("checkout-view");
    var onCheckoutStep = checkoutView && !checkoutView.hidden;
    if (target.id === "proceed-checkout-btn" && !onCheckoutStep) return;

    confirmBooking("click");
  }, true);

  // 2) Safety net: script.js turns the cart button into "Paid" when a payment goes through,
  //    so if the click above was missed for any reason, this still saves the booking.
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("proceed-checkout-btn");
    if (!btn || typeof MutationObserver !== "function") return;
    new MutationObserver(function () {
      if (btn.textContent.trim() === "Paid") confirmBooking("paid-button");
    }).observe(btn, { childList: true, characterData: true, subtree: true });
  });
})();