const STORAGE_KEYS = {
    users: "zento-users",
    currentUserId: "zento-currentUserId",
};

async function initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.users)) {
        try {
            const response = await fetch("../../data/storage.json");
            const data = await response.json();
            localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(data.users));
        } catch (err) {
            console.error("Failed to seed storage:", err);
        }
    }
}

function getUsers() {
    const saved = localStorage.getItem(STORAGE_KEYS.users);
    return saved ? JSON.parse(saved) : [];
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

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
    if (localStorage.getItem(STORAGE_KEYS.currentUserId)) {
        window.location.href = "../../pages/home/index.html";
    }
}

async function main() {
    await initStorage();
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
            if (password.length < 8) {
                showError("Password must be at least 8 characters.");
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
                profilePicture: "../../assets/images/icon.png",
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

            localStorage.setItem(STORAGE_KEYS.currentUserId, user.id);
            window.location.href = "../../pages/home/index.html";
        });
    }
}

main();
