/**
 * Client-side API & session helpers.
 *
 * Phase 2 replaces localStorage-based data access with HTTP calls to the
 * Next.js API routes backed by Prisma and a real relational database.
 * Only the currently-logged-in user id is kept in localStorage to track
 * the browser session.
 */

const SESSION_KEY = "zento-currentUserId";

export function getCurrentUserId() {
    return localStorage.getItem(SESSION_KEY);
}
export function setCurrentUserId(id) {
    localStorage.setItem(SESSION_KEY, id);
}
export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

async function request(url, options = {}) {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
}

// ───── Auth ─────
export const api = {
    register: (payload) => request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
    login:    (payload) => request("/api/auth/login",    { method: "POST", body: JSON.stringify(payload) }),

    // ───── Users ─────
    getUser:        (id)         => request(`/api/users/${id}`),
    updateUser:     (id, data)   => request(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    getSuggestions: (currentUserId) => request(`/api/users?suggestFor=${currentUserId}`),

    follow:   (targetId, followerId) =>
        request(`/api/users/${targetId}/follow`, {
            method: "POST",
            body: JSON.stringify({ followerId }),
        }),
    unfollow: (targetId, followerId) =>
        request(`/api/users/${targetId}/follow`, {
            method: "DELETE",
            body: JSON.stringify({ followerId }),
        }),

    // ───── Posts ─────
    getFeed:         (userId)        => request(`/api/posts?userId=${userId}`),
    getUserPosts:    (userId, tab = "posts") => request(`/api/users/${userId}/posts?tab=${tab}`),
    getPost:         (id)            => request(`/api/posts/${id}`),
    createPost:      (data)          => request("/api/posts", { method: "POST", body: JSON.stringify(data) }),
    deletePost:      (id)            => request(`/api/posts/${id}`, { method: "DELETE" }),

    likePost:   (postId, userId) =>
        request(`/api/posts/${postId}/like`, { method: "POST",   body: JSON.stringify({ userId }) }),
    unlikePost: (postId, userId) =>
        request(`/api/posts/${postId}/like`, { method: "DELETE", body: JSON.stringify({ userId }) }),

    addComment: (postId, authorId, content) =>
        request(`/api/posts/${postId}/comments`, {
            method: "POST",
            body: JSON.stringify({ authorId, content }),
        }),
    deleteComment: (id) => request(`/api/comments/${id}`, { method: "DELETE" }),
};
