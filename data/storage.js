import { SEED_USERS, SEED_POSTS } from "./seed.js";

const STORAGE_KEYS = {
    users: "zento-users",
    posts: "zento-posts",
    currentUserId: "zento-currentUserId",
    seedVersion: "zento-seed-version",
};

// Bump this string whenever seed data changes to force a fresh re-seed
const SEED_VERSION = "v2-seed";

export function initStorage() {
    const storedVersion = localStorage.getItem(STORAGE_KEYS.seedVersion);
    if (storedVersion !== SEED_VERSION) {
        // Wipe stale data and re-seed from scratch
        const currentUserId = localStorage.getItem(STORAGE_KEYS.currentUserId);
        localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(SEED_USERS));
        localStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(SEED_POSTS));
        localStorage.setItem(STORAGE_KEYS.seedVersion, SEED_VERSION);
        // Keep the logged-in session if there was one
        if (currentUserId) {
            localStorage.setItem(STORAGE_KEYS.currentUserId, currentUserId);
        }
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
