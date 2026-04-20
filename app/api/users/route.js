import { NextResponse } from "next/server";
import { getAllUsers, getFollowSuggestions } from "@/lib/repository";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const suggestFor = searchParams.get("suggestFor");

    if (suggestFor) {
        const suggestions = await getFollowSuggestions(suggestFor);
        return NextResponse.json({ users: suggestions });
    }

    const users = await getAllUsers();
    return NextResponse.json({ users });
}
