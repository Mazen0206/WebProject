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

    // Render profile header
    renderProfile(viewedUser, loggedInUser, isOwnProfile);

    // Set navbar avatar
    const navbarAvatar = document.getElementById("navbar-avatar");
    if (navbarAvatar) navbarAvatar.src = ROOT + loggedInUser.profilePicture;

    // Compose section (own profile only)
    if (isOwnProfile) {
        document.getElementById("compose-section").style.display = "flex";
        document.getElementById("compose-avatar").src = ROOT + loggedInUser.profilePicture;
        wireCompose(currentUserId, () => renderPosts(viewedUserId, currentUserId));
    }

    // Action button (Edit Profile vs Follow/Unfollow)
    wireProfileAction(viewedUser, loggedInUser, isOwnProfile, currentUserId);

    // Tabs
    wireTabs(viewedUserId, currentUserId);

    // Initial render
    renderPosts(viewedUserId, currentUserId);
}

function renderProfile(viewedUser, loggedInUser, isOwnProfile) {
    const cover = viewedUser.coverImage || "assets/Posts/post-nature.jpg";
    document.getElementById("profile-cover").src = ROOT + cover;
    document.getElementById("profile-avatar-img").src = ROOT + viewedUser.profilePicture;

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
    const input = document.getElementById("compose-input");
    const btn = document.getElementById("compose-btn");
    if (!input || !btn) return;

    btn.addEventListener("click", () => {
        const content = input.value.trim();
        if (!content) return;

        const posts = getPosts();
        posts.push({
            id: "p" + Date.now(),
            userId: currentUserId,
            content,
            image: null,
            timestamp: new Date().toISOString(),
            likes: [],
            comments: []
        });
        savePosts(posts);
        input.value = "";
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

// ─── Edit Profile Modal ─────────────────────────────────────────────────────

function openEditModal(viewedUserId, currentUserId) {
    const viewedUser = getUsers().find(u => u.id === viewedUserId);
    if (!viewedUser) return;
    document.getElementById("edit-name").value = viewedUser.username;
    document.getElementById("edit-bio").value = viewedUser.bio || "";
    updateCharCount();
    document.getElementById("edit-modal").style.display = "flex";
}

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
    saveUsers(users);

    const currentUserId = getCurrentUserId() || "u1";
    const loggedInUser = users.find(u => u.id === currentUserId);
    renderProfile(viewedUser, loggedInUser, true);
    renderPosts(viewedUserId, currentUserId);
    document.getElementById("edit-modal").style.display = "none";
});

main();
