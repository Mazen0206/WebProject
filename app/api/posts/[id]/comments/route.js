import { NextResponse } from "next/server";
import { addComment, getCommentsForPost } from "@/lib/repository";

export async function GET(_request, { params }) {
    const comments = await getCommentsForPost(params.id);
    return NextResponse.json({ comments });
}

// POST /api/posts/:id/comments  { authorId, content }
export async function POST(request, { params }) {
    const { authorId, content } = (await request.json()) || {};
    if (!authorId || !content) {
        return NextResponse.json(
            { error: "authorId and content required." },
            { status: 400 },
        );
    }
    const comment = await addComment(params.id, authorId, content);
    return NextResponse.json({ comment }, { status: 201 });
}
