export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { BindingRepo } from "@/server/repos/BindingRepo.js";

export async function GET(_req, { params }) {
    const { id, serviceId } = await params;
    try {
        const items = await BindingRepo.listByService(id, serviceId);
        // можно отдать сокращённо, если тебе нужно только nsIds:
        const nsIds = Array.from(new Set(items.map(x => x.nsId)));
        return NextResponse.json({ items, nsIds }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
    }
}