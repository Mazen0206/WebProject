import { NextResponse } from "next/server";
import { getUserByEmailAndPassword } from "@/lib/repository";

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { email, password } = body || {};

    if (!email || !password) {
        return NextResponse.json(
            { error: "Email and password are required." },
            { status: 400 },
        );
    }

    try {
        const user = await getUserByEmailAndPassword(email, password);
        if (!user) {
            return NextResponse.json(
                { error: "Invalid email or password." },
                { status: 401 },
            );
        }

        const { password: _pw, ...safe } = user;
        return NextResponse.json({ user: safe });
    } catch (err) {
        console.error("Login error:", err);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 },
        );
    }
}
