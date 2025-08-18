export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { BindingRepo } from "@/server/repos/BindingRepo.js";
import { NamespaceRepo } from "@/server/repos/NamespaceRepo.js";
import { ServiceRepo } from "@/server/repos/ServiceRepo.js";
import { AclPresetRepo } from "@/server/repos/AclPresetRepo.js";
import { applyAclForService } from "@/server/services/applyAcl.js";

const PERMS = new Set(["R", "W", "RW"]);
const MAX_PATTERNS = 32;
const MAX_PATTERN_LEN = 256;

// Let's allow using letters/numbers and basic symbols for redis keys and also a glob '*'
const PATTERN_RE = /^[A-Za-z0-9:_\-\.\{\}\[\]\*]+$/;

function bad(status, msg, details) {
    return NextResponse.json({ error: msg, details }, { status });
}

function coerceInt(v, def = 0) {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : def;
}

function sanitizePatterns(patterns) {
    const arr = (patterns || [])
        .map((s) => String(s).trim())
        .filter(Boolean);
    if (arr.length > MAX_PATTERNS) arr.length = MAX_PATTERNS;
    return arr;
}

function validatePatterns(patterns) {
    if (!patterns.length) return { ok: false, reason: "empty" };
    for (const p of patterns) {
        if (p.length > MAX_PATTERN_LEN) return { ok: false, reason: "too_long", pattern: p };
        if (!PATTERN_RE.test(p)) return { ok: false, reason: "bad_chars", pattern: p };
    }
    return { ok: true };
}

function mapPermToPresets(p) {
    const x = String(p || "R").toUpperCase();
    if (x === "RW") return ["kv_rw", "metrics"];
    if (x === "W")  return ["kv_write", "metrics"];
    return ["kv_read", "metrics"];
}

export async function POST(req, { params }) {
    const { id: projectId, nsId } = await params;

    let body;
    try {
        body = await req.json();
    } catch {
        return bad(400, "invalid JSON");
    }

    // 1) basic fields validation
    const serviceId = (body.serviceId || "").trim();
    const serviceName = (body.serviceName || "").trim();
    const permissions = String(body.permissions || "R").toUpperCase();
    const rate = {
        readRps: coerceInt(body?.rate?.readRps, 0),
        writeRps: coerceInt(body?.rate?.writeRps, 0),
    };
    const applyAcl = !!body.applyAcl;

    if (!serviceId) return bad(400, "serviceId required");
    if (!PERMS.has(permissions)) return bad(400, "permissions must be R | W | RW", { permissions });

    // 2) check if namespace and service exist
    const [ns, svc] = await Promise.all([
        NamespaceRepo.get(projectId, nsId),
        ServiceRepo.get(projectId, serviceId),
    ]);
    if (!ns) return bad(404, "namespace not found", { projectId, nsId });
    if (!svc) return bad(404, "service not found", { projectId, serviceId });

    // 3) Patterns: either from bidy, or fallback to the namespace prefix + '*'
    let patterns = sanitizePatterns(body.patterns);
    if (!patterns.length && ns?.prefix) patterns = [`${ns.prefix}*`];

    const patCheck = validatePatterns(patterns);
    if (!patCheck.ok) return bad(400, "invalid key patterns", patCheck);

    // 4) Scopes (optional - just normalizing into array of strings)
    const scopes = Array.isArray(body.scopes)
        ? body.scopes.map((s) => String(s).trim()).filter(Boolean)
        : [];

    // 5) saving the binding
    const saved = await BindingRepo.upsert({
        projectId,
        nsId,
        serviceId,
        serviceName: serviceName || svc.name || serviceId,
        permissions,
        patterns,
        scopes,
        rate,
        // saving chosen ACL parameters (if received any)
        aclPresets: Array.isArray(body.aclPresets) ? body.aclPresets : undefined,
        aclExtra: Array.isArray(body.aclExtra) ? body.aclExtra : undefined,
    });

    // 6) (optional) auto apply ACL
    if (applyAcl) {
        // get the presets map from Redis
        const list = await AclPresetRepo.list();
        const presetsMap = Object.fromEntries(list.map((p) => [p.name, p.commands]));

        const chosenPresets = Array.isArray(body.aclPresets) && body.aclPresets.length
            ? body.aclPresets
            : mapPermToPresets(permissions);

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
                binding: saved,
                _aclApplied: true,
                _acl: { username: res.username, secret: res.secret }, // покажем один раз
            });
        } catch (e) {
            // binding is created but ACL was not applied
            return NextResponse.json({
                ok: true,
                binding: saved,
                _aclApplied: false,
                _aclError: String(e),
            });
        }
    }

    // when auto-apply is not required we just return the binding
    return NextResponse.json({ ok: true, binding: saved });
}


export async function GET(_req, { params }) {
    const { id, nsId } = await params;
    const items = await BindingRepo.list(id, nsId);
    return NextResponse.json({ items });
}

// export const runtime = "nodejs";
//
// import { NextResponse } from "next/server";
// import { BindingRepo } from "@/server/repos/BindingRepo.js";
// import { applyAclForService } from "@/server/services/applyAcl.js";
//
// export async function GET(_req, { params }) {
//     const { id, nsId } = await params;
//     const items = await BindingRepo.list(id, nsId);
//     return NextResponse.json({ items });
// }
//
// export async function POST(req, { params }) {
//     const { id, nsId } = await params;
//     const body = await req.json(); // { serviceId, serviceName, permissions, patterns[] }
//     const saved = await BindingRepo.upsert({
//         ...body,
//         projectId: id,
//         nsId,
//         aclPresets: Array.isArray(body.aclPresets) ? body.aclPresets : undefined,
//         aclExtra: Array.isArray(body.aclExtra) ? body.aclExtra : undefined,
//         updatedAt: Date.now(),
//     });
//     //return NextResponse.json(saved, { status: 201 });
//
//     // опционально сразу применим ACL к сервису
//     if (body.applyAcl) {
//         const presets = Array.isArray(body.aclPresets) ? body.aclPresets : mapPermToPresets(saved.permissions);
//         const extra   = Array.isArray(body.aclExtra) ? body.aclExtra : [];
//         try {
//             const r = await applyAclForService({ projectId: id, serviceId: saved.serviceId, presets, extra, dryRun: false });
//             return NextResponse.json({ ...saved, _aclApplied: true, _acl: { username: r.username, secret: r.secret } });
//         } catch (e) {
//             // не падаем — биндинг создан; просто сообщим об ошибке ACL
//             return NextResponse.json({ ...saved, _aclApplied: false, _aclError: String(e) });
//         }
//     }
//     return NextResponse.json(saved, { status: 201 });
// }
