import {
    initStorage,
    getUsers,
    getPosts,
    savePosts,
    getCurrentUserId,
} from "../../data/storage.js";

const ROOT = "../../";

const AVATAR_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23dde1ed'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%236b7190'/%3E%3Cellipse cx='50' cy='84' rx='28' ry='22' fill='%236b7190'/%3E%3C/svg%3E";

function imgSrc(path) {
    if (!path) return AVATAR_PLACEHOLDER;
    if (path.startsWith("data:")) return path;
    return ROOT + path;
}


function timeAgo(isoString) {
    const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return Math.floor(diff / 86400) + "d ago";
}


export function createPostCard(post, user, isOwner) {
    const card = document.createElement("div");
    card.className = "post-card";
    card.dataset.postId = post.id;

    const likeCount = (post.likes || []).length;
    const commentCount = (post.comments || []).length;

    const profileHref = `${ROOT}pages/profile/profile.html?userId=${user.id}`;

    card.innerHTML = `
        <div class="post-header">
            <a href="${profileHref}" style="display:contents;">
                <img class="avatar-img" src="${imgSrc(user.profilePicture)}" alt="${user.username}">
            </a>
            <div class="post-meta">
                <a class="post-name" href="${profileHref}">${user.username}</a>
                <span class="post-handle">@${user.username} · ${timeAgo(post.timestamp)}</span>
            </div>
            ${isOwner ? `
            <div class="post-dots-wrapper">
                <span class="post-dots">···</span>
                <div class="dots-menu">
                    <button class="dots-menu-item btn-delete">🗑 Delete</button>
                </div>
            </div>` : ""}
        </div>

        <p class="post-body">${post.content}</p>

        ${post.image ? `<img class="post-image" src="${imgSrc(post.image)}" alt="Post image">` : ""}

        <div class="post-reactions">
            <button class="btn-like ${(post.likes || []).includes("__CU__") ? "liked" : ""}">
                ♥ <span class="like-count">${likeCount}</span>
            </button>
            <button class="btn-comment">
                💬 <span class="comment-count">${commentCount}</span>
            </button>
            <button class="btn-share">↗ Share</button>
        </div>

        <div class="comments-section" style="display:none;">
            <div class="comments-list"></div>
            <div class="comment-form">
                <input class="comment-input" placeholder="Write a comment..." maxlength="280">
                <button class="comment-submit">Reply</button>
            </div>
        </div>
    `;

    const currentUserId = getCurrentUserId() || "u1";
    const likeBtn = card.querySelector(".btn-like");
    if ((post.likes || []).includes(currentUserId)) {
        likeBtn.classList.add("liked");
    } else {
        likeBtn.classList.remove("liked");
    }

    renderComments(card, post);

    return card;
}


function renderComments(card, post) {
    const list = card.querySelector(".comments-list");
    if (!list) return;
    const users = getUsers();
    list.innerHTML = "";
    for (const c of (post.comments || [])) {
        const commenter = users.find(u => u.id === c.userId);
        if (!commenter) continue;
        const el = document.createElement("div");
        el.className = "comment";
        el.innerHTML = `
            <img class="avatar-sm" src="${imgSrc(commenter.profilePicture)}" alt="${commenter.username}">
            <div class="comment-body">
                <span class="comment-name">${commenter.username}</span>
                <span class="comment-text">${c.content}</span>
                <span class="comment-time">${timeAgo(c.timestamp)}</span>
            </div>
        `;
        list.appendChild(el);
    }
}


export function wirePostCard(card, post, currentUserId, onUpdate, onComment) {
    const likeBtn = card.querySelector(".btn-like");
    if (likeBtn) {
        likeBtn.addEventListener("click", () => {
            const posts = getPosts();
            const p = posts.find(x => x.id === post.id);
            if (!p) return;
            const likes = p.likes || [];
            if (likes.includes(currentUserId)) {
                p.likes = likes.filter(id => id !== currentUserId);
            } else {
                p.likes = [...likes, currentUserId];
            }
            savePosts(posts);
            const countEl = likeBtn.querySelector(".like-count");
            if (countEl) countEl.textContent = p.likes.length;
            likeBtn.classList.toggle("liked", p.likes.includes(currentUserId));
            post.likes = p.likes;
        });
    }

    const commentBtn = card.querySelector(".btn-comment");
    const commentsSection = card.querySelector(".comments-section");
    if (commentBtn && commentsSection) {
        commentBtn.addEventListener("click", () => {
            const visible = commentsSection.style.display !== "none";
            commentsSection.style.display = visible ? "none" : "flex";
        });
    }

    const commentInput = card.querySelector(".comment-input");
    const commentSubmit = card.querySelector(".comment-submit");
    if (commentInput && commentSubmit) {
        commentSubmit.addEventListener("click", () => {
            const text = commentInput.value.trim();
            if (!text) return;
            const posts = getPosts();
            const p = posts.find(x => x.id === post.id);
            if (!p) return;
            p.comments = p.comments || [];
            p.comments.push({
                id: "c" + Date.now(),
                userId: currentUserId,
                content: text,
                timestamp: new Date().toISOString(),
            });
            savePosts(posts);
            post.comments = p.comments;
            commentInput.value = "";
            renderComments(card, p);
            const countEl = commentBtn?.querySelector(".comment-count");
            if (countEl) countEl.textContent = p.comments.length;
            if (onComment) onComment();
        });
        commentInput.addEventListener("keydown", e => {
            if (e.key === "Enter") commentSubmit.click();
        });
    }

    const dotsBtn = card.querySelector(".post-dots");
    const dotsMenu = card.querySelector(".dots-menu");
    if (dotsBtn && dotsMenu) {
        dotsBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            dotsMenu.classList.toggle("open");
        });
        document.addEventListener("click", () => dotsMenu.classList.remove("open"), { once: true });
    }

    const deleteBtn = card.querySelector(".btn-delete");
    if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
            const posts = getPosts();
            const updated = posts.filter(x => x.id !== post.id);
            savePosts(updated);
            onUpdate();
        });
    }

    const shareBtn = card.querySelector(".btn-share");
    if (shareBtn) {
        shareBtn.addEventListener("click", () => {
            const url = `${location.origin}/shared/post/index.html?id=${post.id}`;
            navigator.clipboard?.writeText(url).then(() => {
                shareBtn.textContent = "✓ Copied!";
                setTimeout(() => { shareBtn.textContent = "↗ Share"; }, 1800);
            });
        });
    }
}


async function main() {
    initStorage();

    const users = getUsers();
    const currentUserId = getCurrentUserId() || "u1";
    const loggedInUser = users.find(u => u.id === currentUserId);

    const navbarAvatar = document.getElementById("navbar-avatar");
    if (navbarAvatar && loggedInUser) {
        navbarAvatar.src = imgSrc(loggedInUser.profilePicture);
    }

    const params = new URLSearchParams(window.location.search);
    const postId = params.get("id");
    const container = document.getElementById("post-container");
    if (!container) return;

    if (!postId) {
        container.innerHTML = "<p>Post not found.</p>";
        return;
    }

    const posts = getPosts();
    const post = posts.find(p => p.id === postId);

    if (!post) {
        container.innerHTML = "<p>Post not found.</p>";
        return;
    }

    const user = users.find(u => u.id === post.userId);
    if (!user) {
        container.innerHTML = "<p>User not found.</p>";
        return;
    }

    const isOwner = post.userId === currentUserId;
    const card = createPostCard(post, user, isOwner);

    const commentsSection = card.querySelector(".comments-section");
    if (commentsSection) commentsSection.style.display = "flex";

    wirePostCard(card, post, currentUserId, () => {
        window.location.href = "../home/index.html";
    });

    container.appendChild(card);
}

if (document.getElementById("post-container")) {
    main();
}
