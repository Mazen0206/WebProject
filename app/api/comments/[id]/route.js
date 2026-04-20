import { NextResponse } from "next/server";
import { deleteComment } from "@/lib/repository";

export async function DELETE(_request, { params }) {
    await deleteComment(params.id);
    return NextResponse.json({ ok: true });
}
