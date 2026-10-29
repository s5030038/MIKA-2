//ai was used to complete this file
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".popular-section").forEach(function (section) {
    var track = section.querySelector(".creativeevents");
    var left = section.querySelector(".arrow-left");
    var right = section.querySelector(".arrow-right");
    if (!track || !left || !right) return;

    // width of one card plus the gap, worked out at click time
    // because the cards are added after the API responds
    function step() {
      var card = track.firstElementChild;
      if (!card) return 0;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    }

    function updateArrows() {
      var max = track.scrollWidth - track.clientWidth;
      left.disabled = track.scrollLeft <= 1;
      right.disabled = track.scrollLeft >= max - 1;
    }

    left.addEventListener("click", function () {
      track.scrollBy({ left: -step(), behavior: "smooth" });
    });
    right.addEventListener("click", function () {
      track.scrollBy({ left: step(), behavior: "smooth" });
    });

    track.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);

    // cards arrive later from the API, so check again when they are added
    new MutationObserver(updateArrows).observe(track, { childList: true });

    updateArrows();
  });
});