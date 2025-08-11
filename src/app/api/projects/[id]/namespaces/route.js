export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { NamespaceRepo } from "@/server/repos/NamespaceRepo.js";
import { ensureSeeded } from "@/server/services/bootstrap.js";

export async function GET(_req, { params }) {
    const { id } = await params;
    if (process.env.NODE_ENV !== "production" || process.env.DEV_AUTOSEED === "1") {
        try { await ensureSeeded(); } catch {}
    }
    const items = await NamespaceRepo.list(id);
    return NextResponse.json({ items });
}

export async function POST(req, { params }) {
    const { id } = await params; // projectId
    const body = await req.json();
    const ns = { ...body, projectId: id, updatedAt: Date.now() };
    // expecting { id, prefix, quotaBytes, ttl, eviction, status, ... }
    await NamespaceRepo.create(ns);
    return NextResponse.json(ns, { status: 201 });
}
