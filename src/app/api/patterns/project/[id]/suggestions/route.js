export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { suggestPatternsForProject } from "@/server/services/patterns.js";

export async function GET(_req, { params }) {
    const { id: projectId } = await params;
    const data = await suggestPatternsForProject(projectId, 120);
    return NextResponse.json(data);
}
