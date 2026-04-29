import { NextResponse } from "next/server";
import { addComment, getCommentsForPost } from "@/lib/repository";

export async function GET(_request, { params }) {
    const { id } = await params;
    const comments = await getCommentsForPost(id);
    return NextResponse.json({ comments });
}

// POST /api/posts/:id/comments  { authorId, content }
export async function POST(request, { params }) {
    const { id } = await params;
    const { authorId, content } = (await request.json()) || {};
    if (!authorId || !content) {
        return NextResponse.json(
            { error: "authorId and content required." },
            { status: 400 },
        );
    }
    const comment = await addComment(id, authorId, content);
    return NextResponse.json({ comment }, { status: 201 });
}
