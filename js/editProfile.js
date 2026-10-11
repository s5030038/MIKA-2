// editProfile.js
// editProfilePage.html: personal details, profile photo and saved payment methods.
// Reads/writes the same "mika_settings" localStorage key as profilePage (profile.js),
// so the greeting, email and photo on the profile page update after saving.
//
// SECURITY NOTE: this is a front-end mock. Real payment details must never be stored in
// the browser. Here only the last digits of the BSB / account number are kept, and the
// CSV is checked and then thrown away.

(function () {
  var SETTINGS_KEY = "mika_settings";
  var PAYMENTS_KEY = "mika_payments";
  var PROFILE_PAGE = "profilePage.html";

  var DEFAULTS = {
    fullName: "John Doe",
    email: "johnd@gmail.com",
    location: "Brisbane, Queensland (default)",
    preferences: [],
    notifications: { eventReminders: true, bookedReminders: true, savedUpdates: true, newEvents: true }
  };

  var LOCATIONS = [
    "Brisbane, Queensland (default)",
    "Gold Coast, Queensland",
    "Sunshine Coast, Queensland",
    "Ipswich, Queensland",
    "Logan, Queensland",
    "Moreton Bay, Queensland",
    "Redland, Queensland",
    "Toowoomba, Queensland"
  ];

  var settings = loadSettings();
  var payments = loadPayments();     // working copy: only written to storage on Save
  var pendingAvatar = null;          // new photo chosen but not saved yet
  var editingPaymentId = null;       // set while replacing an existing payment method
  var dirty = false;

  function $(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function icon(classes) { var i = document.createElement("i"); i.className = classes; return i; }

  /* ---------- storage ---------- */

  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
      if (s && typeof s === "object") return Object.assign({}, DEFAULTS, s);
    } catch (e) { /* use defaults */ }
    return Object.assign({}, DEFAULTS);
  }

  function loadPayments() {
    try {
      var p = JSON.parse(localStorage.getItem(PAYMENTS_KEY) || "[]");
      return Array.isArray(p) ? p : [];
    } catch (e) { return []; }
  }

  /* ---------- form set-up ---------- */

  function fillForm() {
    $("ep-name").value = settings.fullName || "";
    $("ep-email").value = settings.email || "";
    $("ep-dob").value = settings.dob || "";
    $("ep-dob").max = new Date().toISOString().slice(0, 10);   // no future birthdays

    // location dropdown (adds the saved value if it isn't one of the presets)
    var select = $("ep-location");
    var options = LOCATIONS.slice();
    if (settings.location && options.indexOf(settings.location) === -1) options.push(settings.location);
    options.forEach(function (loc) {
      var opt = el("option", "", loc);
      opt.value = loc;
      select.appendChild(opt);
    });
    select.value = settings.location || LOCATIONS[0];

    if (settings.avatar) showAvatar(settings.avatar);
  }

  function showAvatar(src) {
    $("avatar-img").src = src;
    $("avatar-img").hidden = false;
    $("avatar-default").hidden = true;
  }

  /* ---------- validation helpers ---------- */

  function setError(id, message) {
    var box = $(id + "-error");
    var input = $(id);
    if (box) box.textContent = message || "";
    if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function clearErrors() {
    ["ep-name", "ep-email", "ep-dob", "pay-bsb", "pay-account", "pay-csv"].forEach(function (id) { setError(id, ""); });
    $("avatar-error").textContent = "";
  }

  function setStatus(text, isError) {
    var s = $("ep-status");
    s.textContent = text;
    s.classList.toggle("is-error", Boolean(isError));
  }

  /* ---------- profile photo ---------- */

  // shrink to a 256px square JPEG so it fits comfortably in localStorage
  function resizeImage(file, size, callback) {
    var reader = new FileReader();
    reader.onerror = function () { callback(new Error("read")); };
    reader.onload = function () {
      var img = new Image();
      img.onerror = function () { callback(new Error("image")); };
      img.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        var side = Math.min(img.width, img.height);
        canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        callback(null, canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function setUpPhoto() {
    $("change-photo-btn").addEventListener("click", function () { $("avatar-input").click(); });

    $("avatar-input").addEventListener("change", function () {
      var file = this.files && this.files[0];
      var err = $("avatar-error");
      err.textContent = "";
      if (!file) return;

      if (!/^image\//.test(file.type)) { err.textContent = "Please choose an image file."; return; }
      if (file.size > 5 * 1024 * 1024) { err.textContent = "Please choose an image under 5 MB."; return; }

      resizeImage(file, 256, function (error, dataUrl) {
        if (error) { err.textContent = "Sorry, that image couldn't be read."; return; }
        pendingAvatar = dataUrl;
        showAvatar(dataUrl);
        dirty = true;
      });
    });
  }

  /* ---------- payment methods ---------- */

  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function renderPayments() {
    var list = $("payment-list");
    list.innerHTML = "";
    $("payment-empty").hidden = payments.length > 0;

    payments.forEach(function (p) {
      var item = el("article", "pay-item");

      var iconBox = el("div", "pay-item__icon");
      iconBox.appendChild(icon("fa-solid fa-building-columns"));
      item.appendChild(iconBox);

      var info = el("div", "pay-item__info");
      info.appendChild(el("span", "pay-item__title", "Bank account ending in " + p.accountEnd));
      info.appendChild(el("span", "pay-item__sub", "BSB ending in " + p.bsbEnd));
      if (p.isDefault) info.appendChild(el("span", "pay-item__badge", "Default"));
      item.appendChild(info);

      var actions = el("div", "pay-item__actions");

      if (!p.isDefault) {
        var makeDefault = el("button", "ep-link-btn", "Set as default");
        makeDefault.type = "button";
        makeDefault.addEventListener("click", function () { setDefaultPayment(p.id); });
        actions.appendChild(makeDefault);
      }

      var edit = el("button", "ep-link-btn");
      edit.type = "button";
      edit.appendChild(icon("fa-solid fa-pencil"));
      edit.appendChild(document.createTextNode(" Edit"));
      edit.addEventListener("click", function () { startEditPayment(p.id); });
      actions.appendChild(edit);

      var remove = el("button", "ep-link-btn");
      remove.type = "button";
      remove.appendChild(icon("fa-regular fa-trash-can"));
      remove.appendChild(document.createTextNode(" Remove"));
      remove.addEventListener("click", function () { removePayment(p.id); });
      actions.appendChild(remove);

      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  function setDefaultPayment(id) {
    payments.forEach(function (p) { p.isDefault = (p.id === id); });
    dirty = true;
    renderPayments();
  }

  function removePayment(id) {
    if (!confirm("Remove this payment method?")) return;
    var wasDefault = payments.some(function (p) { return p.id === id && p.isDefault; });
    payments = payments.filter(function (p) { return p.id !== id; });
    if (wasDefault && payments.length) payments[0].isDefault = true;
    if (editingPaymentId === id) stopEditPayment();
    dirty = true;
    renderPayments();
  }

  // "Edit" can't pre-fill (we never keep full numbers), so the user re-enters the details
  function startEditPayment(id) {
    editingPaymentId = id;
    $("payment-form-title").textContent = "Update payment method";
    $("payment-form-note").textContent = "Re-enter the details to replace this payment method. The CSV is never saved.";
    $("add-payment-label").textContent = "Update payment method";
    $("cancel-payment-edit").hidden = false;
    clearPaymentForm();
    $("payment-form").scrollIntoView({ behavior: "smooth", block: "center" });
    $("pay-bsb").focus();
  }

  function stopEditPayment() {
    editingPaymentId = null;
    $("payment-form-title").textContent = "Add new payment method";
    $("payment-form-note").textContent = "For your security only the last digits are kept on this device. The CSV is never saved.";
    $("add-payment-label").textContent = "Add payment method";
    $("cancel-payment-edit").hidden = true;
    clearPaymentForm();
  }

  function clearPaymentForm() {
    ["pay-bsb", "pay-account", "pay-csv"].forEach(function (id) { $(id).value = ""; setError(id, ""); });
  }

  function paymentFormIsEmpty() {
    return !$("pay-bsb").value.trim() && !$("pay-account").value.trim() && !$("pay-csv").value.trim();
  }

  // validates the add/edit box; returns true if it was valid and has been added to the list
  function tryAddPayment() {
    var bsb = $("pay-bsb").value.replace(/\D/g, "");
    var account = $("pay-account").value.replace(/\D/g, "");
    var csv = $("pay-csv").value.trim();
    var ok = true;

    setError("pay-bsb", ""); setError("pay-account", ""); setError("pay-csv", "");
    if (bsb.length !== 6) { setError("pay-bsb", "BSB must be 6 digits."); ok = false; }
    if (account.length < 6 || account.length > 10) { setError("pay-account", "Account number must be 6 to 10 digits."); ok = false; }
    if (!/^\d{3,4}$/.test(csv)) { setError("pay-csv", "CSV must be 3 or 4 digits."); ok = false; }
    if (!ok) return false;

    var entry = {
      id: newId(),
      bsbEnd: bsb.slice(-3),          // only the last digits are kept
      accountEnd: account.slice(-4),
      isDefault: payments.length === 0
    };                                 // csv is deliberately NOT stored

    if (editingPaymentId) {
      var index = payments.findIndex(function (p) { return p.id === editingPaymentId; });
      if (index > -1) { entry.isDefault = payments[index].isDefault; payments[index] = entry; }
    } else {
      payments.push(entry);
    }

    stopEditPayment();
    dirty = true;
    renderPayments();
    return true;
  }

  // format as the user types: BSB = 123-456, account = 1234-5678
  function setUpPaymentInputs() {
    $("pay-bsb").addEventListener("input", function () {
      var d = this.value.replace(/\D/g, "").slice(0, 6);
      this.value = d.length > 3 ? d.slice(0, 3) + "-" + d.slice(3) : d;
    });
    $("pay-account").addEventListener("input", function () {
      var d = this.value.replace(/\D/g, "").slice(0, 10);
      this.value = (d.match(/.{1,4}/g) || []).join("-");
    });
    $("pay-csv").addEventListener("input", function () {
      this.value = this.value.replace(/\D/g, "").slice(0, 4);
    });

    $("add-payment-btn").addEventListener("click", tryAddPayment);
    $("cancel-payment-edit").addEventListener("click", stopEditPayment);
  }

  /* ---------- save / cancel ---------- */

  function validatePersonal() {
    var ok = true;
    var name = $("ep-name").value.trim();
    var email = $("ep-email").value.trim();
    var dob = $("ep-dob").value;

    setError("ep-name", ""); setError("ep-email", ""); setError("ep-dob", "");

    if (!name) { setError("ep-name", "Please enter your full name."); ok = false; }
    if (!email) { setError("ep-email", "Please enter your email address."); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("ep-email", "Please enter a valid email address."); ok = false; }

    if (dob) {
      var d = new Date(dob);
      if (isNaN(d) || d > new Date() || d.getFullYear() < 1900) { setError("ep-dob", "Please enter a valid date of birth."); ok = false; }
    }
    return ok;
  }

  function saveAll() {
    setStatus("", false);
    var personalOk = validatePersonal();

    // if the payment box has something typed in, it must be valid too
    var paymentOk = true;
    if (!paymentFormIsEmpty()) paymentOk = tryAddPayment();
    else if (editingPaymentId) { stopEditPayment(); }

    if (!personalOk || !paymentOk) {
      setStatus("Please fix the highlighted fields.", true);
      var firstError = document.querySelector('[aria-invalid="true"]');
      if (firstError) firstError.focus();
      return;
    }

    // keep everything else on the profile (preferences, notifications) untouched
    settings.fullName = $("ep-name").value.trim();
    settings.email = $("ep-email").value.trim();
    settings.dob = $("ep-dob").value;
    settings.location = $("ep-location").value;
    if (pendingAvatar) settings.avatar = pendingAvatar;

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
    } catch (e) {
      setStatus("Couldn't save (browser storage is full or blocked).", true);
      return;
    }

    dirty = false;
    setStatus("Profile updated!", false);
    setTimeout(function () { window.location.href = PROFILE_PAGE; }, 800);
  }

  function leavePage(e) {
    if (e) e.preventDefault();
    if (dirty && !confirm("Discard your unsaved changes?")) return;
    dirty = false;
    window.location.href = PROFILE_PAGE;
  }

  /* ---------- start-up ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    fillForm();
    renderPayments();
    setUpPhoto();
    setUpPaymentInputs();
    clearErrors();

    // any edit marks the form as "has unsaved changes"
    $("edit-profile-form").addEventListener("input", function () { dirty = true; });

    $("edit-profile-form").addEventListener("submit", function (e) {
      e.preventDefault();
      saveAll();
    });
    $("cancel-btn").addEventListener("click", leavePage);
    $("back-link").addEventListener("click", leavePage);

    // warn if the tab is closed with unsaved changes
    window.addEventListener("beforeunload", function (e) {
      if (dirty) { e.preventDefault(); e.returnValue = ""; }
    });
  });
})();