export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { NamespaceRepo } from "@/server/repos/NamespaceRepo.js";
import { BindingRepo } from "@/server/repos/BindingRepo.js";
import process from "next/dist/build/webpack/loaders/resolve-url-loader/lib/postcss";

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


// export const runtime = "nodejs";
//
// import { NextResponse } from "next/server";
// import { ProjectRepo } from "@/server/repos/ProjectRepo.js";
// import { NamespaceRepo } from "@/server/repos/NamespaceRepo.js";
// import { BindingRepo } from "@/server/repos/BindingRepo.js";
//
// // безопасная «шайба» на прод
// const DEV_ALLOWED = process.env.ALLOW_DEV_ENDPOINTS === "1" || process.env.NODE_ENV !== "production";
//
// function norm(p) {
//     if (!p) return "";
//     let s = String(p).trim();
//     s = s.replace(/\s+/g, "");
//     s = s.replace(/\*{2,}/g, "*").replace(/:\*{2,}/g, ":*").replace(/\*+$/g, "*");
//     return s;
// }
//
// function canonicalPatternForNamespace(ns) {
//     // стараемся взять prefix, иначе derive из id/name
//     const raw = ns?.prefix || ns?.name || ns?.id || "";
//     const prefix = String(raw).replace(/[:*]+/g, "").replace(/_+$/g, ""); // "orders__" -> "orders"
//     return prefix ? `${prefix}:*` : "";
// }
//
// export async function GET() {
//     // просто подсказка по использованию
//     return NextResponse.json({
//         ok: true,
//         hint: "POST /api/dev { dryRun?: boolean, projectId?: string }",
//         guards: { DEV_ALLOWED },
//     });
// }
//
// export async function POST(req) {
//     if (!DEV_ALLOWED) {
//         return NextResponse.json({ error: "Forbidden in production. Set ALLOW_DEV_ENDPOINTS=1 to override." }, { status: 403 });
//     }
//
//     // опции: dryRun и фильтр по проекту (необязательно)
//     let dryRun = false;
//     let onlyProjectId = null;
//     try {
//         const body = await req.json();
//         if (body && typeof body === "object") {
//             if (typeof body.dryRun === "boolean") dryRun = body.dryRun;
//             if (body.projectId) onlyProjectId = String(body.projectId);
//         }
//     } catch { /* no-op */ }
//
//     // список проектов
//     const pr = await ProjectRepo.list().catch(() => ({ items: [] }));
//     const projects = Array.isArray(pr) ? pr : (pr.items || []);
//     const projectIds = projects.map(p => p.id).filter(id => !onlyProjectId || id === onlyProjectId);
//
//     const summary = [];
//     let scanned = 0;
//     let changed = 0;
//
//     for (const projectId of projectIds) {
//         const nsRes = await NamespaceRepo.list(projectId).catch(() => ({ items: [] }));
//         const namespaces = Array.isArray(nsRes) ? nsRes : (nsRes.items || []);
//
//         for (const ns of namespaces) {
//             const nsId = ns.id;
//             const target = canonicalPatternForNamespace(ns); // пример: "orders:*"
//             if (!target) continue;
//
//             const serviceIds = await BindingRepo.listServicesForNamespace(projectId, nsId).catch(() => []);
//             for (const serviceId of serviceIds) {
//                 scanned++;
//                 const binding = await BindingRepo.get(projectId, nsId, serviceId).catch(() => null);
//                 if (!binding) continue;
//
//                 const current = Array.from(new Set((binding.keyPatterns || []).map(norm).filter(Boolean)));
//                 const desired = [target];
//
//                 // уже чисто — пропускаем
//                 if (current.length === 1 && current[0] === target) continue;
//
//                 if (!dryRun) {
//                     await BindingRepo.upsert(projectId, nsId, serviceId, {
//                         ...binding,
//                         keyPatterns: desired,
//                         updatedAt: Date.now(),
//                     });
//                 }
//                 changed++;
//                 summary.push({ projectId, nsId, serviceId, from: current, to: desired });
//             }
//         }
//     }
//
//     return NextResponse.json({ ok: true, dryRun, scanned, changed, summary });
// }
