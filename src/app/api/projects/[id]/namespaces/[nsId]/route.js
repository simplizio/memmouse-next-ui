export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { NamespaceRepo } from "@/server/repos/NamespaceRepo.js";

export async function GET(_req, { params }) {
    const { id, nsId } = await params;
    const ns = await NamespaceRepo.get(id, nsId);
    return ns ? NextResponse.json(ns) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PATCH(req, { params }) {
    const { id, nsId } = await params;
    const data = await req.json();
    const ns = await NamespaceRepo.patch(id, nsId, data);
    return ns ? NextResponse.json(ns) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function DELETE(_req, { params }) {
    const { id, nsId } = await params;
    await NamespaceRepo.remove(id, nsId);
    return NextResponse.json({ ok: true });
}
