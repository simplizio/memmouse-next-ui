export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ServiceRepo } from "@/server/repos/ServiceRepo.js";
import { BindingRepo } from "@/server/repos/BindingRepo.js";
import { NamespaceRepo } from "@/server/repos/NamespaceRepo.js";

export async function GET(req, { params }) {
    const { id, serviceId } = await params;
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    const svc = await ServiceRepo.get(id, serviceId);
    if (!svc) return NextResponse.json({ error: "not found" }, { status: 404 });

    const ok = token && (svc.tokens || []).some(t => t.status === "active" && t.value === token);
    if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // берём только те nsId, где есть биндинг этого сервиса
    const nsIds = await BindingRepo.listByService(id, serviceId);

    const bindings = [];
    for (const nsId of nsIds) {
        const b  = await BindingRepo.get(id, nsId, serviceId);
        const ns = await NamespaceRepo.get(id, nsId); // метаданные неймспейса
        if (b) {
            bindings.push({
                namespace: {
                    id: nsId,
                    prefix: ns?.prefix,
                    ttl: ns?.ttl,
                    eviction: ns?.eviction,
                },
                permissions: b.permissions,
                patterns: b.patterns || [],
                scopes: b.scopes || [],
                rate: b.rate || { readRps: 0, writeRps: 0 },
            });
        }
    }

    const cfg = {
        version: 1,
        project: { id },
        service: { id: svc.id, name: svc.name, scopes: svc.scopes || [] },
        endpoints: {
            data: process.env.REDIS_URL,
            control: process.env.APP_URL || "http://localhost:3000",
        },
        bindings,
        telemetry: { ingest: "/api/telemetry", sample: 1.0 },
        generatedAt: Date.now(),
    };

    return NextResponse.json(cfg, { headers: { "Cache-Control": "no-store" } });
}
