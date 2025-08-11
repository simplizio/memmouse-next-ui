export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { BindingRepo } from "@/server/repos/BindingRepo.js";

export async function GET(_req, { params }) {
    const { id, nsId, serviceId } = await params;
    const b = await BindingRepo.get(id, nsId, serviceId);
    return b ? NextResponse.json(b) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PATCH(req, { params }) {
    const { id, nsId, serviceId } = await params;
    const data = await req.json();
    const cur = await BindingRepo.get(id, nsId, serviceId);
    if (!cur) return NextResponse.json({ error: "not found" }, { status: 404 });
    const next = await BindingRepo.upsert({ ...cur, ...data, updatedAt: Date.now() });
    return NextResponse.json(next);
}

export async function DELETE(_req, { params }) {
    const { id, nsId, serviceId } = await params;
    await BindingRepo.remove(id, nsId, serviceId);
    return NextResponse.json({ ok: true });
}
