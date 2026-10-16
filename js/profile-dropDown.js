// profile-dropdown.js 
// Load it at the bottom of each page: <script src="../js/profile-dropdown.js"></script>

(function () {
  var wrap = document.querySelector(".dropdown-profile-icon");
  if (!wrap) return;
  var trigger = wrap.querySelector(".icon-btn");
  var menu = wrap.querySelector(".dropdown-content-profile");
  if (!trigger || !menu) return;

  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-expanded", "false");

  function setOpen(open) {
    wrap.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  // devices without hover: the first tap opens the menu instead of leaving the page
  var noHover = window.matchMedia && window.matchMedia("(hover: none)").matches;
  trigger.addEventListener("click", function (e) {
    if (noHover && !wrap.classList.contains("is-open")) {
      e.preventDefault();
      setOpen(true);
    }
  });

  document.addEventListener("click", function (e) {
    if (!wrap.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
})();