export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { ServiceRepo } from "@/server/repos/ServiceRepo.js";
import { makeToken } from "@/server/repos/makeToken.js";

export async function POST(_req, { params }) {
    const { id, serviceId } = await params;
    const svc = await ServiceRepo.get(id, serviceId);
    if (!svc) return NextResponse.json({ error:"not found" }, { status:404 });

    const newTok = { id: "t" + (svc.tokens.length+1), value: makeToken(), createdAt: Date.now(), status:"active" };
    const tokens = [newTok, ...svc.tokens.slice(0,3)]; // keep few old for overlap
    const updated = await ServiceRepo.patch(id, serviceId, { tokens });
    return NextResponse.json({ token: newTok, service: updated });
}
