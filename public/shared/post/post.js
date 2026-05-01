import { api, getCurrentUserId, validateSession } from "../api.js";

const AVATAR_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23dde1ed'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%236b7190'/%3E%3Cellipse cx='50' cy='84' rx='28' ry='22' fill='%236b7190'/%3E%3C/svg%3E";

function imgSrc(path) {
    if (!path) return AVATAR_PLACEHOLDER;
    if (path.startsWith("data:") || path.startsWith("http")) return path;
    return "/" + path;
}

function timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60)    return "just now";
    if (diff < 3600)  return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return Math.floor(diff / 86400) + "d ago";
}

function likeUserIds(post) {
    // API returns post.likes as [{ userId }]; accept either shape for safety.
    if (!post.likes) return [];
    if (typeof post.likes[0] === "string") return post.likes;
    return post.likes.map(l => l.userId);
}

export function createPostCard(post, user, isOwner) {
    const card = document.createElement("div");
    card.className = "post-card";
    card.dataset.postId = post.id;

    const likedIds     = likeUserIds(post);
    const likeCount    = likedIds.length;
    const commentCount = (post.comments || []).length;

    const profileHref = `/pages/profile/profile.html?userId=${user.id}`;
    const currentUserId = getCurrentUserId() || "";
    const isLikedByMe = likedIds.includes(currentUserId);

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

        <p class="post-body">${escapeHTML(post.content)}</p>

        ${post.image ? `<img class="post-image" src="${imgSrc(post.image)}" alt="Post image">` : ""}

        <div class="post-reactions">
            <button class="btn-like ${isLikedByMe ? "liked" : ""}">
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

    renderComments(card, post, currentUserId);
    return card;
}

function escapeHTML(s) {
    return (s || "").replace(/[&<>"]/g, c => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;",
    }[c]));
}

function renderComments(card, post, currentUserId) {
    const list = card.querySelector(".comments-list");
    if (!list) return;
    list.innerHTML = "";
    for (const c of (post.comments || [])) {
        const commenter = c.author || { username: "user", profilePicture: null };
        const isCommentOwner = c.authorId === currentUserId || post.authorId === currentUserId;
        const el = document.createElement("div");
        el.className = "comment";
        el.innerHTML = `
            <img class="avatar-sm" src="${imgSrc(commenter.profilePicture)}" alt="${commenter.username}">
            <div class="comment-body" style="flex: 1; position: relative;">
                <span class="comment-name">${commenter.username}</span>
                <span class="comment-text">${escapeHTML(c.content)}</span>
                <span class="comment-time">${timeAgo(c.timestamp)}</span>
                ${isCommentOwner ? `<button class="btn-delete-comment" data-id="${c.id}" style="position: absolute; right: 0; top: 0; background: none; border: none; color: #ff4d4f; cursor: pointer; font-size: 12px;">Delete</button>` : ""}
            </div>
        `;
        list.appendChild(el);
    }

    // Attach delete listeners
    list.querySelectorAll(".btn-delete-comment").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const commentId = btn.dataset.id;
            try {
                await api.deleteComment(commentId);
                post.comments = post.comments.filter(c => c.id !== commentId);
                renderComments(card, post, currentUserId);
                const countEl = card.querySelector(".comment-count");
                if (countEl) countEl.textContent = post.comments.length;
            } catch (err) {
                console.error("Failed to delete comment", err);
            }
        });
    });
}

export function wirePostCard(card, post, currentUserId, onUpdate, onComment) {
    // Like button
    const likeBtn = card.querySelector(".btn-like");
    if (likeBtn) {
        likeBtn.addEventListener("click", async () => {
            const ids = likeUserIds(post);
            const alreadyLiked = ids.includes(currentUserId);
            try {
                if (alreadyLiked) {
                    await api.unlikePost(post.id, currentUserId);
                    post.likes = ids.filter(id => id !== currentUserId).map(userId => ({ userId }));
                } else {
                    await api.likePost(post.id, currentUserId);
                    post.likes = [...ids, currentUserId].map(userId => ({ userId }));
                }
                const countEl = likeBtn.querySelector(".like-count");
                if (countEl) countEl.textContent = likeUserIds(post).length;
                likeBtn.classList.toggle("liked", !alreadyLiked);
            } catch (e) {
                console.error(e);
            }
        });
    }

    // Comment toggle
    const commentBtn = card.querySelector(".btn-comment");
    const commentsSection = card.querySelector(".comments-section");
    if (commentBtn && commentsSection) {
        commentBtn.addEventListener("click", () => {
            const visible = commentsSection.style.display !== "none";
            commentsSection.style.display = visible ? "none" : "flex";
        });
    }

    // Comment submit
    const commentInput = card.querySelector(".comment-input");
    const commentSubmit = card.querySelector(".comment-submit");
    if (commentInput && commentSubmit) {
        const submit = async () => {
            const text = commentInput.value.trim();
            if (!text) return;
            const { comment } = await api.addComment(post.id, currentUserId, text);
            post.comments = [...(post.comments || []), comment];
            commentInput.value = "";
            renderComments(card, post, currentUserId);
            const countEl = commentBtn?.querySelector(".comment-count");
            if (countEl) countEl.textContent = (post.comments || []).length;
            if (onComment) onComment();
        };
        commentSubmit.addEventListener("click", submit);
        commentInput.addEventListener("keydown", e => {
            if (e.key === "Enter") submit();
        });
    }

    // Dots menu
    const dotsBtn = card.querySelector(".post-dots");
    const dotsMenu = card.querySelector(".dots-menu");
    if (dotsBtn && dotsMenu) {
        dotsBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            dotsMenu.classList.toggle("open");
        });
        document.addEventListener("click", () => dotsMenu.classList.remove("open"), { once: true });
    }

    // Delete
    const deleteBtn = card.querySelector(".btn-delete");
    if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            await api.deletePost(post.id);
            onUpdate?.();
        });
    }

    // Share
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

// ── Standalone post detail page ─────────────────────────────────────────────
async function main() {
    const currentUserId = await validateSession();
    if (!currentUserId) {
        window.location.href = "/pages/auth/login.html";
        return;
    }

    // Top-right navbar avatar
    const navbarAvatar = document.getElementById("navbar-avatar");
    if (navbarAvatar) {
        try {
            const { user } = await api.getUser(currentUserId);
            navbarAvatar.src = imgSrc(user.profilePicture);
        } catch {}
    }

    const params = new URLSearchParams(window.location.search);
    const postId = params.get("id");
    const container = document.getElementById("post-container");
    if (!container) return;

    if (!postId) {
        container.innerHTML = "<p>Post not found.</p>";
        return;
    }

    let post = null;
    try {
        const res = await api.getPost(postId);
        post = res.post;
    } catch {}

    if (!post) {
        container.innerHTML = "<p>Post not found.</p>";
        return;
    }

    const isOwner = post.authorId === currentUserId;
    const card = createPostCard(post, post.author, isOwner);

    const commentsSection = card.querySelector(".comments-section");
    if (commentsSection) commentsSection.style.display = "flex";

    wirePostCard(card, post, currentUserId, () => {
        window.location.href = "/pages/home/index.html";
    });

    container.appendChild(card);
    wireUserSearch(currentUserId);
}

function wireUserSearch(currentUserId) {
    const input   = document.getElementById("user-search-input");
    const results = document.getElementById("user-search-results");
    if (!input || !results) return;

    let debounceTimer = null;

    input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const q = input.value.trim();

        if (!q) {
            results.style.display = "none";
            results.innerHTML = "";
            return;
        }

        debounceTimer = setTimeout(async () => {
            const { users } = await api.searchUsers(q, currentUserId);
            results.innerHTML = "";

            if (!users.length) {
                results.innerHTML = `<p class="user-search-empty">No users found for "${q}".</p>`;
                results.style.display = "block";
                return;
            }

            users.forEach(user => {
                const row = document.createElement("div");
                row.className = "user-row";
                row.style.cssText = "display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--color-border);";
                row.innerHTML = `
                    <img src="${imgSrc(user.profilePicture)}" alt="${user.username}" class="avatar-img">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:14px;">${user.username}</div>
                        <div style="color:var(--color-text-secondary);font-size:12px;">@${user.username}</div>
                    </div>
                `;
                row.addEventListener("click", () => {
                    window.location.href = `/pages/profile/profile.html?userId=${user.id}`;
                });
                results.appendChild(row);
            });

            results.style.display = "block";
        }, 300);
    });

    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.style.display = "none";
        }
    });

    input.addEventListener("focus", () => {
        if (input.value.trim() && results.innerHTML) {
            results.style.display = "block";
        }
    });
}

if (document.getElementById("post-container")) {
    main();
}
