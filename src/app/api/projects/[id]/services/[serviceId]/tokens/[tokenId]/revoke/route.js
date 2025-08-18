export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ServiceRepo } from "@/server/repos/ServiceRepo.js";

export async function POST(_req, { params }) {
    const { id: projectId, serviceId, tokenId } = await params;
    try {
        await ServiceRepo.revokeToken(projectId, serviceId, tokenId);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
    }
}
