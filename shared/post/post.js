import { getPosts, savePosts, getUsers } from "../../data/storage.js";

const ROOT = "../../";

/**
 * Build and return a post-card <article> element.
 * Existing comments are rendered inside a hidden comments section.
 */
export function createPostCard(post, user, isOwner = false) {
    const article = document.createElement("article");
    article.className = "post-card";
    article.dataset.postId = post.id;

    const pfpSrc      = ROOT + user.profilePicture;
    const timeAgo     = formatTimeAgo(post.timestamp);
    const likeCount   = post.likes    ? post.likes.length    : 0;
    const commentCount = post.comments ? post.comments.length : 0;
    const displayName = capitalize(user.username);

    const imageHtml = post.image
        ? `<img src="${ROOT + post.image}" alt="Post image" class="post-image">`
        : "";

    const deleteBtn = isOwner
        ? `<button class="btn-delete" data-post-id="${post.id}">🗑</button>`
        : "";

    // Render any existing comments from storage
    const existingCommentsHtml = buildCommentsHtml(post.comments || []);

    article.innerHTML = `
        <div class="post-header">
            <img src="${pfpSrc}" alt="${user.username}" class="avatar-img">
            <div class="post-meta">
                <span class="post-name">${displayName}</span>
                <span class="post-handle">@${user.username} · ${timeAgo}</span>
            </div>
            ${deleteBtn}
        </div>
        <p class="post-body">${post.content}</p>
        ${imageHtml}
        <div class="post-reactions">
            <button class="btn-like"    data-post-id="${post.id}">♡ ${likeCount}</button>
            <button class="btn-comment" data-post-id="${post.id}">💬 ${commentCount}</button>
            <button>⇄</button>
            <button>↗ Share</button>
        </div>

        <!-- Comments section — hidden by default, toggled by 💬 button -->
        <div class="comments-section" style="display: none;">
            <div class="comments-list">${existingCommentsHtml}</div>
            <div class="comment-form">
                <input class="comment-input" type="text" placeholder="Write a comment...">
                <button class="comment-submit">Reply</button>
            </div>
        </div>
    `;

    return article;
}

/**
 * Wire all interactions (like, comment, delete) onto a card element.
 */
export function wirePostCard(article, post, currentUserId, onDelete) {
    wireLike(article, post, currentUserId);
    wireComment(article, post, currentUserId);
    wireDelete(article, post, onDelete);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function wireLike(article, post, currentUserId) {
    const likeBtn = article.querySelector(".btn-like");
    if (!likeBtn) return;

    // Set initial heart state on page load
    const allPosts = getPosts();
    const initial  = allPosts.find(p => p.id === post.id);
    if (initial && initial.likes.includes(currentUserId)) {
        likeBtn.classList.add("liked");
    }

    likeBtn.addEventListener("click", () => {
        const freshPosts = getPosts();
        const target     = freshPosts.find(p => p.id === post.id);

        if (target.likes.includes(currentUserId)) {
            target.likes = target.likes.filter(id => id !== currentUserId);
            likeBtn.classList.remove("liked");
        } else {
            target.likes.push(currentUserId);
            likeBtn.classList.add("liked");
        }

        savePosts(freshPosts);
        likeBtn.textContent = `♡ ${target.likes.length}`;
    });
}

function wireComment(article, post, currentUserId) {
    const commentBtn     = article.querySelector(".btn-comment");
    const commentsSection = article.querySelector(".comments-section");
    const commentsList   = article.querySelector(".comments-list");
    const input          = article.querySelector(".comment-input");
    const submitBtn      = article.querySelector(".comment-submit");

    if (!commentBtn || !commentsSection) return;

    // Toggle the whole comments section (list + form) on 💬 click
    commentBtn.addEventListener("click", () => {
        const isHidden = commentsSection.style.display === "none";
        commentsSection.style.display = isHidden ? "block" : "none";
        if (isHidden) input.focus();
    });

    // Submit a new comment
    submitBtn.addEventListener("click", () => {
        const text = input.value.trim();
        if (!text) return;

        // Save to storage
        const allPosts = getPosts();
        const target   = allPosts.find(p => p.id === post.id);
        const newComment = {
            id:        "c" + Date.now(),
            userId:    currentUserId,
            content:   text,
            timestamp: new Date().toISOString()
        };
        target.comments.push(newComment);
        savePosts(allPosts);

        // Update the counter button
        commentBtn.textContent = `💬 ${target.comments.length}`;

        // Render the new comment immediately in the list
        const allUsers  = getUsers();
        const commenter = allUsers.find(u => u.id === currentUserId);
        const commentEl = buildCommentElement(newComment, commenter);
        commentsList.appendChild(commentEl);

        // Clear the input
        input.value = "";
    });

    // Also allow pressing Enter to submit
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submitBtn.click();
    });
}

function wireDelete(article, post, onDelete) {
    const deleteBtn = article.querySelector(".btn-delete");
    if (!deleteBtn) return;

    deleteBtn.addEventListener("click", () => {
        const allPosts = getPosts();
        const updated  = allPosts.filter(p => p.id !== post.id);
        savePosts(updated);
        article.remove();
        if (onDelete) onDelete();
    });
}

// ─── Comment rendering ────────────────────────────────────────────────────────

// Build HTML string for all existing comments (called once on card creation)
function buildCommentsHtml(comments) {
    if (!comments || comments.length === 0) return "";

    const allUsers = getUsers();
    return comments.map(comment => {
        const commenter = allUsers.find(u => u.id === comment.userId);
        return commentHtml(comment, commenter);
    }).join("");
}

// Build HTML string for a single comment
function commentHtml(comment, commenter) {
    const name   = commenter ? capitalize(commenter.username) : "User";
    const pfp    = commenter ? ROOT + commenter.profilePicture : "";
    const timeAgo = formatTimeAgo(comment.timestamp);

    return `
        <div class="comment">
            <img src="${pfp}" alt="${name}" class="avatar-img avatar-sm">
            <div class="comment-body">
                <span class="comment-name">${name}</span>
                <span class="comment-text">${comment.content}</span>
                <span class="comment-time">${timeAgo}</span>
            </div>
        </div>
    `;
}

// Build a DOM element for a newly submitted comment (so we can appendChild)
function buildCommentElement(comment, commenter) {
    const div = document.createElement("div");
    div.innerHTML = commentHtml(comment, commenter);
    return div.firstElementChild;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTimeAgo(timestamp) {
    const diff = Math.floor((Date.now() - new Date(timestamp)) / 1000);
    if (diff < 60)     return `${diff}s ago`;
    if (diff < 3600)   return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 172800) return "Yesterday";
    return `${Math.floor(diff / 86400)} days ago`;
}
