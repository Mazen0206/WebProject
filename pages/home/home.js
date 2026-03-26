import {
    initStorage,
    getUsers,
    saveUsers,
    getPosts,
    savePosts,
    getCurrentUserId,
    clearSession,
} from "../../data/storage.js";
import { createPostCard, wirePostCard } from "../../shared/post/post.js";

const ROOT = "../../";
const AVATAR_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23dde1ed'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%236b7190'/%3E%3Cellipse cx='50' cy='84' rx='28' ry='22' fill='%236b7190'/%3E%3C/svg%3E";

function avatarSrc(path) {
    if (!path) return AVATAR_PLACEHOLDER;
    if (path.startsWith("data:")) return path;
    return ROOT + path;
}

async function main() {
    await initStorage();
    renderFeed();
    renderSuggestions();
    wireComposeBox();
    wireFollowButtons();
    wireLogout();
    wirePostModal();
}

// ─── Post Detail Modal ────────────────────────────────────────────────────────

function openPostModal(postId) {
    const users         = getUsers();
    const posts         = getPosts();
    const currentUserId = getCurrentUserId() || "u1";

    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const user = users.find(u => u.id === post.userId);
    if (!user) return;

    const content = document.getElementById("post-modal-content");
    if (!content) return;

    content.innerHTML = "";

    const card = createPostCard(post, user, post.userId === currentUserId);

    const commentsSection = card.querySelector(".comments-section");
    if (commentsSection) commentsSection.style.display = "flex";

    wirePostCard(card, post, currentUserId, () => {
        closePostModal();
        renderFeed();
    });

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
        window.location.href = "../auth/register.html";
    });
}


function renderFeed() {
    const users         = getUsers();
    const currentUserId = getCurrentUserId() || "u1";
    const currentUser   = users.find(u => u.id === currentUserId);
    const container     = document.getElementById("posts-container");

    const composeAvatar = document.getElementById("compose-avatar");
    if (composeAvatar && currentUser) {
        composeAvatar.src = avatarSrc(currentUser.profilePicture);
        composeAvatar.alt = currentUser.username;
    }

    if (!currentUser) {
        container.innerHTML = "<p style='padding:20px;color:#6b7190;'>Please log in to see your feed.</p>";
        return;
    }

    // Filter: posts from followed users, newest first
    const feedPosts = getPosts()
        .filter(p => p.userId === currentUserId || (currentUser.following || []).includes(p.userId))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    container.innerHTML = "";

    for (const post of feedPosts) {
        const user   = users.find(u => u.id === post.userId);
        if (!user) continue;

        const isOwner = post.userId === currentUserId;
        const card    = createPostCard(post, user, isOwner);
        wirePostCard(card, post, currentUserId, renderFeed);

        // Clicking the post body or image opens the detail modal
        card.querySelector(".post-body")?.addEventListener("click", () => openPostModal(post.id));
        card.querySelector(".post-image")?.addEventListener("click", () => openPostModal(post.id));

        container.appendChild(card);
    }
}


function wireComposeBox() {
    const input     = document.getElementById("compose-input");
    const composeBtn = document.getElementById("compose-btn");
    const fileInput  = document.getElementById("compose-image-file");
    const preview    = document.getElementById("compose-img-preview");
    const removeBtn  = document.getElementById("compose-img-remove");
    if (!input || !composeBtn) return;

    const currentUserId = getCurrentUserId() || "u1";
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

    composeBtn.addEventListener("click", () => {
        const content = input.value.trim();
        if (!content) return;

        const allPosts = getPosts();
        allPosts.push({
            id:        "p" + Date.now(),
            userId:    currentUserId,
            content,
            image:     pendingImage || null,
            timestamp: new Date().toISOString(),
            likes:     [],
            comments:  []
        });

        savePosts(allPosts);
        input.value = "";
        pendingImage = null;
        if (fileInput) fileInput.value = "";
        if (preview) { preview.src = ""; preview.style.display = "none"; }
        if (removeBtn) removeBtn.style.display = "none";
        renderFeed();
    });
}


function renderSuggestions() {
    const container = document.getElementById("suggestions-container");
    if (!container) return;

    const users = getUsers();
    const currentUserId = getCurrentUserId() || "u1";
    
    const suggestedUsers = users.filter(u => u.id !== currentUserId);

    container.innerHTML = "";

    suggestedUsers.forEach(user => {
        const row = document.createElement("div");
        row.className = "user-row";
        row.innerHTML = `
            <a href="../profile/profile.html?userId=${user.id}" style="display:contents;">
                <img src="${avatarSrc(user.profilePicture)}" alt="${user.username}" class="avatar-img">
            </a>
            <div class="user-info">
                <a href="../profile/profile.html?userId=${user.id}" class="user-name" style="text-decoration:none; color:inherit;">${user.username}</a>
                <span class="user-handle">@${user.username}</span>
            </div>
            <button class="btn-follow" data-user-id="${user.id}">Follow</button>
        `;
        container.appendChild(row);
    });
}

function wireFollowButtons() {
    const currentUserId = getCurrentUserId() || "u1";

    document.querySelectorAll(".btn-follow").forEach(btn => {
        const targetId = btn.dataset.userId;
        if (!targetId) return;

        const allUsers  = getUsers();
        const me        = allUsers.find(u => u.id === currentUserId);
        if (!me) return;

        const isFollowing = me.following.includes(targetId);
        btn.textContent = isFollowing ? "Unfollow" : "Follow";
        btn.className = isFollowing ? "btn-unfollow" : "btn-follow";

        btn.addEventListener("click", () => {
            const freshUsers = getUsers();
            const freshMe    = freshUsers.find(u => u.id === currentUserId);
            const freshTarget = freshUsers.find(u => u.id === targetId);
            if (!freshMe || !freshTarget) return;

            if (freshMe.following.includes(targetId)) {
                freshMe.following = freshMe.following.filter(id => id !== targetId);
                freshTarget.followers = (freshTarget.followers || []).filter(id => id !== currentUserId);
                btn.textContent = "Follow";
                btn.className = "btn-follow";
            } else {
                freshMe.following.push(targetId);
                freshTarget.followers = [...(freshTarget.followers || []), currentUserId];
                btn.textContent = "Unfollow";
                btn.className = "btn-unfollow";
            }

            saveUsers(freshUsers);
            renderFeed();
        });
    });
}

main();
