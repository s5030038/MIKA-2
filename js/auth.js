function getMockUsers() {
  return JSON.parse(localStorage.getItem("mika_users") || "{}");
}

function saveMockUser(email, password) {
  const users = getMockUsers();
  users[email] = { password };
  localStorage.setItem("mika_users", JSON.stringify(users));
}

function checkPassword(email, password) {
  const users = getMockUsers();
  return users[email] && users[email].password === password;
}

function userExists(email) {
  const users = getMockUsers();
  return Boolean(users[email]);
}

document.addEventListener("DOMContentLoaded", () => {
  const emailForm = document.getElementById("emailForm");
  const passwordForm = document.getElementById("passwordForm");
  const emailStep = document.getElementById("emailStep");
  const passwordStep = document.getElementById("passwordStep");
  const emailDisplay = document.getElementById("emailDisplay");
  const useDifferentEmail = document.getElementById("useDifferentEmail");

  let currentEmail = "";

  emailForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    currentEmail = email;

    if (!userExists(email)) {
      saveMockUser(email, "test1234");
    }

    emailStep.style.display = "none";
    passwordStep.style.display = "block";
    emailDisplay.textContent = email;
  });

  passwordForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const password = document.getElementById("password").value;

    if (checkPassword(currentEmail, password)) {
      window.location.href = "profilePage.html";
    } else {
      alert("Incorrect password. Try: test1234");
    }
  });

  useDifferentEmail.addEventListener("click", (e) => {
    e.preventDefault();
    passwordStep.style.display = "none";
    emailStep.style.display = "block";
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
  });
});