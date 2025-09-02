import {normalizePerms} from "@/lib/permUtils";

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { BindingRepo } from "@/server/repos/BindingRepo.js";

function normalize(p) {
    if (!p) return "";
    let s = String(p).trim();
    s = s.replace(/\s+/g, "");
    s = s.replace(/\*{2,}/g, "*").replace(/:\*{2,}/g, ":*").replace(/\*+$/g, "*");
    return s;
}

export async function PUT(req, { params }) {
    const { id, nsId, serviceId } = await params; // projectId
    try {
        const body = await req.json().catch(() => ({}));
        console.log(JSON.stringify(body));
        const binding = await BindingRepo.upsert(id, nsId, serviceId, {
            keyPatterns: Array.isArray(body?.keyPatterns) ? body.keyPatterns : [],
            permissions: body?.permissions, // "R" | "RW" | "W" | {read,write}
            rate: body?.rate,
            bandwidth: body?.bandwidth,
        });
        console.log(`put binding: \n ${JSON.stringify(binding)}`);
        return NextResponse.json({ binding }, { status: 200 });
    } catch (e) {
        console.log(`error while upserting binding for ${serviceId} to ${nsId} \n ${JSON.stringify(e)}`);
        return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
    }
}

// export async function PUT(req, { params }) {
//     const { id: projectId, nsId, serviceId } = await params;
//
//     const body = await req.json().catch(() => ({}));
//     const keyPatterns = Array.from(new Set((body.keyPatterns || []).map(normalize).filter(Boolean)));
//     const permissions = normalizePerms(body.permissions); // body.permissions ?? { read: true, write: true };
//     const rate = body.rate && typeof body.rate === "object"
//         ? { readRps: Number(body.rate.readRps || 0), writeRps: Number(body.rate.writeRps || 0) }
//         : undefined;
//
//     const cur = await BindingRepo.get(projectId, nsId, serviceId).catch(() => null);
//     const next = await BindingRepo.upsert(projectId, nsId, serviceId, {
//         ...(cur || {}),
//         projectId, nsId, serviceId,
//         keyPatterns,
//         permissions,
//         ...(rate ? { rate } : {}),
//         createdAt: cur?.createdAt || Date.now(),
//         updatedAt: Date.now(),
//     });
//
//     return NextResponse.json({ binding: next });
// }


export async function GET(_req, { params }) {
    const { id, nsId, serviceId } = await params;
    const b = await BindingRepo.get(id, nsId, serviceId);
    return b ? NextResponse.json(b) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PATCH(req, { params }) {
    const { id, nsId, serviceId } = await params;
    const data = await req.json();
    const cur = await BindingRepo.get(id, nsId, serviceId);
    if (!cur) return NextResponse.json({ error: "not found" }, { status: 404 });
    const next = await BindingRepo.upsert({ ...cur, ...data, updatedAt: Date.now() });
    return NextResponse.json(next);
}

export async function DELETE(_req, { params }) {
    const { id, nsId, serviceId } = await params;
    await BindingRepo.remove(id, nsId, serviceId).catch(() => {});
    return NextResponse.json({ ok: true });
}
