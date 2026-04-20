import { NextResponse } from "next/server";
import { getPostsByUser, getPostsLikedByUser } from "@/lib/repository";

// GET /api/users/:id/posts?tab=posts|likes
export async function GET(request, { params }) {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "posts";

    const posts = tab === "likes"
        ? await getPostsLikedByUser(params.id)
        : await getPostsByUser(params.id);

    return NextResponse.json({ posts });
}
