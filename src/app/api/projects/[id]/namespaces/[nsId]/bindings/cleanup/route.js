export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { NamespaceRepo } from "@/server/repos/NamespaceRepo.js";
import { BindingRepo } from "@/server/repos/BindingRepo.js";

// защита от продакшна
const DEV_ALLOWED = process.env.ALLOW_DEV_ENDPOINTS === "1" || process.env.NODE_ENV !== "production";

function canonicalPatternForNamespace(ns) {
    const raw = ns?.prefix || ns?.name || ns?.id || "";
    const prefix = String(raw).replace(/[:*]+/g, "").replace(/_+$/g, "");
    return prefix ? `${prefix}:*` : "";
}

export async function POST(req, { params }) {
    if (!DEV_ALLOWED) {
        return NextResponse.json({ error: "Forbidden. Set ALLOW_DEV_ENDPOINTS=1 to enable." }, { status: 403 });
    }
    const { id: projectId, nsId } = await params;

    let dryRun = false;
    try {
        const body = await req.json();
        dryRun = !!body?.dryRun;
    } catch { /* no-op */ }

    const ns = await NamespaceRepo.get(projectId, nsId).catch(() => null);
    if (!ns) return NextResponse.json({ error: "namespaces not found" }, { status: 404 });

    const target = canonicalPatternForNamespace(ns);
    if (!target) return NextResponse.json({ error: "cannot derive canonical pattern" }, { status: 400 });

    const serviceIds = await BindingRepo.listByNamespace(projectId, nsId).catch(() => []);
    const summary = [];
    let changed = 0;

    for (const serviceId of serviceIds) {
        const cur = await BindingRepo.get(projectId, nsId, serviceId).catch(() => null);
        if (!cur) continue;
        const current = Array.from(new Set(cur.keyPatterns || []));
        if (current.length === 1 && current[0] === target) continue;

        if (!dryRun) {
            await BindingRepo.upsert(projectId, nsId, serviceId, {
                ...cur,
                keyPatterns: [target],
                updatedAt: Date.now(),
            });
        }
        changed++;
        summary.push({ serviceId, from: current, to: [target] });
    }

    return NextResponse.json({ ok: true, projectId, nsId, canonical: target, changed, dryRun, summary });
}

export async function GET(_req, { params }) {
    const { id: projectId, nsId } = await params;
    return NextResponse.json({
        ok: true,
        hint: `POST /api/projects/${projectId}/namespaces/${nsId}/bindings/cleanup { dryRun?: true }`,
        guards: { DEV_ALLOWED: !!DEV_ALLOWED },
    });
}
