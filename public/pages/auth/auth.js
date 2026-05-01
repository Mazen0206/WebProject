import { api, getCurrentUserId, clearSession, setCurrentUserId, validateSession } from "../../shared/api.js";

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
    const successEl = document.querySelector(".auth-success");
    if (successEl) successEl.remove();
}

async function redirectIfLoggedIn() {
    const id = await validateSession();
    if (id) {
        window.location.href = "/pages/home/index.html";
    }
}

function main() {
    redirectIfLoggedIn();

    const form = document.querySelector(".auth-form");
    const path = window.location.pathname;

    if (path.includes("register")) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearError();

            const email    = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const confirm  = document.getElementById("confirm-password").value;

            if (!email || !password) {
                showError("Please fill in all fields.");
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError("Please enter a valid email address.");
                return;
            }

            if (password.length < 8) {
                showError("Password must be at least 8 characters.");
                return;
            }

            const passwordRegex = /^(?=.*[A-Z])(?=.*\d).+$/;
            if (!passwordRegex.test(password)) {
                showError("Password must contain at least one uppercase letter and one number.");
                return;
            }

            if (password !== confirm) {
                showError("Passwords do not match.");
                return;
            }

            try {
                await api.register({ email, password });
                
                // Show success message
                const successEl = document.createElement("p");
                successEl.className = "auth-success";
                successEl.style.color = "#10b981";
                successEl.style.marginTop = "10px";
                successEl.style.fontWeight = "500";
                successEl.textContent = "Registration successful! Redirecting to login...";
                document.querySelector(".auth-form").prepend(successEl);
                
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1500);
            } catch (err) {
                showError(err.message || "Registration failed.");
            }
        });
    }

    if (path.includes("login")) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearError();

            const email    = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;

            if (!email || !password) {
                showError("Please fill in all fields.");
                return;
            }

            try {
                const { user } = await api.login({ email, password });
                setCurrentUserId(user.id);
                window.location.href = "/pages/home/index.html";
            } catch (err) {
                showError(err.message || "Invalid email or password.");
            }
        });
    }
}

main();
