import { NextResponse } from "next/server";
import { getPostById, deletePost } from "@/lib/repository";

export async function GET(_request, { params }) {
    const post = await getPostById(params.id);
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    return NextResponse.json({ post });
}

export async function DELETE(_request, { params }) {
    await deletePost(params.id).catch(() => null);
    return NextResponse.json({ ok: true });
}
