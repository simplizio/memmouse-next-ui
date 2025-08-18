export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Redis from "ioredis";
import crypto from "node:crypto";
import { ulid } from "ulidx";
import { redis } from "@/server/redis/client.js";
import { collectKeyPatterns, buildAllowedCommands } from "@/server/services/applyAcl.js";

export async function POST(req, { params }) {
    const { id: projectId, serviceId } = await params;
    const body = await req.json().catch(() => ({}));

    const presets = Array.isArray(body.presets) ? body.presets : [];
    const extra   = Array.isArray(body.extra)   ? body.extra   : [];

    const allowCmds   = await buildAllowedCommands(presets, extra);
    let   keyPatterns = await collectKeyPatterns(projectId, serviceId);
    if (!keyPatterns.length) keyPatterns = ["mm:*"];

    const tmpUser = `tmp:p${projectId}:${serviceId}:${ulid()}`.replace(/[^a-zA-Z0-9:_-]/g, "_");
    const tmpPass = crypto.randomBytes(18).toString("base64url");

    // применяем временного юзера
    const args = ["SETUSER", tmpUser, "reset", "on", `>${tmpPass}`, ...allowCmds, "resetchannels", "resetkeys"];
    keyPatterns.forEach(p => args.push(`~${p}`));
    await redis.acl(...args);

    const url = (globalThis?.process?.env?.REDIS_URL) || "redis://localhost:6379";
    const client = new Redis(url, { username: tmpUser, password: tmpPass });

    // тестовые операции
    const sampleKey = (keyPatterns[0] || "mm:*").replace(/\*+/g, "test") + ":" + Math.random().toString(36).slice(2, 8);
    let canRead = false, canWrite = false, readErr = null, writeErr = null;

    try { await client.get(sampleKey); canRead = true; } catch (e) { readErr = String(e?.message || e); }
    try { await client.set(sampleKey, "x"); canWrite = true; } catch (e) { writeErr = String(e?.message || e); }

    try { await client.quit(); } catch {}
    try { await redis.acl("DELUSER", tmpUser); } catch {}

    return NextResponse.json({ key: sampleKey, canRead, readErr, canWrite, writeErr });
}


// import process from "next/dist/build/webpack/loaders/resolve-url-loader/lib/postcss";
//
// export const runtime = "nodejs";
// import { NextResponse } from "next/server";
// import { AclPresetRepo } from "@/server/repos/AclPresetRepo.js";
// import { collectKeyPatterns, makeRedisSecret } from "@/server/services/applyAcl.js";
// import { buildAllowedCommandsFromPresets } from "@/server/services/AclPresets.js";
// import { redis } from "@/server/redis/client.js";
// import Redis from "ioredis";
//
// function synthKey(pattern) {
//     // "orders:*" -> "orders:mm:test:<rand>"
//     if (pattern.endsWith("*")) return pattern.slice(0, -1) + "mm:test:" + Math.random().toString(36).slice(2,8);
//     return pattern; // точное совпадение
// }
//
// export async function POST(req, { params }) {
//     const { id: projectId, serviceId } = await params;
//     const body = await req.json().catch(()=> ({}));
//     const op = (body.op || "rw").toLowerCase(); // r | w | rw
//
//     // собрать команды и паттерны
//     const list = await AclPresetRepo.list();
//     const presetsMap = Object.fromEntries(list.map(p => [p.name, p.commands]));
//     const allowCmds = buildAllowedCommandsFromPresets(
//         Array.isArray(body.presets) ? body.presets : [],
//         Array.isArray(body.extra) ? body.extra : [],
//         presetsMap
//     );
//     const patterns = await collectKeyPatterns(projectId, serviceId);
//     const key = synthKey(patterns[0] || "mm:test:*");
//
//     // создать временного пользователя
//     const tmpUser = `tmp:${projectId}:${serviceId}:${Math.random().toString(36).slice(2,6)}`;
//     const secret = makeRedisSecret();
//     const args = ["SETUSER", tmpUser, "reset", ...allowCmds, "resetchannels", "resetkeys"];
//     (patterns.length ? patterns : ["mm:test:*"]).forEach(p => args.push(`~${p}`));
//     args.push("on", `>${secret}`);
//
//     const url = process.env.REDIS_URL || "redis://localhost:6379";
//     let client;
//     try {
//         await redis.acl(...args);
//         client = new Redis(url, { username: tmpUser, password: secret, lazyConnect: false });
//
//         const res = { key, canRead: null, canWrite: null, readErr: null, writeErr: null };
//         if (op.includes("w")) {
//             try { await client.set(key, "ok", "EX", 5); res.canWrite = true; }
//             catch (e) { res.canWrite = false; res.writeErr = String(e); }
//         }
//         if (op.includes("r")) {
//             try { await client.get(key); res.canRead = true; }
//             catch (e) { res.canRead = false; res.readErr = String(e); }
//         }
//         return NextResponse.json(res);
//     } catch (e) {
//         return NextResponse.json({ error: "test failed", detail: String(e) }, { status: 500 });
//     } finally {
//         try { if (client) await client.quit(); } catch {}
//         try { await redis.acl("DELUSER", tmpUser); } catch {}
//     }
// }
