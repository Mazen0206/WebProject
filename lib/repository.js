/**
 * Data Repository — single source of truth for database access.
 *
 * Every function here pushes filtering / sorting / aggregation down to the
 * database through Prisma Client queries.  Application code NEVER performs
 * in-memory filtering of result sets coming from these helpers.
 */

import { prisma } from "./prisma.js";

// ───────────────────────────── Users ─────────────────────────────

export function getAllUsers() {
    return prisma.user.findMany({
        orderBy: { username: "asc" },
        include: {
            _count: { select: { followers: true, following: true, posts: true } },
        },
    });
}

export function getUserById(id) {
    return prisma.user.findUnique({
        where: { id },
        include: {
            followers: { select: { followerId: true } },
            following: { select: { followingId: true } },
        },
    });
}

export function getUserByEmailAndPassword(email, password) {
    return prisma.user.findFirst({
        where: { email, password },
    });
}

export function findUserByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
}

export function createUser(data) {
    return prisma.user.create({
        data: {
            username:       data.username,
            email:          data.email,
            password:       data.password,
            profilePicture: data.profilePicture || null,
            bio:            data.bio || null,
        },
    });
}

export function updateUser(id, data) {
    return prisma.user.update({
        where: { id },
        data:  {
            username:       data.username,
            bio:            data.bio,
            profilePicture: data.profilePicture,
            coverImage:     data.coverImage,
        },
    });
}

// Search users by username (SQLite LIKE is case-insensitive for ASCII by default)
export function searchUsers(query, currentUserId) {
    return prisma.user.findMany({
        where: {
            AND: [
                { id: { not: currentUserId || "" } },
                { username: { contains: query } },
            ],
        },
        orderBy: { username: "asc" },
        take: 10,
    });
}

// Suggestions: up to 5 users the current user is NOT already following (nor themselves)
export function getFollowSuggestions(currentUserId) {
    return prisma.user.findMany({
        where: {
            AND: [
                { id: { not: currentUserId } },
                { followers: { none: { followerId: currentUserId } } },
            ],
        },
        orderBy: { username: "asc" },
        take: 5,
    });
}

// ───────────────────────────── Follows ─────────────────────────────

export async function isFollowing(followerId, followingId) {
    const match = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId, followingId } },
    });
    return Boolean(match);
}

export function followUser(followerId, followingId) {
    if (followerId === followingId) return null;
    return prisma.follow.upsert({
        where:  { followerId_followingId: { followerId, followingId } },
        update: {},
        create: { followerId, followingId },
    });
}

export function unfollowUser(followerId, followingId) {
    return prisma.follow
        .delete({
            where: { followerId_followingId: { followerId, followingId } },
        })
        .catch(() => null); // ignore "record not found"
}

// ───────────────────────────── Posts ─────────────────────────────

const POST_INCLUDE = {
    author:  { select: { id: true, username: true, profilePicture: true } },
    likes:   { select: { userId: true } },
    comments: {
        orderBy: { timestamp: "asc" },
        include: {
            author: { select: { id: true, username: true, profilePicture: true } },
        },
    },
};

// Feed: posts by the user OR by anyone they follow, newest first.
export function getFeedForUser(currentUserId) {
    return prisma.post.findMany({
        where: {
            OR: [
                { authorId: currentUserId },
                { author: { followers: { some: { followerId: currentUserId } } } },
            ],
        },
        orderBy: { timestamp: "desc" },
        include: POST_INCLUDE,
    });
}

export function getPostsByUser(userId) {
    return prisma.post.findMany({
        where:   { authorId: userId },
        orderBy: { timestamp: "desc" },
        include: POST_INCLUDE,
    });
}

// Posts that a given user has liked (used by the "Likes" tab on profile)
export function getPostsLikedByUser(userId) {
    return prisma.post.findMany({
        where:   { likes: { some: { userId } } },
        orderBy: { timestamp: "desc" },
        include: POST_INCLUDE,
    });
}

export function getPostById(id) {
    return prisma.post.findUnique({
        where:   { id },
        include: POST_INCLUDE,
    });
}

export function createPost(authorId, content, image) {
    return prisma.post.create({
        data: {
            authorId,
            content,
            image: image || null,
        },
        include: POST_INCLUDE,
    });
}

export function deletePost(id) {
    return prisma.post.delete({ where: { id } });
}

// ───────────────────────────── Likes ─────────────────────────────

export function likePost(userId, postId) {
    return prisma.like.upsert({
        where:  { userId_postId: { userId, postId } },
        update: {},
        create: { userId, postId },
    });
}

export function unlikePost(userId, postId) {
    return prisma.like
        .delete({ where: { userId_postId: { userId, postId } } })
        .catch(() => null);
}

// ───────────────────────────── Comments ─────────────────────────────

export function addComment(postId, authorId, content) {
    return prisma.comment.create({
        data: { postId, authorId, content },
        include: {
            author: { select: { id: true, username: true, profilePicture: true } },
        },
    });
}

export function deleteComment(id) {
    return prisma.comment.delete({ where: { id } }).catch(() => null);
}

export function getCommentsForPost(postId) {
    return prisma.comment.findMany({
        where:   { postId },
        orderBy: { timestamp: "asc" },
        include: {
            author: { select: { id: true, username: true, profilePicture: true } },
        },
    });
}
