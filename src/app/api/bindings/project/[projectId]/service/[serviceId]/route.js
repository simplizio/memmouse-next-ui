export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { BindingRepo } from "@/server/repos/BindingRepo";

export async function GET(_req, { params }) {
    const { projectId, serviceId } = params || {};
    try {
        if (!projectId || !serviceId) throw new Error("projectId and serviceId are required");
        const items = await BindingRepo.listByService(projectId, serviceId);
        const nsIds = Array.from(new Set(items.map(x => x.nsId)));
        return NextResponse.json({ items, nsIds }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
    }
}
