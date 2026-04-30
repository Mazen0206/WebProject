import { NextResponse } from "next/server";
import { createUser, findUserByEmail } from "@/lib/repository";

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { email, password, username } = body || {};

    if (!email || !password) {
        return NextResponse.json(
            { error: "Email and password are required." },
            { status: 400 },
        );
    }

    try {
        const existing = await findUserByEmail(email);
        if (existing) {
            return NextResponse.json(
                { error: "An account with this email already exists." },
                { status: 409 },
            );
        }

        const user = await createUser({
            email,
            password,
            username: username || email.split("@")[0],
        });

        const { password: _pw, ...safe } = user;
        return NextResponse.json({ user: safe }, { status: 201 });
    } catch (err) {
        console.error("Register error:", err);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 },
        );
    }
}
