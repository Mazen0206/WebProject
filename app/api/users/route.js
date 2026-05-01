import { NextResponse } from "next/server";
import { getAllUsers, getFollowSuggestions, searchUsers } from "@/lib/repository";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const suggestFor = searchParams.get("suggestFor");
    const q = searchParams.get("q");
    const currentUserId = searchParams.get("currentUserId") || "";

    if (q !== null) {
        const users = await searchUsers(q.trim(), currentUserId);
        return NextResponse.json({ users });
    }

    if (suggestFor) {
        const suggestions = await getFollowSuggestions(suggestFor);
        return NextResponse.json({ users: suggestions });
    }

    const users = await getAllUsers();
    return NextResponse.json({ users });
}
