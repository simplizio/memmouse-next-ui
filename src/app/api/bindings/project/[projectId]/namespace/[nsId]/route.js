export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { BindingRepo } from "@/server/repos/BindingRepo";

function normalizeBindingInput(x) {
    if (!x) return null;
    return {
        serviceId: x.serviceId,
        nsId: x.nsId, // можно игнорировать и брать из params, но не мешает
        keyPatterns: Array.from(new Set((x.keyPatterns || []).map(String).map(s => s.trim()).filter(Boolean))),
        permissions: x.permissions ?? "RW",
        rate: {
            readRps: Number(x?.rate?.readRps || 0),
            writeRps: Number(x?.rate?.writeRps || 0),
        },
        bandwidth: {
            readKBps: Number(x?.bandwidth?.readKBps || 0),
            writeKBps: Number(x?.bandwidth?.writeKBps || 0),
        },
    };
}

export async function GET(_req, { params }) {
    const { projectId, nsId } = await params || {};
    try {
        if (!projectId || !nsId) throw new Error("projectId and nsId are required");
        const items = await BindingRepo.listByNamespace(projectId, nsId);
        const serviceIds = Array.from(new Set(items.map(x => x.serviceId)));
        return NextResponse.json({ items, serviceIds }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
    }
}

export async function POST(req, { params }) {
    const { projectId, nsId } = await params || {};
    try {
        if (!projectId || !nsId) throw new Error("projectId and nsId are required");
        const j = await req.json().catch(() => ({}));

        // гибкий POST: либо один объект, либо массив
        const payload = Array.isArray(j) ? j : (Array.isArray(j?.bindings) ? j.bindings : [j]);
        const inputs = payload.map(normalizeBindingInput).filter(Boolean);
        if (!inputs.length) throw new Error("Nothing to upsert");

        const saved = [];
        for (const x of inputs) {
            if (!x.serviceId) throw new Error("serviceId is required for each binding");
            const rec = await BindingRepo.upsert(projectId, nsId, x.serviceId, x);
            saved.push(rec);
        }
        const serviceIds = Array.from(new Set(saved.map(x => x.serviceId)));
        return NextResponse.json({ items: saved, serviceIds }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
    }
}
