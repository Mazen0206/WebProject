const STORAGE_KEYS = {
    users: "zento-users",
    posts: "zento-posts",
    currentUserId: "zento-currentUserId",
};

export async function initStorage() {
    const noUsers = !localStorage.getItem(STORAGE_KEYS.users);
    const noPosts = !localStorage.getItem(STORAGE_KEYS.posts);

    if (noUsers || noPosts) {
        const response = await fetch("../../data/storage.json");
        const data = await response.json();
        if (noUsers) localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(data.users));
        if (noPosts) localStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(data.posts));
    }
}

export function getUsers() {
    const saved = localStorage.getItem(STORAGE_KEYS.users);
    return saved ? JSON.parse(saved) : [];
}

export function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

export function getPosts() {
    const saved = localStorage.getItem(STORAGE_KEYS.posts);
    return saved ? JSON.parse(saved) : [];
}

export function savePosts(posts) {
    localStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(posts));
}

export function getCurrentUserId() {
    return localStorage.getItem(STORAGE_KEYS.currentUserId);
}

export function setCurrentUserId(id) {
    localStorage.setItem(STORAGE_KEYS.currentUserId, id);
}

export function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.currentUserId);
}
