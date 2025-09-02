export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { BindingRepo } from "@/server/repos/BindingRepo.js";
import { NamespaceRepo } from "@/server/repos/NamespaceRepo.js";
import { ServiceRepo } from "@/server/repos/ServiceRepo.js";
import { AclPresetRepo } from "@/server/repos/AclPresetRepo.js";
import { applyAclForService } from "@/server/services/applyAcl.js";

/* ---------------- utils ---------------- */
const MAX_PATTERNS = 32;
const MAX_PATTERN_LEN = 256;
const PERMS = new Set(["R", "W", "RW"]);
const PATTERN_RE = /^[A-Za-z0-9:_\-\.\{\}\[\]\*]+$/;

const bad = (status, msg, details) =>
    NextResponse.json({ error: msg, details }, { status });

const coerceInt = (v, def = 0) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : def;
};

function normalizePattern(p) {
    if (!p) return "";
    let s = String(p).trim();
    s = s.replace(/\s+/g, "");
    s = s.replace(/\*{2,}/g, "*");
    s = s.replace(/:\*{2,}/g, ":*");
    s = s.replace(/:+/g, ":");
    s = s.replace(/:\*:+/g, ":*:");
    s = s.replace(/\*+$/g, "*");
    s = s.replace(/^[:*]+/, "");
    return s;
}
function sanitizePatterns(patterns) {
    const arr = (patterns || [])
        .map(normalizePattern)
        .filter(Boolean);
    const uniq = Array.from(new Set(arr));
    if (uniq.length > MAX_PATTERNS) uniq.length = MAX_PATTERNS;
    return uniq;
}
function validatePatterns(patterns) {
    if (!patterns.length) return { ok: false, reason: "empty" };
    for (const p of patterns) {
        if (p.length > MAX_PATTERN_LEN) return { ok: false, reason: "too_long", pattern: p };
        if (!PATTERN_RE.test(p)) return { ok: false, reason: "bad_chars", pattern: p };
    }
    return { ok: true };
}
function permToObj(p) {
    if (typeof p === "object" && p) {
        return { read: !!p.read, write: !!p.write };
    }
    const x = String(p || "R").toUpperCase();
    return { read: x.includes("R"), write: x.includes("W") };
}
function mapPermToPresets(p) {
    const x = String(p || "R").toUpperCase();
    if (x === "RW") return ["kv_rw", "metrics"];
    if (x === "W")  return ["kv_write", "metrics"];
    return ["kv_read", "metrics"];
}
/* -------------------------------------- */

export async function GET(_req, { params }) {
    const { id: projectId, nsId } = await params;

    // вернём «обогащённый» список: с именами сервисов
    const svcIds = await BindingRepo.listByNamespace(projectId, nsId).catch(() => []);
    const items = [];
    for (const serviceId of svcIds) {
        const rec = await BindingRepo.get(projectId, nsId, serviceId).catch(() => null);
        if (!rec) continue;
        const svc = await ServiceRepo.get(projectId, serviceId).catch(() => null);
        items.push({
            serviceId,
            serviceName: svc?.name || serviceId,
            keyPatterns: rec.keyPatterns || [],
            permissions: rec.permissions ?? { read: true, write: false },
            rate: rec.rate,
            updatedAt: rec.updatedAt ?? rec.createdAt ?? null,
        });
    }
    return NextResponse.json({ items });
}

export async function POST(req, { params }) {
    const { id: projectId, nsId } = await params;

    let body = {};
    try { body = await req.json(); } catch { return bad(400, "invalid JSON"); }

    const serviceId = String(body.serviceId || "").trim();
    if (!serviceId) return bad(400, "serviceId required");

    // namespaces & service existence
    const [ns, svc] = await Promise.all([
        NamespaceRepo.get(projectId, nsId),
        ServiceRepo.get(projectId, serviceId),
    ]);
    if (!ns)  return bad(404, "namespaces not found", { projectId, nsId });
    if (!svc) return bad(404, "service not found", { projectId, serviceId });

    // permissions: "R" | "W" | "RW" | {read,write}
    const permInput = body.permissions ?? "R";
    const permCode  = typeof permInput === "string" ? permInput.toUpperCase() : (permInput.read && permInput.write ? "RW" : (permInput.write ? "W" : "R"));
    if (typeof permInput === "string" && !PERMS.has(permCode)) {
        return bad(400, "permissions must be R | W | RW", { permissions: permInput });
    }
    const permissions = permToObj(permInput);

    // rate limits (rps)
    const rate = {
        readRps: coerceInt(body?.rate?.readRps, 0),
        writeRps: coerceInt(body?.rate?.writeRps, 0),
    };

    // key patterns (accepts body.keyPatterns OR body.patterns)
    let keyPatterns = sanitizePatterns(body.keyPatterns ?? body.patterns);
    if (!keyPatterns.length) {
        // дефолт: <prefix>:*
        const base = String(ns?.prefix || ns?.name || ns?.id || "").replace(/[:*]+/g, "").replace(/_+$/g, "");
        if (base) keyPatterns = [`${base}:*`];
    }
    const patCheck = validatePatterns(keyPatterns);
    if (!patCheck.ok) return bad(400, "invalid key patterns", patCheck);

    // save binding
    const rec = await BindingRepo.upsert(projectId, nsId, serviceId, {
        projectId, nsId, serviceId,
        serviceName: String(body.serviceName || svc.name || serviceId),
        keyPatterns,
        permissions,
        rate,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        // (доп. поля можно хранить при желании)
        scopes: Array.isArray(body.scopes) ? body.scopes.map(String) : undefined,
        aclPresets: Array.isArray(body.aclPresets) ? body.aclPresets : undefined,
        aclExtra: Array.isArray(body.aclExtra) ? body.aclExtra : undefined,
    });

    // optional: auto-apply ACL
    const applyAcl = !!body.applyAcl;
    if (applyAcl) {
        const list = await AclPresetRepo.list().catch(() => []);
        const presetsMap = Object.fromEntries((list || []).map(p => [p.name, p.commands]));
        const chosenPresets = Array.isArray(body.aclPresets) && body.aclPresets.length
            ? body.aclPresets
            : mapPermToPresets(permCode);
        const extra = Array.isArray(body.aclExtra) ? body.aclExtra : [];

        try {
            const res = await applyAclForService({
                projectId,
                serviceId,
                presetsMap,
                presets: chosenPresets,
                extra,
                dryRun: false,
            });
            return NextResponse.json({
                ok: true,
                binding: rec,
                _aclApplied: true,
                _acl: { username: res.username, secret: res.secret }, // показать один раз
            }, { status: 201 });
        } catch (e) {
            return NextResponse.json({
                ok: true,
                binding: rec,
                _aclApplied: false,
                _aclError: String(e),
            }, { status: 201 });
        }
    }

    return NextResponse.json({ ok: true, binding: rec }, { status: 201 });
}


// export const runtime = "nodejs";
//
// import { NextResponse } from "next/server";
// import { BindingRepo } from "@/server/repos/BindingRepo.js";
// import { NamespaceRepo } from "@/server/repos/NamespaceRepo.js";
// import { ServiceRepo } from "@/server/repos/ServiceRepo.js";
// import { AclPresetRepo } from "@/server/repos/AclPresetRepo.js";
// import { applyAclForService } from "@/server/services/applyAcl.js";
//
// const PERMS = new Set(["R", "W", "RW"]);
// const MAX_PATTERNS = 32;
// const MAX_PATTERN_LEN = 256;
//
// // Let's allow using letters/numbers and basic symbols for redis keys and also a glob '*'
// const PATTERN_RE = /^[A-Za-z0-9:_\-\.\{\}\[\]\*]+$/;
//
// function bad(status, msg, details) {
//     return NextResponse.json({ error: msg, details }, { status });
// }
//
// function coerceInt(v, def = 0) {
//     const n = Number(v);
//     return Number.isFinite(n) && n >= 0 ? Math.floor(n) : def;
// }
//
// function sanitizePatterns(patterns) {
//     const arr = (patterns || [])
//         .map((s) => String(s).trim())
//         .filter(Boolean);
//     if (arr.length > MAX_PATTERNS) arr.length = MAX_PATTERNS;
//     return arr;
// }
//
// function validatePatterns(patterns) {
//     if (!patterns.length) return { ok: false, reason: "empty" };
//     for (const p of patterns) {
//         if (p.length > MAX_PATTERN_LEN) return { ok: false, reason: "too_long", pattern: p };
//         if (!PATTERN_RE.test(p)) return { ok: false, reason: "bad_chars", pattern: p };
//     }
//     return { ok: true };
// }
//
// function mapPermToPresets(p) {
//     const x = String(p || "R").toUpperCase();
//     if (x === "RW") return ["kv_rw", "metrics"];
//     if (x === "W")  return ["kv_write", "metrics"];
//     return ["kv_read", "metrics"];
// }
//
// export async function POST(req, { params }) {
//     const { id: projectId, nsId } = await params;
//
//     let body;
//     try {
//         body = await req.json();
//     } catch {
//         return bad(400, "invalid JSON");
//     }
//
//     // 1) basic fields validation
//     const serviceId = (body.serviceId || "").trim();
//     const serviceName = (body.serviceName || "").trim();
//     const permissions = String(body.permissions || "R").toUpperCase();
//     const rate = {
//         readRps: coerceInt(body?.rate?.readRps, 0),
//         writeRps: coerceInt(body?.rate?.writeRps, 0),
//     };
//     const applyAcl = !!body.applyAcl;
//
//     if (!serviceId) return bad(400, "serviceId required");
//     if (!PERMS.has(permissions)) return bad(400, "permissions must be R | W | RW", { permissions });
//
//     // 2) check if namespaces and service exist
//     const [ns, svc] = await Promise.all([
//         NamespaceRepo.get(projectId, nsId),
//         ServiceRepo.get(projectId, serviceId),
//     ]);
//     if (!ns) return bad(404, "namespaces not found", { projectId, nsId });
//     if (!svc) return bad(404, "service not found", { projectId, serviceId });
//
//     // 3) Patterns: either from bidy, or fallback to the namespaces prefix + '*'
//     let patterns = sanitizePatterns(body.patterns);
//     if (!patterns.length && ns?.prefix) patterns = [`${ns.prefix}*`];
//
//     const patCheck = validatePatterns(patterns);
//     if (!patCheck.ok) return bad(400, "invalid key patterns", patCheck);
//
//     // 4) Scopes (optional - just normalizing into array of strings)
//     const scopes = Array.isArray(body.scopes)
//         ? body.scopes.map((s) => String(s).trim()).filter(Boolean)
//         : [];
//
//     // 5) saving the binding
//     const saved = await BindingRepo.upsert({
//         projectId,
//         nsId,
//         serviceId,
//         serviceName: serviceName || svc.name || serviceId,
//         permissions,
//         patterns,
//         scopes,
//         rate,
//         // saving chosen ACL parameters (if received any)
//         aclPresets: Array.isArray(body.aclPresets) ? body.aclPresets : undefined,
//         aclExtra: Array.isArray(body.aclExtra) ? body.aclExtra : undefined,
//     });
//
//     // 6) (optional) auto apply ACL
//     if (applyAcl) {
//         // get the presets map from Redis
//         const list = await AclPresetRepo.list();
//         const presetsMap = Object.fromEntries(list.map((p) => [p.name, p.commands]));
//
//         const chosenPresets = Array.isArray(body.aclPresets) && body.aclPresets.length
//             ? body.aclPresets
//             : mapPermToPresets(permissions);
//
//         const extra = Array.isArray(body.aclExtra) ? body.aclExtra : [];
//
//         try {
//             const res = await applyAclForService({
//                 projectId,
//                 serviceId,
//                 presetsMap,
//                 presets: chosenPresets,
//                 extra,
//                 dryRun: false,
//             });
//
//             return NextResponse.json({
//                 ok: true,
//                 binding: saved,
//                 _aclApplied: true,
//                 _acl: { username: res.username, secret: res.secret }, // покажем один раз
//             });
//         } catch (e) {
//             // binding is created but ACL was not applied
//             return NextResponse.json({
//                 ok: true,
//                 binding: saved,
//                 _aclApplied: false,
//                 _aclError: String(e),
//             });
//         }
//     }
//
//     // when auto-apply is not required we just return the binding
//     return NextResponse.json({ ok: true, binding: saved });
// }
//
//
// export async function GET(_req, { params }) {
//     const { id, nsId } = await params;
//     const items = await BindingRepo.list(id, nsId);
//     return NextResponse.json({ items });
// }
//
