export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PatternRepo } from "@/server/repos/PatternRepo.js";

export async function POST(_req, { params }) {
    const { id: projectId } = await params;
    const touched = await PatternRepo.cleanupToCanonical(projectId);
    return NextResponse.json({ ok: true, projectId, namespaces: touched });
}
