// MIKA² authentication — browser-only prototype.
// Use dummy passwords only.
//
// Accounts: localStorage → mika_users
// Current email: sessionStorage → mika_current_user
// Current ID: sessionStorage → mika_current_user_id

(function () {
  "use strict";

  const USERS_KEY = "mika_users";
  const SESSION_KEY = "mika_current_user";
  const CURRENT_USER_ID_KEY = "mika_current_user_id";
  const MIN_PASSWORD_LENGTH = 8;

  /* ---------- prototype user store ---------- */

  function createUserId() {
    if (typeof window.crypto?.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);

    return (
      "user-" +
      Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join("")
    );
  }

  function getUsers() {
    const raw = localStorage.getItem(USERS_KEY);
    const stored = raw ? JSON.parse(raw) : [];

    if (!stored || typeof stored !== "object") {
      throw new Error("Unexpected account storage format.");
    }

    // Convert the old email-keyed account object into an array.
    const users = Array.isArray(stored)
      ? stored
      : Object.entries(stored).map(([email, account]) => ({
          ...account,
          email
        }));

    let changed = !Array.isArray(stored);

    users.forEach((user) => {
      if (
        !user ||
        typeof user !== "object" ||
        typeof user.email !== "string"
      ) {
        throw new Error("A saved account is missing its email.");
      }

      const normalisedEmail = user.email.trim().toLowerCase();

      if (user.email !== normalisedEmail) {
        user.email = normalisedEmail;
        changed = true;
      }

      if (!user.id) {
        user.id = createUserId();
        changed = true;
      }

      if (typeof user.onboardingComplete !== "boolean") {
        user.onboardingComplete = false;
        changed = true;
      }

      if (!user.preferences) {
        user.preferences = {
          categories: [],
          audiences: []
        };
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    return users;
  }

  function saveUser(email, password) {
    const users = getUsers();

    // Check again at the password step to prevent overwriting an account.
    if (users.some((user) => user.email === email)) {
      throw new Error(
        "An account with this email already exists. Try logging in instead."
      );
    }

    const user = {
      id: createUserId(),
      email,
      password, // Plain text for this demo only.
      onboardingComplete: false,
      preferences: {
        categories: [],
        audiences: []
      }
    };

    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    return user;
  }

  function userExists(email) {
    return getUsers().some((user) => user.email === email);
  }

  function checkLogin(email, password) {
    return getUsers().find(
      (user) =>
        user.email === email &&
        user.password === password
    );
  }

  function startSession(user) {
    try {
      // Keep the email key for any existing profile-page code.
      sessionStorage.setItem(SESSION_KEY, user.email);
      sessionStorage.setItem(CURRENT_USER_ID_KEY, user.id);
    } catch (error) {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(CURRENT_USER_ID_KEY);
      throw error;
    }
  }

  function routeUser(user) {
    window.location.href = user.onboardingComplete
      ? "browsingPage.html"
      : "onboardingPage.html";
  }

  /* ---------- helpers ---------- */

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showMessage(element, text) {
    if (!element) return;

    element.textContent = text;
    element.hidden = false;
  }

  function clearMessage(element) {
    if (!element) return;

    element.textContent = "";
    element.hidden = true;
  }

  function showView(viewId) {
    const active = document.getElementById(viewId);
    if (!active) return;

    document.querySelectorAll("[data-view]").forEach((view) => {
      view.hidden = view.id !== viewId;
    });

    const focusTarget = active.querySelector(
      "input, button, .btn--link"
    );

    if (focusTarget) focusTarget.focus();
  }

  /* ---------- password eye icons ---------- */

  const SVG_ATTRS =
    'viewBox="0 0 24 24" width="20" height="20" ' +
    'fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true" focusable="false"';

  const ICON_EYE = `
    <svg ${SVG_ATTRS}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `;

  const ICON_EYE_OFF = `
    <svg ${SVG_ATTRS}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  `;

  function setupPasswordToggles() {
    document
      .querySelectorAll(".toggle-password")
      .forEach((button) => {
        const input = button.parentElement.querySelector("input");
        if (!input) return;

        button.type = "button";

        function render(visible) {
          button.innerHTML = visible ? ICON_EYE : ICON_EYE_OFF;
          button.setAttribute(
            "aria-label",
            visible ? "Hide password" : "Show password"
          );
        }

        render(input.type === "text");

        button.addEventListener("click", () => {
          const makeVisible = input.type === "password";

          input.type = makeVisible ? "text" : "password";
          render(makeVisible);
        });
      });
  }

  /* ---------- links between views ---------- */

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
    const passwordMessage = document.getElementById(
      "signupPasswordMessage"
    );

    let pendingEmail = "";

    emailInput.addEventListener("input", () => {
      pendingEmail = "";
      clearMessage(emailMessage);
    });

    newPassword.addEventListener("input", () => {
      clearMessage(passwordMessage);
    });

    confirmPassword.addEventListener("input", () => {
      clearMessage(passwordMessage);
    });

    // Email step → password step.
    emailForm.addEventListener("submit", (event) => {
      event.preventDefault();
      clearMessage(emailMessage);

      const email = emailInput.value.trim().toLowerCase();

      if (!email) {
        showMessage(emailMessage, "Please enter your email.");
        return;
      }

      if (!isValidEmail(email)) {
        showMessage(
          emailMessage,
          "Please enter a valid email address."
        );
        return;
      }

      try {
        if (userExists(email)) {
          showMessage(
            emailMessage,
            "An account with this email already exists. Try logging in instead."
          );
          return;
        }

        pendingEmail = email;
        clearMessage(passwordMessage);
        showView("signupPasswordView");
      } catch (error) {
        console.error(error);

        showMessage(
          emailMessage,
          "We couldn’t access your saved accounts. Please check that browser storage is available."
        );
      }
    });

    // Password step → save account → onboarding.
    passwordForm.addEventListener("submit", (event) => {
      event.preventDefault();
      clearMessage(passwordMessage);

      if (!pendingEmail) {
        showView("signupEmailView");
        return;
      }

      const password = newPassword.value;

      if (password.length < MIN_PASSWORD_LENGTH) {
        showMessage(
          passwordMessage,
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
        );
        return;
      }

      if (password !== confirmPassword.value) {
        showMessage(passwordMessage, "Passwords don't match.");
        return;
      }

      let user;

      try {
        user = saveUser(pendingEmail, password);
      } catch (error) {
        console.error(error);

        showMessage(
          passwordMessage,
          error.message ||
            "We couldn’t save your account. Please try again."
        );
        return;
      }

      try {
        startSession(user);
      } catch (error) {
        console.error(error);

        showMessage(
          passwordMessage,
          "Your account was saved, but we couldn’t sign you in. Please allow browser storage, then log in with your new details."
        );
        return;
      }

      window.location.href = "onboardingPage.html";
    });
  }

  /* ---------- login page ---------- */

  function setupLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const message = document.getElementById("loginMessage");

    emailInput.addEventListener("input", () => {
      clearMessage(message);
    });

    passwordInput.addEventListener("input", () => {
      clearMessage(message);
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      clearMessage(message);

      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;

      if (!email || !password) {
        showMessage(
          message,
          "Please enter your email and password."
        );
        return;
      }

      if (!isValidEmail(email)) {
        showMessage(
          message,
          "Please enter a valid email address."
        );
        return;
      }

      try {
        const user = checkLogin(email, password);

        if (!user) {
          showMessage(message, "Incorrect email or password.");
          return;
        }

        startSession(user);
        routeUser(user);
      } catch (error) {
        console.error(error);

        showMessage(
          message,
          "We couldn’t access your account or start your session. Please check that browser storage is available."
        );
      }
    });
  }

  /* ---------- initialise ---------- */

  function initialise() {
    setupPasswordToggles();
    setupViewLinks();
    setupSignup();
    setupLogin();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise);
  } else {
    initialise();
  }
})();