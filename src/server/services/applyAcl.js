import { redis } from "@/server/redis/client.js";
import { BindingRepo } from "@/server/repos/BindingRepo.js";
import { NamespaceRepo } from "@/server/repos/NamespaceRepo.js";
import { AclPresetRepo } from "@/server/repos/AclPresetRepo.js";
import { randomBytes } from "node:crypto";

export function makeRedisSecret(len = 32) {
    return randomBytes(24).toString("base64url");
}

// команды из пресетов + extra; берём defaults, если пусто
export async function buildAllowedCommands(presetNames = [], extra = []) {
    // ensureDefaults чтобы гарантировать набор команд
    //const items = await (await import("@/server/repos/AclPresetRepo.js")).AclPresetRepo.ensureDefaults().catch(() => []);
    const items = await AclPresetRepo.ensureDefaults().catch(() => []);
    const map = Object.fromEntries(items.map(p => [p.name, p.commands || []]));
    const acc = new Set();
    (presetNames || []).forEach(n => (map[n] || []).forEach(c => acc.add(c)));
    (extra || []).forEach(c => acc.add(c));
    return Array.from(acc);
}

// если у сервиса нет биндингов — вернём и применим явный fallback ["mm:*"]
export async function collectKeyPatterns(projectId, serviceId) {
    const { BindingRepo }   = await import("@/server/repos/BindingRepo.js");
    const { NamespaceRepo } = await import("@/server/repos/NamespaceRepo.js");

    const nsIds = await BindingRepo.listNamespacesForService(projectId, serviceId).catch(() => []);
    const set = new Set();
    for (const nsId of nsIds) {
        const b = await BindingRepo.get(projectId, nsId, serviceId).catch(() => null);
        if (b?.keyPatterns?.length) b.keyPatterns.forEach(p => set.add(String(p)));
        else {
            const ns = await NamespaceRepo.get(projectId, nsId).catch(() => null);
            if (ns?.prefix) set.add(`${ns.prefix}*`);
        }
    }
    const arr = Array.from(set);
    return arr.length ? arr : ["mm:*"];
}

// // собрать паттерны ключей; если пусто — вернём fallback ["mm:*"] и применим его же
// export async function collectKeyPatterns(projectId, serviceId) {
//     const nsIds = await BindingRepo.listNamespacesForService(projectId, serviceId).catch(() => []);
//     const set = new Set();
//     for (const nsId of nsIds) {
//         const b = await BindingRepo.get(projectId, nsId, serviceId).catch(() => null);
//         if (b?.keyPatterns?.length) b.keyPatterns.forEach(p => set.add(String(p)));
//         else {
//             const ns = await NamespaceRepo.get(projectId, nsId).catch(() => null);
//             if (ns?.prefix) set.add(`${ns.prefix}*`);
//         }
//     }
//     const arr = Array.from(set);
//     return arr.length ? arr : ["mm:*"];   // <- важный fallback
// }

// // команды из пресетов + extra; поддерживаем только поле `commands` (как в AclPresetRepo)
// export async function buildAllowedCommands(presetNames = [], extra = []) {
//     const items = await AclPresetRepo.list().catch(() => []);
//     const map = Object.fromEntries(items.map(p => [p.name, p.commands || []]));
//     const acc = new Set();
//     (presetNames || []).forEach(n => (map[n] || []).forEach(c => acc.add(c)));
//     (extra || []).forEach(c => acc.add(c));
//     return Array.from(acc);
// }

/** Применить/preview ACL. Возвращает plain-object (не Response). */
export async function applyAclForService({
                                             projectId, serviceId, presets = [], extra = [], dryRun = false, username, secret,
                                         }) {
    const allowCmds   = await buildAllowedCommands(presets, extra);
    const keyPatterns = await collectKeyPatterns(projectId, serviceId);

    const user = (username || `svc:${projectId}:${serviceId}`).replace(/[^a-zA-Z0-9:_-]/g, "_");
    const pass = secret || makeRedisSecret();

    const args = ["SETUSER", user, "reset", "on", `>${pass}`, ...allowCmds, "resetchannels", "resetkeys"];
    keyPatterns.forEach(p => args.push(`~${p}`));

    const preview = `ACL ${args.join(" ")}`;

    if (dryRun) {
        return { ok: true, preview, username: user, keyPatterns, allowCmds };
    }

    await redis.acl(...args);
    try { await redis.acl("SAVE"); } catch {}

    return { ok: true, preview, username: user, secret: pass, keyPatterns, allowCmds };
}




// import { redis } from "@/server/redis/client.js";
// import { BindingRepo } from "@/server/repos/BindingRepo.js";
// import { NamespaceRepo } from "@/server/repos/NamespaceRepo.js";
// // import { buildAllowedCommands } from "@/server/services/AclPresets.js";
// import { randomBytes } from "node:crypto";
// import {ServiceRepo} from "@/server/repos/ServiceRepo";
// import {NextResponse} from "next/server";
// import {AclPresetRepo} from "@/server/repos/AclPresetRepo";
//
// export function makeRedisSecret() {
//     return randomBytes(24).toString("base64url");
// }
//
// // собрать паттерны ключей из биндингов; если у биндинга нет явных паттернов — fallback к префиксу неймспейса
// export async function collectKeyPatterns(projectId, serviceId) {
//     const nsIds = await BindingRepo.listNamespacesForService(projectId, serviceId).catch(() => []);
//     if (!nsIds?.length) return [];
//     const set = new Set();
//     for (const nsId of nsIds) {
//         const b = await BindingRepo.get(projectId, nsId, serviceId).catch(() => null);
//         if (b?.keyPatterns?.length) {
//             b.keyPatterns.forEach(p => set.add(String(p)));
//         } else {
//             const ns = await NamespaceRepo.get(projectId, nsId).catch(() => null);
//             if (ns?.prefix) set.add(`${ns.prefix}*`);
//         }
//     }
//     return Array.from(set);
// }
//
// // команды из пресетов + extra (уникальные)
// export async function buildAllowedCommands(presetNames = [], extra = []) {
//     const items = await AclPresetRepo.list().catch(() => []);
//     const map = Object.fromEntries(items.map(p => [p.name, p.commands]));
//     const acc = new Set();
//     (presetNames || []).forEach(n => (map[n] || []).forEach(c => acc.add(c)));
//     (extra || []).forEach(c => acc.add(c));
//     return Array.from(acc);
// }
//
// /**
//  * Применить (или сделать превью) ACL для сервиса.
//  * Возвращает plain-object: { ok, preview, username, secret?, keyPatterns, allowCmds }
//  */
// export async function applyAclForService({
//                                              projectId,
//                                              serviceId,
//                                              presets = [],
//                                              extra = [],
//                                              dryRun = false,
//                                              username, // optional override
//                                              secret,   // optional override
//                                          }) {
//     const allowCmds   = await buildAllowedCommands(presets, extra);
//     const keyPatterns = await collectKeyPatterns(projectId, serviceId);
//
//     const user = (username || `svc:${projectId}:${serviceId}`).replace(/[^a-zA-Z0-9:_-]/g, "_");
//     const pass = secret || makeRedisSecret();
//
//     const args = ["SETUSER", user, "reset", "on", `>${pass}`, ...allowCmds, "resetchannels", "resetkeys"];
//     (keyPatterns.length ? keyPatterns : ["mm:*"]).forEach(p => args.push(`~${p}`));
//
//     const preview = `ACL ${args.join(" ")}`;
//
//     if (dryRun) {
//         return { ok: true, preview, username: user, keyPatterns, allowCmds };
//     }
//
//     // применяем ACL к Redis
//     await redis.acl(...args);
//     try { await redis.acl("SAVE"); } catch {}
//
//     return { ok: true, preview, username: user, secret: pass, keyPatterns, allowCmds };
// }

// export async function collectKeyPatterns(projectId, serviceId) {
//     const nsIds = await BindingRepo.listNamespacesForService(projectId, serviceId);
//     const patterns = new Set();
//     for (const nsId of nsIds) {
//         const b = await BindingRepo.get(projectId, nsId, serviceId);
//         if (b?.patterns?.length) b.patterns.forEach((p) => patterns.add(p));
//         else {
//             const ns = await NamespaceRepo.get(projectId, nsId);
//             if (ns?.prefix) patterns.add(`${ns.prefix}*`);
//         }
//     }
//     return Array.from(patterns);
// }
//
// export async function applyAclForService({ projectId, serviceId, presets=[], extra=[], dryRun=false, username, secret }) {
//     const allowCmds   = buildAllowedCommands(presets, extra);
//     const keyPatterns = await collectKeyPatterns(projectId, serviceId);
//
//     const user = (username || `svc:${projectId}:${serviceId}`).replace(/[^a-zA-Z0-9:_-]/g, "_");
//     const pass = secret || makeRedisSecret();
//
//     const args = ["SETUSER", user, "reset", ...allowCmds, "resetchannels", "resetkeys"];
//     keyPatterns.forEach((p) => args.push(`~${p}`));
//     args.push("on", `>${pass}`);
//
//     const preview = `ACL ${args.join(" ")}`;
//     if (dryRun) return { dryRun: true, username: user, presets, extra, allowCmds, keyPatterns, preview };
//
//     try {
//         const patched = await ServiceRepo.upsert({
//             projectId,
//             id: serviceId,
//             redisUser: username,
//             lastAclAppliedAt: Date.now(),
//             acl: {
//                 presetsApplied: Array.isArray(presets) ? presets : [],
//                 extraApplied: Array.isArray(extra) ? extra : [],
//                 keyPatternsSnapshot: keyPatterns,   // чем реально покрыли
//             },
//         });
//     } catch (_) { /* non-critical for response */ }
//
//     // await redis.acl(...args);
//     // try {
//     //     const svc = await ServiceRepo.get(projectId, serviceId);
//     //     if (svc) {
//     //         await ServiceRepo.upsert({
//     //             ...svc,
//     //             redisUser: username,
//     //             lastAclAppliedAt: Date.now(),
//     //         });
//     //     }
//     // } catch (_) { /* non-critical for the response */ }
//
//     try { await redis.acl("SAVE"); } catch (_) {} // ignore if not supported
//
//     return NextResponse.json({
//         ok: true,
//         username,
//         secret,      // shows only once - need to copy
//         presets,
//         extra,
//         allowCmds,
//         keyPatterns,
//         preview
//     });
//     //return { ok: true, username: user, secret: pass, presets, extra, allowCmds, keyPatterns, preview };
// }
