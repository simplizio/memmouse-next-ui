import { NextResponse } from "next/server";
import { ProjectRepo } from "@/server/repos/ProjectRepo.js";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
    const p = await ProjectRepo.get(params.id);
    return p ? NextResponse.json(p) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PATCH(req, { params }) {
    const data = await req.json();
    const p = await ProjectRepo.patch(params.id, data);
    return p ? NextResponse.json(p) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function DELETE(_req, { params }) {
    await ProjectRepo.remove(params.id);
    return NextResponse.json({ ok: true });
}