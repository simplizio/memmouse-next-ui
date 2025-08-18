export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { AclPresetRepo } from "@/server/repos/AclPresetRepo.js";


export async function GET(_req, { params }) {
    const { name } = await params;
    const rec = await AclPresetRepo.get(name);
    return rec ? NextResponse.json(rec) : NextResponse.json({ error: "not found" }, { status: 404 });
}

// PATCH {commands?, description?}
export async function PATCH(req, { params }) {
    const { name } = await params;
    const cur = await AclPresetRepo.get(name);
    if (!cur) return NextResponse.json({ error: "not found" }, { status: 404 });
    const body = await req.json().catch(()=> ({}));
    const rec = await AclPresetRepo.upsert({
        name,
        commands: Array.isArray(body.commands) ? body.commands : cur.commands,
        description: body.description != null ? String(body.description) : (cur.description || ""),
        builtin: !!cur.builtin, // не меняем
    });
    return NextResponse.json(rec);
}

export async function DELETE(_req, { params }) {
    const { name } = await params;
    const cur = await AclPresetRepo.get(name);
    if (!cur) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (cur.builtin) return NextResponse.json({ error: "cannot delete builtin preset" }, { status: 400 });
    await AclPresetRepo.remove(name);
    return NextResponse.json({ ok: true });
}
