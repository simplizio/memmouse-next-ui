export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { applyAclForService } from "@/server/services/applyAcl.js";
import { ServiceRepo } from "@/server/repos/ServiceRepo.js";
import { redis } from "@/server/redis/client.js";

export async function POST(req, { params }) {
    const { id: projectId, serviceId } = await params;
    const body = await req.json().catch(() => ({}));

    try {
        // применяем или делаем превью (возвращает plain-object)
        const res = await applyAclForService({
            projectId,
            serviceId,
            presets: Array.isArray(body.presets) ? body.presets : [],
            extra:   Array.isArray(body.extra)   ? body.extra   : [],
            dryRun:  !!body.dryRun,
            username: body.username,
            secret:   body.secret,
        });

        let service = null;

        // если это не превью — сохраняем снимок состояния и берём актуальный сервис
        if (!body.dryRun) {
            await ServiceRepo.patch(projectId, serviceId, {
                redisUser: res.username,
                redisPass: res.secret,
                lastAclAppliedAt: Date.now(),
                acl: {
                    presetsApplied: Array.isArray(body.presets) ? body.presets : [],
                    extraApplied:   Array.isArray(body.extra)   ? body.extra   : [],
                    keyPatternsSnapshot: res.keyPatterns || [],
                },
            });

            // best-effort: чтобы креды пережили рестарт при включённом aclfile
            try { await redis.acl("SAVE"); } catch {}

            service = await ServiceRepo.get(projectId, serviceId);
        }

        // отдаём результат apply + (если было применено) — свежий сервис
        return NextResponse.json({ ...res, service });
    } catch (e) {
        return NextResponse.json(
            { error: "ACL apply failed", detail: String(e?.message || e) },
            { status: 500 }
        );
    }
}


// export const runtime = "nodejs";
//
// import { NextResponse } from "next/server";
// import { applyAclForService } from "@/server/services/applyAcl.js";
// import { ServiceRepo } from "@/server/repos/ServiceRepo.js";
// import { redis } from "@/server/redis/client.js";
//
// export async function POST(req, { params }) {
//     const { id: projectId, serviceId } = await params;
//     const body = await req.json().catch(() => ({}));
//
//     try {
//         const res = await applyAclForService({
//             projectId,
//             serviceId,
//             presets: Array.isArray(body.presets) ? body.presets : [],
//             extra:   Array.isArray(body.extra)   ? body.extra   : [],
//             dryRun:  !!body.dryRun,
//             username: body.username,
//             secret:   body.secret,
//         });
//
//         let service = null;
//
//         if (!body.dryRun) {
//             // snapshot применённого состояния
//             try {
//                 await ServiceRepo.patch(projectId, serviceId, {
//                     redisUser: res.username,
//                     lastAclAppliedAt: Date.now(),
//                     acl: {
//                         presetsApplied: Array.isArray(body.presets) ? body.presets : [],
//                         extraApplied:   Array.isArray(body.extra)   ? body.extra   : [],
//                         keyPatternsSnapshot: res.keyPatterns || [],
//                     },
//                 });
//                 try { await redis.acl("SAVE"); } catch {}
//             } catch {}
//
//             // возьмём обновлённый сервис и вернём его вместе с res
//             service = await ServiceRepo.get(projectId, serviceId);
//         }
//
//         return NextResponse.json({ ...res, service });
//     } catch (e) {
//         return NextResponse.json({ error: "ACL apply failed", detail: String(e) }, { status: 500 });
//     }
// }


// export const runtime = "nodejs";
//
// import { NextResponse } from "next/server";
// import { applyAclForService } from "@/server/services/applyAcl.js";
// import { ServiceRepo } from "@/server/repos/ServiceRepo.js";
// import { redis } from "@/server/redis/client.js";
//
// export async function POST(req, { params }) {
//     const { id: projectId, serviceId } = await params;
//     const body = await req.json().catch(() => ({}));
//
//     try {
//         const res = await applyAclForService({
//             projectId,
//             serviceId,
//             presets: Array.isArray(body.presets) ? body.presets : [],
//             extra:   Array.isArray(body.extra)   ? body.extra   : [],
//             dryRun:  !!body.dryRun,
//             username: body.username,
//             secret:   body.secret,
//         });
//
//         if (!body.dryRun) {
//             // сохраняем снимок применённого состояния
//             try {
//                 await ServiceRepo.patch(projectId, serviceId, {
//                     redisUser: res.username,
//                     lastAclAppliedAt: Date.now(),
//                     acl: {
//                         presetsApplied: Array.isArray(body.presets) ? body.presets : [],
//                         extraApplied:   Array.isArray(body.extra)   ? body.extra   : [],
//                         keyPatternsSnapshot: res.keyPatterns || [],
//                     },
//                 });
//                 try { await redis.acl("SAVE"); } catch {}
//             } catch {}
//         }
//
//         return NextResponse.json(res);
//     } catch (e) {
//         return NextResponse.json({ error: "ACL apply failed", detail: String(e) }, { status: 500 });
//     }
// }


// export const runtime = "nodejs";
// import { NextResponse } from "next/server";
// import { ServiceRepo } from "@/server/repos/ServiceRepo.js";
// import { AclPresetRepo } from "@/server/repos/AclPresetRepo.js";
// import { applyAclForService } from "@/server/services/applyAcl.js";
// import { redis } from "@/server/redis/client.js";
//
// export async function POST(req, { params }) {
//     const { id: projectId, serviceId } = await params;
//     const svc = await ServiceRepo.get(projectId, serviceId);
//     if (!svc) return NextResponse.json({ error: "service not found" }, { status: 404 });
//
//     const body = await req.json().catch(()=>({}));
//     const list = await AclPresetRepo.list();                         // ← presets from Redis
//     const presetsMap = Object.fromEntries(list.map(p => [p.name, p.commands]));
//
//     try {
//         const res = await applyAclForService({
//             projectId, serviceId,
//             presetsMap,                                                  // ← provide the presets map to helper
//             presets: Array.isArray(body.presets) ? body.presets : [],
//             extra: Array.isArray(body.extra) ? body.extra : [],
//             dryRun: !!body.dryRun,
//             username: body.username,                                     // optional: throw
//             secret: body.secret,                                         // optional: throw
//         });
//
//         // ⬇⬇ СЮДА: сохраняем состояние ACL только при реальном применении
//         if (!body.dryRun) {
//             try {
//                 await ServiceRepo.patch(projectId, serviceId, {
//                     redisUser: res.username,                 // кого завели/обновили в Redis
//                     lastAclAppliedAt: Date.now(),            // когда применили
//                     acl: {
//                         presetsApplied: Array.isArray(body.presets) ? body.presets : [],
//                         extraApplied: Array.isArray(body.extra) ? body.extra : [],
//                         keyPatternsSnapshot: res.keyPatterns || [], // чем реально покрыли
//                     },
//                 });
//
//                 // best-effort, чтобы пережило рестарт Redis (если включён aclfile)
//                 try {
//                     await redis.acl("SAVE");
//                 } catch {
//                 }
//             } catch (e) {
//                 // не блокируем ответ клиенту, если патч не записался
//                 // можно залогировать e
//             }
//         }
//
//         return NextResponse.json(res);
//     } catch (e) {
//         return NextResponse.json({ error: "ACL apply failed", detail: String(e) }, { status: 500 });
//     }
// }

// export const runtime = "nodejs";
// import { NextResponse } from "next/server";
// import { ServiceRepo } from "@/server/repos/ServiceRepo.js";
// import { applyAclForService } from "@/server/services/applyAcl.js";
//
// export async function POST(req, { params }) {
//     const { id: projectId, serviceId } = await params;
//     const svc = await ServiceRepo.get(projectId, serviceId);
//     if (!svc) return NextResponse.json({ error: "service not found" }, { status: 404 });
//
//     const body = await req.json().catch(()=>({}));
//     try {
//         const res = await applyAclForService({
//             projectId, serviceId,
//             presets: Array.isArray(body.presets) ? body.presets : [],
//             extra: Array.isArray(body.extra) ? body.extra : [],
//             dryRun: !!body.dryRun,
//         });
//         return NextResponse.json(res);
//     } catch (e) {
//         return NextResponse.json({ error: "ACL apply failed", detail: String(e) }, { status: 500 });
//     }
// }


// export const runtime = "nodejs";
//
// import { NextResponse } from "next/server";
// import { redis } from "@/server/redis/client.js";
// import { BindingRepo } from "@/server/repos/BindingRepo.js";
// import { NamespaceRepo } from "@/server/repos/NamespaceRepo.js";
// import { ServiceRepo } from "@/server/repos/ServiceRepo.js";
// import { buildAllowedCommands } from "@/server/services/AclPresets.js";
// import { randomBytes } from "node:crypto";
//
// // generates a secret for Redis user
// function makeRedisSecret() {
//     return randomBytes(24).toString("base64url"); // safe, short
// }
//
// // collect all patterns across all service's bindings
// async function collectKeyPatterns(projectId, serviceId) {
//     const nsIds = await BindingRepo.listNamespacesForService(projectId, serviceId);
//     const patterns = new Set();
//     for (const nsId of nsIds) {
//         const b = await BindingRepo.get(projectId, nsId, serviceId);
//         if (b?.patterns?.length) {
//             b.patterns.forEach((p) => patterns.add(p));
//         } else {
//             // fallback: take namespaces prefix and add '*'
//             const ns = await NamespaceRepo.get(projectId, nsId);
//             if (ns?.prefix) patterns.add(`${ns.prefix}*`);
//         }
//     }
//     return Array.from(patterns);
// }
//
// export async function POST(req, { params }) {
//     const { id: projectId, serviceId } = await params;
//     const svc = await ServiceRepo.get(projectId, serviceId);
//     if (!svc) return NextResponse.json({ error: "service not found" }, { status: 404 });
//
//     const body = await req.json().catch(() => ({}));
//     const presets = Array.isArray(body.presets) ? body.presets : [];
//     const extra   = Array.isArray(body.extra)   ? body.extra   : [];
//     const dryRun  = !!body.dryRun;
//
//     const allowCmds = buildAllowedCommands(presets, extra);
//     const keyPatterns = await collectKeyPatterns(projectId, serviceId);
//
//     // username in Redis, avoid ':'
//     const username = `svc:${projectId}:${serviceId}`.replace(/[^a-zA-Z0-9:_-]/g, "_");
//     const secret = body.secret || makeRedisSecret();
//
//     // Collecting arguments for ACL SETUSER
//     // Order is important: reset -> deny/allow -> resetchannels -> resetkeys -> ~patterns -> on -> >secret
//     const args = ["SETUSER", username, "reset", ...allowCmds, "resetchannels", "resetkeys"];
//     keyPatterns.forEach((p) => args.push(`~${p}`));
//     args.push("on", `>${secret}`);
//
//     const preview = `ACL ${args.join(" ")}`;
//
//     if (dryRun) {
//         return NextResponse.json({
//             dryRun: true,
//             username, secret: "will-be-generated", presets, extra, keyPatterns, allowCmds, preview
//         });
//     }
//
//     // apply to data Redis (using the same redis-client demo)
//     try {
//         await redis.acl(...args); // ioredis: redis.acl('SETUSER', username, 'reset', ...)
//     } catch (e) {
//         return NextResponse.json({ error: "ACL apply failed", detail: String(e), preview }, { status: 500 });
//     }
//
//     // Do not store the secret in ServiceRepo; just provide it to the user
//     return NextResponse.json({
//         ok: true,
//         username,
//         secret, // will show only one time
//         presets,
//         extra,
//         keyPatterns,
//         allowCmds,
//         preview,
//     });
// }
