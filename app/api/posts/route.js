import { NextResponse } from "next/server";
import { getFeedForUser, createPost } from "@/lib/repository";

// GET /api/posts?userId=xxx   → feed for that user
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
        return NextResponse.json({ error: "userId required." }, { status: 400 });
    }
    const posts = await getFeedForUser(userId);
    return NextResponse.json({ posts });
}

// POST /api/posts   { authorId, content, image }
export async function POST(request) {
    const { authorId, content, image } = (await request.json()) || {};
    if (!authorId || !content) {
        return NextResponse.json(
            { error: "authorId and content required." },
            { status: 400 },
        );
    }
    const post = await createPost(authorId, content, image);
    return NextResponse.json({ post }, { status: 201 });
}
