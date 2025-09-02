export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PatternRepo } from "@/server/repos/PatternRepo.js";

export async function GET(_req, { params }) {
    const { id: projectId, nsId } = await params;
    const items = await PatternRepo.list(projectId, nsId);
    return NextResponse.json({ items });
}

export async function POST(req, { params }) {
    const { id: projectId, nsId } = await params;
    const body = await req.json().catch(() => ({}));

    // два режима: { set: [...] } (перезаписать) или { add: [...] } (добавить)
    if (Array.isArray(body.set)) {
        const items = await PatternRepo.set(projectId, nsId, body.set);
        return NextResponse.json({ items });
    }
    const items = await PatternRepo.add(projectId, nsId, body.add || []);
    return NextResponse.json({ items });
}

export async function DELETE(req, { params }) {
    const { id: projectId, nsId } = await params;
    const { searchParams } = new URL(req.url);
    const pattern = searchParams.get("pattern") || "*"; // "*" — очистить
    const items = await PatternRepo.remove(projectId, nsId, pattern);
    return NextResponse.json({ items });
}
