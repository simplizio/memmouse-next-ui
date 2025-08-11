import { NextResponse } from "next/server";
import { ProjectRepo } from "@/server/repos/ProjectRepo.js";
import { ProjectService } from "@/server/services/ProjectService.js";
import { ensureSeeded } from "@/server/services/bootstrap.js";

export const runtime = "nodejs";

export async function GET() {
    // autoseed on dev only or when DEV_AUTOSEED=1
    if (process.env.NODE_ENV !== "production" || process.env.DEV_AUTOSEED === "1") {
        try { await ensureSeeded(); } catch {}
    }
    const items = await ProjectRepo.list();
    return NextResponse.json({ items });
}

export async function POST(req) {
    const body = await req.json();
    const created = await ProjectService.create(body);
    return NextResponse.json(created, { status: 201 });
}
