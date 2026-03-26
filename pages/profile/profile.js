import {
    initStorage,
    getUsers,
    saveUsers,
    getPosts,
    savePosts,
    getCurrentUserId,
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

    const users = getUsers();
    const currentUserId = getCurrentUserId() || "u1";
    const params = new URLSearchParams(window.location.search);
    const viewedUserId = params.get("userId") || currentUserId;

    const viewedUser = users.find(u => u.id === viewedUserId);
    const loggedInUser = users.find(u => u.id === currentUserId);

    if (!viewedUser || !loggedInUser) {
        document.body.innerHTML = "<p>User not found.</p>";
        return;
    }

    const isOwnProfile = viewedUserId === currentUserId;

    renderProfile(viewedUser, loggedInUser, isOwnProfile);

    if (isOwnProfile) {
        document.getElementById("compose-section").style.display = "flex";
        document.getElementById("compose-avatar").src = avatarSrc(loggedInUser.profilePicture);
        wireCompose(currentUserId, () => {
            renderPosts(viewedUserId, currentUserId);
            renderPhotoGrid(viewedUserId);
        });
    }

    wireProfileAction(viewedUser, loggedInUser, isOwnProfile, currentUserId);

    wireTabs(viewedUserId, currentUserId);

    renderPosts(viewedUserId, currentUserId);
    renderPhotoGrid(viewedUserId);
}

const COVER_FALLBACKS = [
    "assets/Posts/post-city.jpg",
    "assets/Posts/post-nature.jpg",
    "assets/Posts/post-street.jpg",
    "assets/Posts/post-appreciation.jpg",
    "assets/Posts/post-coffee.jpg",
    "assets/Posts/post-couch.jpg",
];

function renderProfile(viewedUser, loggedInUser, isOwnProfile) {
    const userIndex = parseInt((viewedUser.id || "u1").replace("u", ""), 10) || 1;
    const cover = viewedUser.coverImage || COVER_FALLBACKS[(userIndex - 1) % COVER_FALLBACKS.length];
    document.getElementById("profile-cover").src = ROOT + cover;
    document.getElementById("profile-avatar-img").src = avatarSrc(viewedUser.profilePicture);

    document.getElementById("profile-name").textContent = viewedUser.username;
    document.getElementById("profile-handle").textContent = "@" + viewedUser.username;
    document.getElementById("profile-bio").textContent = viewedUser.bio || "";

    const following = viewedUser.following || [];
    const followers = viewedUser.followers || [];
    document.getElementById("following-count").textContent = following.length;
    document.getElementById("followers-count").textContent = followers.length;

    const actionBtn = document.getElementById("profile-action-btn");
    if (isOwnProfile) {
        actionBtn.textContent = "Edit Profile";
        actionBtn.className = "btn-edit-profile";
    } else {
        const isFollowing = (loggedInUser.following || []).includes(viewedUser.id);
        actionBtn.textContent = isFollowing ? "Unfollow" : "Follow";
        actionBtn.className = isFollowing ? "btn-unfollow" : "btn-primary";
    }
}

function wireProfileAction(viewedUser, loggedInUser, isOwnProfile, currentUserId) {
    const actionBtn = document.getElementById("profile-action-btn");
    actionBtn.addEventListener("click", () => {
        if (isOwnProfile) {
            openEditModal(viewedUser.id, currentUserId);
        } else {
            const users = getUsers();
            toggleFollow(
                users.find(u => u.id === viewedUser.id),
                users.find(u => u.id === currentUserId),
                currentUserId
            );
        }
    });
}

function toggleFollow(viewedUser, loggedInUser, currentUserId) {
    const users = getUsers();
    const me = users.find(u => u.id === currentUserId);
    const target = users.find(u => u.id === viewedUser.id);
    if (!me || !target) return;

    const myFollowing = me.following || [];
    const targetFollowers = target.followers || [];

    if (myFollowing.includes(target.id)) {
        me.following = myFollowing.filter(id => id !== target.id);
        target.followers = targetFollowers.filter(id => id !== currentUserId);
    } else {
        me.following = [...myFollowing, target.id];
        target.followers = [...targetFollowers, currentUserId];
    }

    saveUsers(users);
    const fresh = getUsers();
    renderProfile(
        fresh.find(u => u.id === target.id),
        fresh.find(u => u.id === currentUserId),
        false
    );
}

function wireCompose(currentUserId, onPost) {
    const input     = document.getElementById("compose-input");
    const btn       = document.getElementById("compose-btn");
    const fileInput = document.getElementById("compose-image-file");
    const preview   = document.getElementById("compose-img-preview");
    const removeBtn = document.getElementById("compose-img-remove");
    if (!input || !btn) return;

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

    btn.addEventListener("click", () => {
        const content = input.value.trim();
        if (!content) return;

        const posts = getPosts();
        posts.push({
            id: "p" + Date.now(),
            userId: currentUserId,
            content,
            image: pendingImage || null,
            timestamp: new Date().toISOString(),
            likes: [],
            comments: []
        });
        savePosts(posts);
        input.value = "";
        pendingImage = null;
        if (fileInput) fileInput.value = "";
        if (preview) { preview.src = ""; preview.style.display = "none"; }
        if (removeBtn) removeBtn.style.display = "none";
        onPost();
    });
}

function wireTabs(viewedUserId, currentUserId) {
    const postsBtn = document.getElementById("posts-tab-btn");
    const likesBtn = document.getElementById("likes-tab-btn");
    if (!postsBtn || !likesBtn) return;

    postsBtn.addEventListener("click", () => {
        postsBtn.classList.add("active");
        likesBtn.classList.remove("active");
        renderPosts(viewedUserId, currentUserId, "posts");
    });
    likesBtn.addEventListener("click", () => {
        likesBtn.classList.add("active");
        postsBtn.classList.remove("active");
        renderPosts(viewedUserId, currentUserId, "likes");
    });
}

function renderPosts(viewedUserId, currentUserId, tab = "posts") {
    const container = document.getElementById("posts-container");
    const users = getUsers();
    const allPosts = getPosts();
    const viewedUser = users.find(u => u.id === viewedUserId);

    let posts;
    if (tab === "likes") {
        posts = allPosts
            .filter(p => (p.likes || []).includes(viewedUserId))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else {
        posts = allPosts
            .filter(p => p.userId === viewedUserId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    container.innerHTML = "";
    if (posts.length === 0) {
        container.innerHTML = "<p class='no-posts'>No posts yet.</p>";
        return;
    }

    const isOwner = viewedUserId === currentUserId;
    for (const post of posts) {
        const user = users.find(u => u.id === post.userId);
        if (!user) continue;
        const card = createPostCard(post, user, isOwner);
        wirePostCard(card, post, currentUserId, () => {
            const activeTab = document.getElementById("likes-tab-btn").classList.contains("active") ? "likes" : "posts";
            renderPosts(viewedUserId, currentUserId, activeTab);
        });
        container.appendChild(card);
    }
}


function openEditModal(viewedUserId, currentUserId) {
    const viewedUser = getUsers().find(u => u.id === viewedUserId);
    if (!viewedUser) return;
    document.getElementById("edit-name").value = viewedUser.username;
    document.getElementById("edit-bio").value = viewedUser.bio || "";

    const preview = document.getElementById("edit-avatar-preview");
    if (preview) preview.src = avatarSrc(viewedUser.profilePicture);

    const fileInput = document.getElementById("edit-avatar-file");
    if (fileInput) fileInput.value = "";

    updateCharCount();
    document.getElementById("edit-modal").style.display = "flex";
}

document.getElementById("edit-avatar-file")?.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById("edit-avatar-preview");
        if (preview) preview.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

document.getElementById("close-modal-btn")?.addEventListener("click", () => {
    document.getElementById("edit-modal").style.display = "none";
});

document.getElementById("edit-modal")?.addEventListener("click", function (e) {
    if (e.target === this) this.style.display = "none";
});

document.getElementById("edit-bio")?.addEventListener("input", updateCharCount);

function updateCharCount() {
    const el = document.getElementById("char-count");
    const bio = document.getElementById("edit-bio");
    if (el && bio) el.textContent = bio.value.length + " / 150";
}

document.getElementById("edit-profile-form")?.addEventListener("submit", function (e) {
    e.preventDefault();

    const params = new URLSearchParams(window.location.search);
    const viewedUserId = params.get("userId") || getCurrentUserId() || "u1";
    const users = getUsers();
    const viewedUser = users.find(u => u.id === viewedUserId);
    if (!viewedUser) return;

    viewedUser.username = document.getElementById("edit-name").value.trim();
    viewedUser.bio = document.getElementById("edit-bio").value.trim();

    const preview = document.getElementById("edit-avatar-preview");
    const fileInput = document.getElementById("edit-avatar-file");
    if (fileInput && fileInput.files.length > 0 && preview && preview.src.startsWith("data:")) {
        viewedUser.profilePicture = preview.src;
    }

    saveUsers(users);

    const currentUserId = getCurrentUserId() || "u1";
    const loggedInUser = users.find(u => u.id === currentUserId);
    renderProfile(viewedUser, loggedInUser, true);

    const composeAvatar = document.getElementById("compose-avatar");
    if (composeAvatar) composeAvatar.src = avatarSrc(viewedUser.profilePicture);
    
    renderPosts(viewedUserId, currentUserId);
    document.getElementById("edit-modal").style.display = "none";
});

function renderPhotoGrid(viewedUserId) {
    const grid = document.getElementById("photo-grid");
    const countEl = document.getElementById("photo-count");
    const emptyEl = document.getElementById("photo-grid-empty");
    if (!grid) return;

    const allPosts = getPosts();
    const postsWithImages = allPosts
        .filter(p => p.userId === viewedUserId && p.image)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (countEl) countEl.textContent = postsWithImages.length + " posts";

    grid.innerHTML = "";
    if (postsWithImages.length === 0) {
        if (emptyEl) emptyEl.style.display = "block";
        return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    postsWithImages.forEach(post => {
        const img = document.createElement("img");
        img.src = ROOT + post.image;
        img.alt = "Post photo";
        img.className = "photo-grid-item";
        grid.appendChild(img);
    });
}

main();
