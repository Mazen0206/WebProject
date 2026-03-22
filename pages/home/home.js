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
    renderFeed();
    wireComposeBox();
    wireFollowButtons();
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

function renderFeed() {
    const users         = getUsers();
    const currentUserId = getCurrentUserId() || "u1";
    const currentUser   = users.find(u => u.id === currentUserId);
    const container     = document.getElementById("posts-container");

    // Set the logged-in user's avatar in the compose box
    const composeAvatar = document.getElementById("compose-avatar");
    if (composeAvatar && currentUser) {
        composeAvatar.src = ROOT + currentUser.profilePicture;
        composeAvatar.alt = currentUser.username;
    }

    // Filter: own posts + posts from followed users, newest first
    const feedPosts = getPosts()
        .filter(p =>
            p.userId === currentUserId ||
            currentUser.following.includes(p.userId)
        )
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    container.innerHTML = "";

    for (const post of feedPosts) {
        const user   = users.find(u => u.id === post.userId);
        if (!user) continue;

        const isOwner = post.userId === currentUserId;
        const card    = createPostCard(post, user, isOwner);
        wirePostCard(card, post, currentUserId, renderFeed);
        container.appendChild(card);
    }
}

// ─── Compose Box ──────────────────────────────────────────────────────────────

function wireComposeBox() {
    const input     = document.getElementById("compose-input");
    const composeBtn = document.getElementById("compose-btn");
    if (!input || !composeBtn) return;

    const currentUserId = getCurrentUserId() || "u1";

    composeBtn.addEventListener("click", () => {
        const content = input.value.trim();
        if (!content) return;

        const allPosts = getPosts();
        const newPost = {
            id:        "p" + Date.now(),
            userId:    currentUserId,
            content:   content,
            image:     null,
            timestamp: new Date().toISOString(),
            likes:     [],
            comments:  []
        };

        allPosts.push(newPost);
        savePosts(allPosts);
        input.value = "";
        renderFeed();
    });
}

// ─── Follow / Unfollow ────────────────────────────────────────────────────────

function wireFollowButtons() {
    const currentUserId = getCurrentUserId() || "u1";

    document.querySelectorAll(".btn-follow").forEach(btn => {
        const targetId = btn.dataset.userId;
        if (!targetId) return;

        const allUsers  = getUsers();
        const me        = allUsers.find(u => u.id === currentUserId);
        if (!me) return;

        // Set initial button label
        btn.textContent = me.following.includes(targetId) ? "Unfollow" : "Follow";

        btn.addEventListener("click", () => {
            const freshUsers = getUsers();
            const freshMe    = freshUsers.find(u => u.id === currentUserId);

            if (freshMe.following.includes(targetId)) {
                freshMe.following = freshMe.following.filter(id => id !== targetId);
                btn.textContent = "Follow";
            } else {
                freshMe.following.push(targetId);
                btn.textContent = "Unfollow";
            }

            saveUsers(freshUsers);
            renderFeed();
        });
    });
}

main();
