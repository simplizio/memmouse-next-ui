export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ServiceRepo } from "@/server/repos/ServiceRepo.js";

export async function GET(_req, { params }) {
    const { id: projectId, serviceId } = await params;
    const svc = await ServiceRepo.get(projectId, serviceId);
    if (!svc) return NextResponse.json({ error: "service not found" }, { status: 404 });

    // safety: do not return token value in the list
    const items = (svc.tokens || []).map(t => {
        const { value, ...rest } = t || {};
        return rest;
    });
    return NextResponse.json({ items });
}

export async function POST(req, { params }) {
    const { id: projectId, serviceId } = await params;
    const body = await req.json().catch(() => ({}));

    try {
        const created = await ServiceRepo.addToken(projectId, serviceId, { meta: body.meta });
        // return token value in response for copy/save
        return NextResponse.json({ token: created }, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
    }
}
