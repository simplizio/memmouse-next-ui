import { NextResponse } from "next/server";
import { ProjectRepo } from "@/server/repos/ProjectRepo.js";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
    const { id } = await params;
    const p = await ProjectRepo.get(id);
    return p ? NextResponse.json(p) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PATCH(req, { params }) {
    const { id } = await params;
    const data = await req.json();
    const p = await ProjectRepo.patch(id, data);
    return p ? NextResponse.json(p) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function DELETE(_req, { params }) {
    const { id } = await params;
    await ProjectRepo.remove(id);
    return NextResponse.json({ ok: true });
}