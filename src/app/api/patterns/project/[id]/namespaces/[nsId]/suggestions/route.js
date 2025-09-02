export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { suggestPatternsForNamespace } from "@/server/services/patterns";

export async function GET(_req, { params }) {
    const { id: projectId, nsId } = await params || {};
    try {
        const data = await suggestPatternsForNamespace(projectId, nsId, 120);
        return NextResponse.json(data, { status: 200 });
    } catch (e) {
        return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
    }
}
