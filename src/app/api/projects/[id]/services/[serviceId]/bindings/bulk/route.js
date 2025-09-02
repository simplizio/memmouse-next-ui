export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { BindingRepo } from "@/server/repos/BindingRepo.js";

function normalizePattern(p) {
    if (!p) return "";
    let s = String(p).trim();
    s = s.replace(/\s+/g, "");
    s = s.replace(/\*{2,}/g, "*").replace(/:\*{2,}/g, ":*").replace(/\*+$/g, "*");
    return s;
}

export async function POST(req, { params }) {
    const { id: projectId, serviceId } = await params;
    const body = await req.json().catch(() => ({}));
    const requested = Array.isArray(body.bindings) ? body.bindings : [];

    // уже существующие NS для сервиса
    const existedNsIds = new Set(await BindingRepo.listByService(projectId, serviceId).catch(() => []));

    const created = [];
    const skipped = [];

    for (const item of requested) {
        const nsId = item?.nsId;
        if (!nsId) { skipped.push({ nsId, reason: "no_nsId" }); continue; }
        if (existedNsIds.has(nsId)) { skipped.push({ nsId, reason: "already_bound" }); continue; }

        const keyPatterns = Array.from(new Set((item.keyPatterns || []).map(normalizePattern).filter(Boolean)));
        const rec = {
            projectId, nsId, serviceId,
            keyPatterns,
            permissions: { read: true, write: true },
            createdAt: Date.now(), updatedAt: Date.now(),
        };

        if (BindingRepo.upsert) {
            await BindingRepo.upsert(projectId, nsId, serviceId, rec);
        } else if (BindingRepo.set) {
            await BindingRepo.set(projectId, nsId, serviceId, rec);
        } else {
            // fallback: create
            await BindingRepo.create?.(projectId, nsId, serviceId, rec);
        }

        created.push({ nsId, keyPatterns });
        existedNsIds.add(nsId);
    }

    return NextResponse.json({ created, skipped });
}
