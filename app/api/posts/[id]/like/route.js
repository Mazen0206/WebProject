import { NextResponse } from "next/server";
import { likePost, unlikePost } from "@/lib/repository";

// POST /api/posts/:id/like   { userId }
export async function POST(request, { params }) {
    const { userId } = (await request.json()) || {};
    if (!userId) return NextResponse.json({ error: "userId required." }, { status: 400 });
    await likePost(userId, params.id);
    return NextResponse.json({ ok: true });
}

// DELETE /api/posts/:id/like   { userId }
export async function DELETE(request, { params }) {
    const { userId } = (await request.json()) || {};
    if (!userId) return NextResponse.json({ error: "userId required." }, { status: 400 });
    await unlikePost(userId, params.id);
    return NextResponse.json({ ok: true });
}
