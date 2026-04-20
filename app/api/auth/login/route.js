import { NextResponse } from "next/server";
import { getUserByEmailAndPassword } from "@/lib/repository";

export async function POST(request) {
    const { email, password } = (await request.json()) || {};

    if (!email || !password) {
        return NextResponse.json(
            { error: "Email and password are required." },
            { status: 400 },
        );
    }

    const user = await getUserByEmailAndPassword(email, password);
    if (!user) {
        return NextResponse.json(
            { error: "Invalid email or password." },
            { status: 401 },
        );
    }

    const { password: _pw, ...safe } = user;
    return NextResponse.json({ user: safe });
}
