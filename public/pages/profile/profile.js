import { api, getCurrentUserId, validateSession } from "../../shared/api.js";
import { createPostCard, wirePostCard } from "../../shared/post/post.js";

const AVATAR_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23dde1ed'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%236b7190'/%3E%3Cellipse cx='50' cy='84' rx='28' ry='22' fill='%236b7190'/%3E%3C/svg%3E";

function avatarSrc(path) {
    if (!path) return AVATAR_PLACEHOLDER;
    if (path.startsWith("data:") || path.startsWith("http")) return path;
    return "/" + path;
}

/** Shown when `coverImage` is null (legacy accounts). New accounts get `/assets/images/icon.png` from registration. */
const COVER_FALLBACKS = [
    "assets/Posts/post-city.jpg",
    "assets/Posts/post-nature.jpg",
    "assets/Posts/post-street.jpg",
    "assets/Posts/post-appreciation.jpg",
    "assets/Posts/post-coffee.jpg",
    "assets/Posts/post-couch.jpg",
];

function resolveCoverImage(user) {
    if (user.coverImage) {
        let cover = user.coverImage;
        if (!cover.startsWith("data:") && !cover.startsWith("http") && !cover.startsWith("/")) {
            cover = "/" + cover;
        }
        return cover;
    }
    const userHash =
        Math.abs([...(user.id || "")].reduce((acc, c) => acc + c.charCodeAt(0), 0)) || 1;
    let cover = COVER_FALLBACKS[userHash % COVER_FALLBACKS.length];
    if (!cover.startsWith("data:") && !cover.startsWith("http") && !cover.startsWith("/")) {
        cover = "/" + cover;
    }
    return cover;
}

async function main() {
    const currentUserId = await validateSession();
    if (!currentUserId) {
        window.location.href = "/pages/auth/login.html";
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const viewedUserId = params.get("userId") || currentUserId;

    const [viewedRes, meRes] = await Promise.all([
        api.getUser(viewedUserId).catch(() => null),
        api.getUser(currentUserId),
    ]);

    if (!viewedRes || !meRes) {
        document.body.innerHTML = "<p>User not found.</p>";
        return;
    }

    const viewedUser   = viewedRes.user;
    const loggedInUser = meRes.user;
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
    wireUserSearch(currentUserId);

    renderPosts(viewedUserId, currentUserId);
    renderPhotoGrid(viewedUserId);
}

function renderProfile(viewedUser, loggedInUser, isOwnProfile) {
    document.getElementById("profile-cover").src = resolveCoverImage(viewedUser);
    document.getElementById("profile-avatar-img").src = avatarSrc(viewedUser.profilePicture);

    document.getElementById("profile-name").textContent = viewedUser.username;
    document.getElementById("profile-handle").textContent = "@" + viewedUser.username;
    document.getElementById("profile-bio").textContent = viewedUser.bio || "";

    document.getElementById("following-count").textContent = (viewedUser.following || []).length;
    document.getElementById("followers-count").textContent = (viewedUser.followers || []).length;

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
    actionBtn.addEventListener("click", async () => {
        if (isOwnProfile) {
            openEditModal(viewedUser);
            return;
        }

        const isFollowing = (loggedInUser.following || []).includes(viewedUser.id);

        if (isFollowing) {
            await api.unfollow(viewedUser.id, currentUserId);
        } else {
            await api.follow(viewedUser.id, currentUserId);
        }

        const [{ user: fresh }, { user: freshMe }] = await Promise.all([
            api.getUser(viewedUser.id),
            api.getUser(currentUserId),
        ]);
        renderProfile(fresh, freshMe, false);
        // Rebind with updated loggedInUser so subsequent clicks are correct
        loggedInUser.following = freshMe.following;
    });
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

    btn.addEventListener("click", async () => {
        const content = input.value.trim();
        if (!content) return;
        await api.createPost({ authorId: currentUserId, content, image: pendingImage || null });
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

async function renderPosts(viewedUserId, currentUserId, tab = "posts") {
    const container = document.getElementById("posts-container");
    const { posts } = await api.getUserPosts(viewedUserId, tab);

    container.innerHTML = "";
    if (!posts.length) {
        container.innerHTML = "<p class='no-posts'>No posts yet.</p>";
        return;
    }

    for (const post of posts) {
        const isOwner = post.authorId === currentUserId;
        const card = createPostCard(post, post.author, isOwner);
        wirePostCard(card, post, currentUserId, () => {
            const activeTab = document.getElementById("likes-tab-btn").classList.contains("active") ? "likes" : "posts";
            renderPosts(viewedUserId, currentUserId, activeTab);
        });
        container.appendChild(card);
    }
}

function openEditModal(viewedUser) {
    document.getElementById("edit-name").value = viewedUser.username;
    document.getElementById("edit-bio").value = viewedUser.bio || "";

    const preview = document.getElementById("edit-avatar-preview");
    if (preview) preview.src = avatarSrc(viewedUser.profilePicture);

    const fileInput = document.getElementById("edit-avatar-file");
    if (fileInput) fileInput.value = "";

    const coverPreview = document.getElementById("edit-cover-preview");
    if (coverPreview) coverPreview.src = resolveCoverImage(viewedUser);

    const coverInput = document.getElementById("edit-cover-file");
    if (coverInput) coverInput.value = "";

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

document.getElementById("edit-cover-file")?.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById("edit-cover-preview");
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

document.getElementById("edit-profile-form")?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const params = new URLSearchParams(window.location.search);
    const viewedUserId = params.get("userId") || getCurrentUserId();
    const currentUserId = getCurrentUserId();

    const updates = {
        username: document.getElementById("edit-name").value.trim(),
        bio:      document.getElementById("edit-bio").value.trim(),
    };

    const preview = document.getElementById("edit-avatar-preview");
    const fileInput = document.getElementById("edit-avatar-file");
    if (fileInput && fileInput.files.length > 0 && preview && preview.src.startsWith("data:")) {
        updates.profilePicture = preview.src;
    }

    const coverPreview = document.getElementById("edit-cover-preview");
    const coverInput = document.getElementById("edit-cover-file");
    if (coverInput && coverInput.files.length > 0 && coverPreview && coverPreview.src.startsWith("data:")) {
        updates.coverImage = coverPreview.src;
    }

    await api.updateUser(viewedUserId, updates);

    const [{ user: viewedUser }, { user: loggedInUser }] = await Promise.all([
        api.getUser(viewedUserId),
        api.getUser(currentUserId),
    ]);
    renderProfile(viewedUser, loggedInUser, true);

    const composeAvatar = document.getElementById("compose-avatar");
    if (composeAvatar) composeAvatar.src = avatarSrc(viewedUser.profilePicture);

    renderPosts(viewedUserId, currentUserId);
    document.getElementById("edit-modal").style.display = "none";
});

async function renderPhotoGrid(viewedUserId) {
    const grid = document.getElementById("photo-grid");
    const countEl = document.getElementById("photo-count");
    const emptyEl = document.getElementById("photo-grid-empty");
    if (!grid) return;

    const { posts } = await api.getUserPosts(viewedUserId, "posts");
    const postsWithImages = posts.filter(p => p.image);

    if (countEl) countEl.textContent = postsWithImages.length + " posts";

    grid.innerHTML = "";
    if (postsWithImages.length === 0) {
        if (emptyEl) emptyEl.style.display = "block";
        return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    postsWithImages.forEach(post => {
        const img = document.createElement("img");
        img.src = avatarSrc(post.image);
        img.alt = "Post photo";
        img.className = "photo-grid-item";
        grid.appendChild(img);
    });
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
                results.innerHTML = `<p class="user-search-empty">No results for "<strong>${q}</strong>"</p>`;
                results.style.display = "block";
                return;
            }

            users.forEach(user => {
                const row = document.createElement("div");
                row.className = "search-result-row";
                row.innerHTML = `
                    <img src="${avatarSrc(user.profilePicture)}" alt="${user.username}" class="avatar-img search-result-avatar">
                    <div class="search-result-info">
                        <span class="search-result-name">${user.username}</span>
                        <span class="search-result-handle">@${user.username}</span>
                    </div>
                    <button class="search-follow-btn" data-uid="${user.id}">Follow</button>
                `;

                row.querySelector(".search-result-avatar").addEventListener("click", () => {
                    window.location.href = `/pages/profile/profile.html?userId=${user.id}`;
                });
                row.querySelector(".search-result-info").addEventListener("click", () => {
                    window.location.href = `/pages/profile/profile.html?userId=${user.id}`;
                });

                const followBtn = row.querySelector(".search-follow-btn");
                followBtn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await api.follow(user.id, currentUserId);
                    followBtn.textContent = "Following";
                    followBtn.disabled = true;
                    followBtn.classList.add("search-follow-btn--done");
                });

                results.appendChild(row);
            });

            results.style.display = "block";
        }, 200);
    });

    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.style.display = "none";
        }
    });

    input.addEventListener("focus", () => {
        if (input.value.trim() && results.children.length) {
            results.style.display = "block";
        }
    });
}

main();
