export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { BindingRepo } from "@/server/repos/BindingRepo";

export async function GET(_req, { params }) {
    const { projectId, nsId, serviceId } = await params || {};
    try {
        if (!projectId || !nsId || !serviceId) throw new Error("projectId, nsId and serviceId are required");
        const binding = await BindingRepo.get(projectId, nsId, serviceId);
        if (!binding) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(binding, { status: 200 });
    } catch (e) {
        return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
    }
}

export async function PUT(req, { params }) {
    const { projectId, nsId, serviceId } = await params || {};
    try {
        if (!projectId || !nsId || !serviceId) throw new Error("projectId, nsId and serviceId are required");
        const body = await req.json().catch(() => ({}));
        const patch = {
            keyPatterns: Array.from(new Set((body?.keyPatterns || []).map(String).map(s => s.trim()).filter(Boolean))),
            permissions: body?.permissions ?? "RW",
            rate: {
                readRps: Number(body?.rate?.readRps || 0),
                writeRps: Number(body?.rate?.writeRps || 0),
            },
            bandwidth: {
                readKBps: Number(body?.bandwidth?.readKBps || 0),
                writeKBps: Number(body?.bandwidth?.writeKBps || 0),
            },
        };

        console.log(`patch key patterns ${patch.keyPatterns}`);

        const binding = await BindingRepo.upsert(projectId, nsId, serviceId, patch);
        return NextResponse.json({ binding }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
    }
}

export async function DELETE(_req, { params }) {
    const { projectId, nsId, serviceId } = await params || {};
    try {
        if (!projectId || !nsId || !serviceId) throw new Error("projectId, nsId and serviceId are required");
        await BindingRepo.remove(projectId, nsId, serviceId);
        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
    }
}
