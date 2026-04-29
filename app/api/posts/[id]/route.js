import { NextResponse } from "next/server";
import { getPostById, deletePost } from "@/lib/repository";

export async function GET(_request, { params }) {
    const { id } = await params;
    const post = await getPostById(id);
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    return NextResponse.json({ post });
}

export async function DELETE(_request, { params }) {
    const { id } = await params;
    await deletePost(id).catch(() => null);
    return NextResponse.json({ ok: true });
}
