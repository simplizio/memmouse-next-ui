
export function globToRegex(glob) {
    const esc = s => s.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    return new RegExp("^" + String(glob).split("*").map(p => p.split("?").map(esc).join(".")).join(".*") + "$");
}

const uniqNorm = (arr = []) =>
    Array.from(new Set((arr || []).map(String).map(s => s.trim()).filter(Boolean)));

import { PatternRepo } from "@/server/repos/PatternRepo";

/**
 * ЧИСТЫЕ подсказки для конкретного проекта/NS:
 * - только то, что уже сохранено в PatternRepo(projectId, nsId)
 * - никаких NamespaceRepo/BindingRepo/SCAN по Redis
 * Формат ответа совместим: возвращаем items и chips (первые N).
 */
export async function suggestPatternsForNamespace(projectId, nsId, limit = 120) {
    if (!projectId || !nsId) {
        return { projectId, nsId, items: [], chips: [], total: 0 };
    }

    // 1) читаем библиотеку паттернов для NS из репозитория
    const fromRepo = await PatternRepo.list(projectId, nsId).catch(() => []);

    // 2) нормализуем и ограничиваем
    const items = uniqNorm(fromRepo).slice(0, limit);

    // 3) компактные «чипы» для UI (первые 20)
    const chips = items.slice(0, 20);

    // 4) отдаём простую и предсказуемую структуру
    return {
        projectId,
        nsId,
        items,
        chips,
        total: items.length,
    };
}


// import { redis } from "@/server/redis/client.js";
// import { BindingRepo } from "@/server/repos/BindingRepo.js";
// import { NamespaceRepo } from "@/server/repos/NamespaceRepo.js";
// import {PatternRepo} from "@/server/repos/PatternRepo";
//
// export function globToRegex(glob) {
//     const esc = s => s.replace(/[.+^${}()|[\]\\]/g, "\\$&");
//     return new RegExp("^" + String(glob).split("*").map(p => p.split("?").map(esc).join(".")).join(".*") + "$");
// }
//
// export function patternsOverlap(aList, bList, samples = []) {
//     if (samples.length) {
//         const aRe = aList.map(globToRegex), bRe = bList.map(globToRegex);
//         const inA = k => aRe.some(r => r.test(k));
//         const inB = k => bRe.some(r => r.test(k));
//         return samples.some(k => inA(k) && inB(k));
//     }
//     const head = g => String(g).split("*")[0];
//     return aList.some(a => bList.some(b => head(a) && head(a) === head(b)));
// }
//
// const uniq = (a) => Array.from(new Set((a || []).filter(Boolean)));
//
// export async function suggestPatternsForNamespace(projectId, nsId, sample = 120) {
//     const ns = await NamespaceRepo.get(projectId, nsId).catch(() => null);
//     if (!ns) return { nsId, nsName: nsId, canonical: "", library: [], existing: [], live: [], chips: [] };
//
//     const base = String(ns.prefix || ns.name || ns.id).replace(/[:*]+/g, "");
//     const canonical = base ? `${base}:*` : "";
//
//     // библиотека паттернов для этого NS
//     const library = await PatternRepo.list(projectId, nsId).catch(() => []);
//
//     // существующие биндинги → собрать их keyPatterns
//     const svcIds = await BindingRepo.listByNamespace(projectId, nsId).catch(() => []);
//     const existing = uniq(
//         await Promise.all(svcIds.map(async (svcId) => {
//             const b = await BindingRepo.get(projectId, nsId, svcId).catch(() => null);
//             return (b?.keyPatterns || []);
//         })).then(arrs => arrs.flat())
//     );
//
//     // «живые» ключи через SCAN base:* и derive подпаттерны base:first:*
//     const live = [];
//     if (base) {
//         let cursor = "0"; let collected = 0; let iter = 0;
//         const match = `${base}:*`;
//         do {
//             const [next, keys] = await redis.scan(cursor, "MATCH", match, "COUNT", 500);
//             cursor = String(next);
//             for (const k of (keys || [])) {
//                 if (collected < sample) {
//                     // можно попробовать тип ключа (до 20 штук)
//                     if (live.length < 20) {
//                         try { live.push({ key: k, type: await redis.type(k) }); } catch {}
//                     } else {
//                         live.push({ key: k });
//                     }
//                     collected++;
//                 }
//             }
//             iter++;
//             if (collected >= sample || iter > 50) break;
//         } while (cursor !== "0");
//     }
//
//     const derived = uniq(
//         live
//             .map(x => String(x.key || ""))
//             .filter(k => base && k.startsWith(`${base}:`))
//             .map(k => {
//                 const parts = k.split(":");
//                 return parts.length >= 2 ? `${base}:${parts[1]}:*` : canonical;
//             })
//     );
//
//     const chips = uniq([canonical, ...library, ...existing, ...derived])
//         .filter(p => base ? p.startsWith(`${base}:`) : true)
//         .slice(0, 20);
//
//     return { nsId, nsName: ns.name || nsId, canonical, library, existing, live, chips };
// }
//
//
// export async function suggestPatternsForProject(projectId, samplePerNs = 100) {
//     const namespaces = await NamespaceRepo.list(projectId).catch(() => []);
//     const bindingsBySvc = new Map(); // serviceId -> [{ nsId, keyPatterns }]
//     for (const ns of namespaces) {
//         const svcIds = await BindingRepo.listByNamespace(projectId, ns.id).catch(() => []);
//         for (const sid of svcIds) {
//             const b = await BindingRepo.get(projectId, ns.id, sid).catch(() => null);
//             if (!b) continue;
//             const arr = bindingsBySvc.get(sid) || [];
//             arr.push({ nsId: ns.id, keyPatterns: b.keyPatterns || [], permissions: b.permissions || {} });
//             bindingsBySvc.set(sid, arr);
//         }
//     }
//
//     const liveByNs = {};
//     for (const ns of namespaces) {
//         const prefix = ns.prefix || "";
//         if (!prefix) { liveByNs[ns.id] = []; continue; }
//         const match = `${prefix}*`;
//         const out = [];
//         let cursor = "0"; let iter = 0;
//         do {
//             const res = await redis.scan(cursor, "MATCH", match, "COUNT", 500);
//             cursor = String(res[0]);
//             const keys = res[1] || [];
//             for (const k of keys) { out.push(k); if (out.length >= samplePerNs) break; }
//             iter++;
//             if (out.length >= samplePerNs || iter > 50) break;
//         } while (cursor !== "0");
//
//         const typed = [];
//         for (let i = 0; i < Math.min(out.length, 20); i++) {
//             try {
//                 const t = await redis.type(out[i]);
//                 typed.push({ key: out[i], type: t });
//             } catch {}
//         }
//         liveByNs[ns.id] = typed;
//     }
//
//     const suggestions = namespaces.map(ns => {
//         const base = ns.prefix ? [`${ns.prefix}*`] : [];
//         const existing = Array.from(new Set(
//             (Array.from(bindingsBySvc.values()).flat()
//                 .filter(b => b.nsId === ns.id)
//                 .flatMap(b => b.keyPatterns || []))
//         ));
//         return {
//             nsId: ns.id,
//             nsName: ns.name || ns.id,
//             base,
//             live: liveByNs[ns.id],
//             existing,
//         };
//     });
//
//     return { namespaces, suggestions, bindingsBySvc: Object.fromEntries(bindingsBySvc) };
// }
