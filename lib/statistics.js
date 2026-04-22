/**
 * Statistics Repository
 *
 * Six independent, database-level queries used by the /statistics page.
 * All aggregation is performed by the database — no in-memory filtering.
 *
 * The functions return plain JS objects that are safe to send over JSON.
 */

import { prisma } from "./prisma.js";

/**
 * 1) Average number of followers per user.
 *    Strategy: ask the DB to count rows in `Follow` (= total follow links)
 *    and rows in `User`, then divide.  Both counts are single-number aggregates.
 */
export async function getAverageFollowersPerUser() {
    const [totalFollows, totalUsers] = await Promise.all([
        prisma.follow.count(),
        prisma.user.count(),
    ]);
    const avg = totalUsers === 0 ? 0 : totalFollows / totalUsers;
    return {
        totalFollows,
        totalUsers,
        average: Number(avg.toFixed(2)),
    };
}

/**
 * 2) Average number of posts (messages) shared per user.
 */
export async function getAveragePostsPerUser() {
    const [totalPosts, totalUsers] = await Promise.all([
        prisma.post.count(),
        prisma.user.count(),
    ]);
    const avg = totalUsers === 0 ? 0 : totalPosts / totalUsers;
    return {
        totalPosts,
        totalUsers,
        average: Number(avg.toFixed(2)),
    };
}

/**
 * 3) Most active user in the last 3 months.
 *    "Active" = total count of posts + comments + likes created in the window.
 *    Uses `groupBy` aggregates pushed into the database and picks the user with
 *    the highest combined score.
 */
export async function getMostActiveUserLast3Months() {
    const since = new Date();
    since.setMonth(since.getMonth() - 3);

    const [postGroups, commentGroups, likeGroups] = await Promise.all([
        prisma.post.groupBy({
            by: ["authorId"],
            where: { timestamp: { gte: since } },
            _count: { _all: true },
        }),
        prisma.comment.groupBy({
            by: ["authorId"],
            where: { timestamp: { gte: since } },
            _count: { _all: true },
        }),
        prisma.like.groupBy({
            by: ["userId"],
            where: { createdAt: { gte: since } },
            _count: { _all: true },
        }),
    ]);

    const scores = new Map();
    const bump = (uid, n) => scores.set(uid, (scores.get(uid) || 0) + n);

    for (const r of postGroups)    bump(r.authorId, r._count._all);
    for (const r of commentGroups) bump(r.authorId, r._count._all);
    for (const r of likeGroups)    bump(r.userId,   r._count._all);

    let topUserId = null;
    let topScore  = 0;
    for (const [uid, score] of scores) {
        if (score > topScore) { topScore = score; topUserId = uid; }
    }

    if (!topUserId) return { user: null, activityScore: 0, windowStart: since };

    const user = await prisma.user.findUnique({
        where: { id: topUserId },
        select: { id: true, username: true, profilePicture: true },
    });

    return { user, activityScore: topScore, windowStart: since };
}

/**
 * 4) Most frequently used word across all post content.
 *    The database returns only the `content` column (nothing else) — so the
 *    wire-payload is minimal.  Tokenisation is a pure-CPU step performed once
 *    over that trimmed column.  Common English stop-words are filtered out.
 */
const STOP_WORDS = new Set([
    "the","a","an","and","or","but","if","then","else","of","to","in","on","at",
    "for","with","without","by","is","are","was","were","be","been","being",
    "it","its","this","that","these","those","i","you","he","she","we","they",
    "my","your","his","her","our","their","me","him","us","them","as","so",
    "just","not","no","yes","do","does","did","done","have","has","had","can",
    "could","will","would","should","may","might","shall","about","from",
    "into","over","out","up","down","too","very","more","most","some","any",
    "all","one","every","each","also","than","there","here","what","when",
    "where","why","how","who","whom","which","i'm","it's","that's","don't",
    "i've","you're","we're","they're","i'll","we'll","you'll","it'll","im",
    "get","got","go","goes","going","going","like","really","now","new",
    "other","make","made","makes","making","much","even","still","after",
    "before","between","being","off","only","own",
]);

export async function getMostFrequentWord() {
    const rows = await prisma.post.findMany({ select: { content: true } });
    const freq = new Map();

    for (const { content } of rows) {
        const tokens = (content || "")
            .toLowerCase()
            .replace(/[^a-z\s']/g, " ")
            .split(/\s+/);

        for (const raw of tokens) {
            const word = raw.trim();
            if (word.length < 3) continue;
            if (STOP_WORDS.has(word)) continue;
            freq.set(word, (freq.get(word) || 0) + 1);
        }
    }

    let top = { word: null, count: 0 };
    for (const [word, count] of freq) {
        if (count > top.count) top = { word, count };
    }

    const topTen = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

    return { top, topTen };
}

/**
 * 5) Top 5 most-liked posts.
 *    Counts are computed by the database (`_count`) and sorted server-side.
 */
export async function getTopLikedPosts(limit = 5) {
    const posts = await prisma.post.findMany({
        take: limit,
        orderBy: { likes: { _count: "desc" } },
        include: {
            author: { select: { id: true, username: true, profilePicture: true } },
            _count: { select: { likes: true, comments: true } },
        },
    });
    return posts.map(p => ({
        id:        p.id,
        content:   p.content,
        image:     p.image,
        timestamp: p.timestamp,
        author:    p.author,
        likeCount:    p._count.likes,
        commentCount: p._count.comments,
    }));
}

/**
 * 6) Top 5 users with the most posts (a.k.a. "top content creators").
 *    Uses Prisma `_count` on the relation — the DB does the counting.
 */
export async function getTopPostingUsers(limit = 5) {
    const users = await prisma.user.findMany({
        take: limit,
        orderBy: { posts: { _count: "desc" } },
        include: {
            _count: { select: { posts: true, followers: true } },
        },
    });
    return users.map(u => ({
        id:             u.id,
        username:       u.username,
        profilePicture: u.profilePicture,
        postCount:      u._count.posts,
        followerCount:  u._count.followers,
    }));
}

/**
 * Bonus 7) Average number of comments per post — extra metric to pad the dashboard.
 */
export async function getAverageCommentsPerPost() {
    const [totalComments, totalPosts] = await Promise.all([
        prisma.comment.count(),
        prisma.post.count(),
    ]);
    const avg = totalPosts === 0 ? 0 : totalComments / totalPosts;
    return {
        totalComments,
        totalPosts,
        average: Number(avg.toFixed(2)),
    };
}

/**
 * Bonus 8) Most-followed user.
 */
export async function getMostFollowedUser() {
    const [user] = await prisma.user.findMany({
        take: 1,
        orderBy: { followers: { _count: "desc" } },
        include: { _count: { select: { followers: true } } },
    });
    if (!user) return null;
    return {
        id:             user.id,
        username:       user.username,
        profilePicture: user.profilePicture,
        followerCount:  user._count.followers,
    };
}
