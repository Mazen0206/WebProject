import { NextResponse } from "next/server";
import { deleteComment } from "@/lib/repository";

export async function DELETE(_request, { params }) {
    const { id } = await params;
    await deleteComment(id);
    return NextResponse.json({ ok: true });
}
