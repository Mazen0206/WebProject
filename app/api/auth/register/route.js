import { NextResponse } from "next/server";
import { createUser, findUserByEmail } from "@/lib/repository";

export async function POST(request) {
    const body = await request.json();
    const { email, password, username } = body || {};

    if (!email || !password) {
        return NextResponse.json(
            { error: "Email and password are required." },
            { status: 400 },
        );
    }

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
}
