export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { BindingRepo } from "@/server/repos/BindingRepo.js";

export async function GET(_req, { params }) {
    const { id, nsId } = await params;
    const items = await BindingRepo.list(id, nsId);
    return NextResponse.json({ items });
}

export async function POST(req, { params }) {
    const { id, nsId } = await params;
    const body = await req.json(); // { serviceId, serviceName, permissions, patterns[] }
    const saved = await BindingRepo.upsert({
        ...body,
        projectId: id,
        nsId,
        updatedAt: Date.now(),
    });
    return NextResponse.json(saved, { status: 201 });
}
