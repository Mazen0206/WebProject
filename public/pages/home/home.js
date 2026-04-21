import { api, getCurrentUserId, clearSession } from "../../shared/api.js";
import { createPostCard, wirePostCard } from "../../shared/post/post.js";

const AVATAR_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23dde1ed'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%236b7190'/%3E%3Cellipse cx='50' cy='84' rx='28' ry='22' fill='%236b7190'/%3E%3C/svg%3E";

function avatarSrc(path) {
    if (!path) return AVATAR_PLACEHOLDER;
    if (path.startsWith("data:") || path.startsWith("http")) return path;
    return "/" + path;
}

async function main() {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
        window.location.href = "/pages/auth/login.html";
        return;
    }

    await renderFeed();
    await renderSuggestions();
    wireComposeBox();
    wireLogout();
    wirePostModal();
}

// ─── Post Detail Modal ────────────────────────────────────────────────────────

async function openPostModal(postId) {
    const currentUserId = getCurrentUserId();

    const { post } = await api.getPost(postId);
    if (!post) return;

    const content = document.getElementById("post-modal-content");
    if (!content) return;

    content.innerHTML = "";

    const isOwner = post.authorId === currentUserId;
    const card = createPostCard(post, post.author, isOwner);

    const commentsSection = card.querySelector(".comments-section");
    if (commentsSection) commentsSection.style.display = "flex";

    wirePostCard(
        card, post, currentUserId,
        () => { closePostModal(); renderFeed(); },
        () => { renderFeed(); }
    );

    content.appendChild(card);

    const modal = document.getElementById("post-modal");
    if (modal) {
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
}

function closePostModal() {
    const modal = document.getElementById("post-modal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
}

function wirePostModal() {
    document.getElementById("post-modal-close")?.addEventListener("click", closePostModal);

    document.getElementById("post-modal")?.addEventListener("click", (e) => {
        if (e.target.id === "post-modal") closePostModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closePostModal();
    });
}

function wireLogout() {
    const btn = document.getElementById("logout-btn");
    if (!btn) return;
    btn.addEventListener("click", () => {
        clearSession();
        window.location.href = "/pages/auth/login.html";
    });
}

async function renderFeed() {
    const currentUserId = getCurrentUserId();
    const container     = document.getElementById("posts-container");

    // Avatar in the compose box
    const composeAvatar = document.getElementById("compose-avatar");
    if (composeAvatar) {
        try {
            const { user } = await api.getUser(currentUserId);
            composeAvatar.src = avatarSrc(user.profilePicture);
            composeAvatar.alt = user.username;
        } catch {}
    }

    const { posts } = await api.getFeed(currentUserId);
    container.innerHTML = "";

    if (posts.length === 0) {
        container.innerHTML = "<p style='padding:20px;color:#6b7190;'>No posts yet. Start by following someone or posting your own update!</p>";
        return;
    }

    for (const post of posts) {
        const isOwner = post.authorId === currentUserId;
        const card    = createPostCard(post, post.author, isOwner);
        wirePostCard(card, post, currentUserId, renderFeed);

        card.querySelector(".post-body")?.addEventListener("click", () => openPostModal(post.id));
        card.querySelector(".post-image")?.addEventListener("click", () => openPostModal(post.id));

        container.appendChild(card);
    }
}

function wireComposeBox() {
    const input       = document.getElementById("compose-input");
    const composeBtn  = document.getElementById("compose-btn");
    const fileInput   = document.getElementById("compose-image-file");
    const preview     = document.getElementById("compose-img-preview");
    const removeBtn   = document.getElementById("compose-img-remove");
    if (!input || !composeBtn) return;

    const currentUserId = getCurrentUserId();
    let pendingImage = null;

    if (fileInput) {
        fileInput.addEventListener("change", () => {
            const file = fileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                pendingImage = e.target.result;
                if (preview) { preview.src = pendingImage; preview.style.display = "block"; }
                if (removeBtn) removeBtn.style.display = "inline-block";
            };
            reader.readAsDataURL(file);
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener("click", () => {
            pendingImage = null;
            if (fileInput) fileInput.value = "";
            if (preview) { preview.src = ""; preview.style.display = "none"; }
            removeBtn.style.display = "none";
        });
    }

    composeBtn.addEventListener("click", async () => {
        const content = input.value.trim();
        if (!content) return;

        await api.createPost({
            authorId: currentUserId,
            content,
            image: pendingImage || null,
        });

        input.value = "";
        pendingImage = null;
        if (fileInput) fileInput.value = "";
        if (preview) { preview.src = ""; preview.style.display = "none"; }
        if (removeBtn) removeBtn.style.display = "none";
        renderFeed();
    });
}

async function renderSuggestions() {
    const container = document.getElementById("suggestions-container");
    if (!container) return;

    const currentUserId = getCurrentUserId();
    const { users } = await api.getSuggestions(currentUserId);

    container.innerHTML = "";

    users.forEach(user => {
        const row = document.createElement("div");
        row.className = "user-row";
        row.innerHTML = `
            <a href="/pages/profile/profile.html?userId=${user.id}" style="display:contents;">
                <img src="${avatarSrc(user.profilePicture)}" alt="${user.username}" class="avatar-img">
            </a>
            <div class="user-info">
                <a href="/pages/profile/profile.html?userId=${user.id}" class="user-name" style="text-decoration:none; color:inherit;">${user.username}</a>
                <span class="user-handle">@${user.username}</span>
            </div>
            <button class="btn-follow" data-user-id="${user.id}">Follow</button>
        `;
        container.appendChild(row);

        const btn = row.querySelector(".btn-follow");
        btn.addEventListener("click", async () => {
            await api.follow(user.id, currentUserId);
            btn.textContent = "Following";
            btn.disabled = true;
            btn.classList.add("btn-unfollow");
            renderFeed();
        });
    });
}

main();
