import { NextResponse } from "next/server";
import { getUserById, updateUser } from "@/lib/repository";

export async function GET(_request, { params }) {
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const { password: _pw, ...safe } = user;
    return NextResponse.json({
        user: {
            ...safe,
            following: user.following.map(f => f.followingId),
            followers: user.followers.map(f => f.followerId),
        },
    });
}

export async function PATCH(request, { params }) {
    const { id } = await params;
    const body = (await request.json()) || {};
    const updated = await updateUser(id, {
        username:       body.username,
        bio:            body.bio,
        profilePicture: body.profilePicture,
        coverImage:     body.coverImage,
    });
    const { password: _pw, ...safe } = updated;
    return NextResponse.json({ user: safe });
}
