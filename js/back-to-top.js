document.addEventListener("DOMContentLoaded", function () {
  var button = document.getElementById("back-to-top");
  if (!button) return;

  function toggleButton() {
    button.classList.toggle("is-visible", window.scrollY > 400);
  }

  window.addEventListener("scroll", toggleButton, { passive: true });
  toggleButton(); // set the right state on page load

  button.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});