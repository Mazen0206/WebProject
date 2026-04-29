/**
 * Seed script — loads users, posts, comments, likes and follow relationships
 * from the JSON files in `prisma/data/` into the relational database.
 *
 * Run with:
 *     npm run db:seed      (populates)
 *     npm run db:reset     (drops, recreates and re-seeds from scratch)
 */

const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const fs = require("node:fs");
const path = require("node:path");

function getSqliteUrl() {
    const rawUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
    return rawUrl.startsWith("file:") ? rawUrl.slice(5) : rawUrl;
}

const adapter = new PrismaBetterSqlite3({ url: getSqliteUrl() });
const prisma = new PrismaClient({ adapter });

function loadJson(fileName) {
    const fullPath = path.join(__dirname, "data", fileName);
    return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}

async function main() {
    console.log("Seeding database — wiping existing data ...");

    // Delete order matters because of foreign-key constraints
    await prisma.like.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();

    const users = loadJson("users.json");
    const posts = loadJson("posts.json");

    // 1) Users
    console.log(`Inserting ${users.length} users ...`);
    for (const u of users) {
        await prisma.user.create({
            data: {
                id:             u.id,
                username:       u.username,
                email:          u.email,
                password:       u.password,
                profilePicture: u.profilePicture || null,
                bio:            u.bio || null,
            },
        });
    }

    // 2) Follows (many-to-many via the Follow join table)
    console.log("Inserting follow relationships ...");
    const followPairs = new Set();
    for (const u of users) {
        for (const targetId of u.following || []) {
            followPairs.add(`${u.id}|${targetId}`);
        }
        // Ensure reciprocal side from followers arrays too
        for (const sourceId of u.followers || []) {
            followPairs.add(`${sourceId}|${u.id}`);
        }
    }
    const followRows = [...followPairs]
        .map(pair => {
            const [followerId, followingId] = pair.split("|");
            return { followerId, followingId };
        })
        .filter(r => r.followerId !== r.followingId);

    if (followRows.length > 0) {
        await prisma.follow.createMany({ data: followRows });
    }

    // 3) Posts + nested comments + likes
    console.log(`Inserting ${posts.length} posts with comments and likes ...`);
    for (const p of posts) {
        await prisma.post.create({
            data: {
                id:        p.id,
                content:   p.content,
                image:     p.image || null,
                timestamp: new Date(p.timestamp),
                authorId:  p.userId,
            },
        });

        const likes = (p.likes || []).map(uid => ({
            userId: uid,
            postId: p.id,
        }));
        if (likes.length) {
            await prisma.like.createMany({ data: likes });
        }

        for (const c of (p.comments || [])) {
            await prisma.comment.create({
                data: {
                    id:        c.id,
                    content:   c.content,
                    timestamp: new Date(c.timestamp),
                    postId:    p.id,
                    authorId:  c.userId,
                },
            });
        }
    }

    const [uc, pc, cc, lc, fc] = await Promise.all([
        prisma.user.count(),
        prisma.post.count(),
        prisma.comment.count(),
        prisma.like.count(),
        prisma.follow.count(),
    ]);
    console.log("Seed complete:");
    console.log(`  users:    ${uc}`);
    console.log(`  posts:    ${pc}`);
    console.log(`  comments: ${cc}`);
    console.log(`  likes:    ${lc}`);
    console.log(`  follows:  ${fc}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
