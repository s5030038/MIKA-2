// MIKA² auth: login + signup (prototype only).
// Accounts are saved in this browser's localStorage, not a real database.
(function () {
  const USERS_KEY = "mika_users";
  const SESSION_KEY = "mika_current_user";
  const MIN_PASSWORD_LENGTH = 8;

  /* ---------- mock user store ---------- */
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function saveUser(email, password) {
    const users = getUsers();
    users[email] = { password };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function userExists(email) {
    return Boolean(getUsers()[email]);
  }

  function checkLogin(email, password) {
    const user = getUsers()[email];
    return Boolean(user) && user.password === password;
  }

  /* ---------- helpers ---------- */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showMessage(el, text) {
    el.textContent = text;
    el.hidden = false;
  }

  function clearMessage(el) {
    el.textContent = "";
    el.hidden = true;
  }

  // Show one screen, hide the others
  function showView(viewId) {
    document.querySelectorAll("[data-view]").forEach((view) => {
      view.hidden = view.id !== viewId;
    });
    const active = document.getElementById(viewId);
    const focusTarget = active.querySelector("input, .btn--link");
    if (focusTarget) focusTarget.focus();
  }

  /* ---------- eye icon on password fields ---------- */
  const SVG_ATTRS =
    'viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const ICON_EYE =
    `<svg ${SVG_ATTRS}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const ICON_EYE_OFF =
    `<svg ${SVG_ATTRS}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

  function setupPasswordToggles() {
    document.querySelectorAll(".toggle-password").forEach((button) => {
      const input = button.parentElement.querySelector("input");

      function render(visible) {
        button.innerHTML = visible ? ICON_EYE : ICON_EYE_OFF;
        button.setAttribute("aria-label", visible ? "Hide password" : "Show password");
      }

      render(false);
      button.addEventListener("click", () => {
        const makeVisible = input.type === "password";
        input.type = makeVisible ? "text" : "password";
        render(makeVisible);
      });
    });
  }

  // Links like <a data-goto="signupEmailView">
  function setupViewLinks() {
    document.querySelectorAll("[data-goto]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        showView(link.dataset.goto);
      });
    });
  }

  /* ---------- signup page ---------- */
  function setupSignup() {
    const emailForm = document.getElementById("signupEmailForm");
    const passwordForm = document.getElementById("signupPasswordForm");
    if (!emailForm || !passwordForm) return;

    const emailInput = document.getElementById("signupEmail");
    const emailMessage = document.getElementById("signupEmailMessage");
    const newPassword = document.getElementById("newPassword");
    const confirmPassword = document.getElementById("confirmPassword");
    const passwordMessage = document.getElementById("signupPasswordMessage");

    let pendingEmail = "";

    emailInput.addEventListener("input", () => clearMessage(emailMessage));
    newPassword.addEventListener("input", () => clearMessage(passwordMessage));
    confirmPassword.addEventListener("input", () => clearMessage(passwordMessage));

    // Screen 1 -> Screen 2
    emailForm.addEventListener("submit", (event) => {
      event.preventDefault();
      clearMessage(emailMessage);

      const email = emailInput.value.trim().toLowerCase();

      if (!email) {
        showMessage(emailMessage, "Please enter your email.");
        return;
      }
      if (!isValidEmail(email)) {
        showMessage(emailMessage, "Please enter a valid email address.");
        return;
      }
      if (userExists(email)) {
        showMessage(emailMessage, "An account with this email already exists. Try logging in instead.");
        return;
      }

      pendingEmail = email;
      showView("signupPasswordView");
    });

    // Screen 2 -> Screen 3 (thank you)
    passwordForm.addEventListener("submit", (event) => {
      event.preventDefault();
      clearMessage(passwordMessage);

      if (!pendingEmail) {
        showView("signupEmailView");
        return;
      }
      if (newPassword.value.length < MIN_PASSWORD_LENGTH) {
        showMessage(passwordMessage, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      if (newPassword.value !== confirmPassword.value) {
        showMessage(passwordMessage, "Passwords don't match.");
        return;
      }

      saveUser(pendingEmail, newPassword.value);
      sessionStorage.setItem(SESSION_KEY, pendingEmail);
      showView("signupSuccessView");
    });
  }

  /* ---------- login page ---------- */
  function setupLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const message = document.getElementById("loginMessage");

    emailInput.addEventListener("input", () => clearMessage(message));
    passwordInput.addEventListener("input", () => clearMessage(message));

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      clearMessage(message);

      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;

      if (!email || !password) {
        showMessage(message, "Please enter your email and password.");
        return;
      }
      if (!isValidEmail(email)) {
        showMessage(message, "Please enter a valid email address.");
        return;
      }
      if (!checkLogin(email, password)) {
        showMessage(message, "Incorrect email or password.");
        return;
      }

      sessionStorage.setItem(SESSION_KEY, email);
      showView("loginSuccessView");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupPasswordToggles();
    setupViewLinks();
    setupSignup();
    setupLogin();
  });
})();