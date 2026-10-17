(() => {
  "use strict";

  const USERS_KEY = "mika_users";
  const CURRENT_USER_KEY = "mika_current_user_id";

  const categories = [
    "Music",
    "Festivals",
    "Creative",
    "Tours",
    "Exhibitions",
    "Workshops"
  ];

  const audiences = [
    "Seniors",
    "Adults (30+)",
    "Young adults",
    "Teenagers",
    "Kids",
    "Preschool kids",
    "Infants & toddlers"
  ];

  const form = document.getElementById("onboardingForm");
  const message = document.getElementById("onboardingMessage");
  const submitButton = document.getElementById("onboardingSubmit");

  if (!form) return;

  function readUsers() {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");

    if (!Array.isArray(users)) {
      throw new Error("Unexpected account storage format.");
    }

    return users;
  }

  function getCurrentAccount() {
    const userId = sessionStorage.getItem(CURRENT_USER_KEY);

    if (!userId) return null;

    const users = readUsers();
    const user = users.find(account => account.id === userId);

    return user ? { users, user } : null;
  }

  function showOptions(containerId, name, values, selected = []) {
    const container = document.getElementById(containerId);

    values.forEach((value, index) => {
      const label = document.createElement("label");
      label.className = "onb-choice";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = name;
      input.id = `${name}-${index}`;
      input.value = value;
      input.checked = selected.includes(value);

      label.htmlFor = input.id;

      const chip = document.createElement("span");
      chip.className = "onb-chip";
      chip.textContent = value;

      label.append(input, chip);
      container.append(label);
    });
  }

  let account;

  try {
    account = getCurrentAccount();

    if (!account) {
      window.location.replace("loginpage.html");
      return;
    }

    if (account.user.onboardingComplete) {
      window.location.replace("browsingPage.html");
      return;
    }

    const preferences = account.user.preferences || {};

    showOptions(
      "categoryOptions",
      "categories",
      categories,
      Array.isArray(preferences.categories) ? preferences.categories : []
    );

    showOptions(
      "audienceOptions",
      "audiences",
      audiences,
      Array.isArray(preferences.audiences) ? preferences.audiences : []
    );
  } catch (error) {
    message.textContent =
      "We couldn’t load your account. Check browser storage or log in again.";
    submitButton.disabled = true;
    console.error(error);
    return;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    message.textContent = "";

    const data = new FormData(form);
    const selectedCategories = data.getAll("categories");
    const selectedAudiences = data.getAll("audiences");

    if (selectedCategories.length === 0) {
      message.textContent = "Please choose at least one event category.";
      form.querySelector('input[name="categories"]').focus();
      return;
    }

    submitButton.disabled = true;

    try {
      // Re-read before saving rather than using the page-load copy.
      const current = getCurrentAccount();

      if (!current) {
        window.location.replace("loginpage.html");
        return;
      }

      current.user.preferences = {
        ...(current.user.preferences || {}),
        categories: selectedCategories,
        audiences: selectedAudiences
      };

      current.user.onboardingComplete = true;

      localStorage.setItem(
        USERS_KEY,
        JSON.stringify(current.users)
      );

      window.location.href = "browsingPage.html";
    } catch (error) {
      message.textContent =
        "Your preferences couldn’t be saved. Please allow browser storage and try again.";
      submitButton.disabled = false;
      console.error(error);
    }
  });
})();