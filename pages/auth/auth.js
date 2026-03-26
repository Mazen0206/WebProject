import {
    initStorage,
    getUsers,
    saveUsers,
    getCurrentUserId,
    setCurrentUserId,
} from "../../data/storage.js";

function showError(message) {
    let errorEl = document.querySelector(".auth-error");
    if (!errorEl) {
        errorEl = document.createElement("p");
        errorEl.className = "auth-error";
        document.querySelector(".auth-form").prepend(errorEl);
    }
    errorEl.textContent = message;
}

function clearError() {
    const errorEl = document.querySelector(".auth-error");
    if (errorEl) errorEl.textContent = "";
}

function redirectIfLoggedIn() {
    if (getCurrentUserId()) {
        window.location.href = "../../pages/home/index.html";
    }
}

function main() {
    initStorage();
    redirectIfLoggedIn();

    const form = document.querySelector(".auth-form");
    const path = window.location.pathname;

    if (path.includes("register")) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            clearError();

            const email    = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const confirm  = document.getElementById("confirm-password").value;

            if (!email || !password) {
                showError("Please fill in all fields.");
                return;
            }
            
            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError("Please enter a valid email address.");
                return;
            }

            if (password.length < 8) {
                showError("Password must be at least 8 characters.");
                return;
            }
            
            // Password strength validation
            const passwordRegex = /^(?=.*[A-Z])(?=.*\d).+$/;
            if (!passwordRegex.test(password)) {
                showError("Password must contain at least one uppercase letter and one number.");
                return;
            }

            if (password !== confirm) {
                showError("Passwords do not match.");
                return;
            }

            const users = getUsers();
            if (users.find((u) => u.email === email)) {
                showError("An account with this email already exists.");
                return;
            }

            const newUser = {
                id: "u" + (users.length + 1),
                username: email.split("@")[0],
                email,
                password,
                profilePicture: "",
                bio: "",
                following: [],
                followers: [],
            };

            users.push(newUser);
            saveUsers(users);
            window.location.href = "login.html";
        });
    }

    if (path.includes("login")) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            clearError();

            const email    = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;

            if (!email || !password) {
                showError("Please fill in all fields.");
                return;
            }

            const user = getUsers().find(
                (u) => u.email === email && u.password === password
            );

            if (!user) {
                showError("Invalid email or password.");
                return;
            }

            setCurrentUserId(user.id);
            window.location.href = "../../pages/home/index.html";
        });
    }
}

main();
