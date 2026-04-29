import { NextResponse } from "next/server";
import { followUser, unfollowUser } from "@/lib/repository";

// POST /api/users/:id/follow  { followerId }
export async function POST(request, { params }) {
    const { id } = await params;
    const { followerId } = (await request.json()) || {};
    if (!followerId) {
        return NextResponse.json({ error: "followerId required." }, { status: 400 });
    }
    
    // The current user follows the target user
    await followUser(followerId, id);

    // 50% chance the target user follows the current user back
    let followedBack = false;
    if (Math.random() < 0.5) {
        await followUser(id, followerId);
        followedBack = true;
    }

    return NextResponse.json({ ok: true, followedBack });
}

// DELETE /api/users/:id/follow  { followerId }
export async function DELETE(request, { params }) {
    const { id } = await params;
    const { followerId } = (await request.json()) || {};
    if (!followerId) {
        return NextResponse.json({ error: "followerId required." }, { status: 400 });
    }
    await unfollowUser(followerId, id);
    return NextResponse.json({ ok: true });
}
