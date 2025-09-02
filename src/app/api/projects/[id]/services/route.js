// src/app/api/projects/[id]/services/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ulid } from "ulidx";
import { ServiceRepo } from "@/server/repos/ServiceRepo.js";
import { makeToken } from "@/server/repos/makeToken.js"; // <-- поправь путь, если иной
import { BindingRepo } from "@/server/repos/BindingRepo.js";
import { redis } from "@/server/redis/client.js";

export async function POST(req, { params }) {
    const { id: projectId } = await params;
    const body = await req.json().catch(() => ({}));

    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    console.log(JSON.stringify(body));

    const now = Date.now();
    const service = {
        projectId,
        id: (body.id && String(body.id).trim()) || ulid(),
        name,
        description: body.description ? String(body.description) : undefined,
        scopes: Array.isArray(body.scopes) ? body.scopes : [],
        desiredAcl: (body.desiredAcl && typeof body.desiredAcl === "object")
            ? {
                presets: Array.isArray(body.desiredAcl.presets) ? body.desiredAcl.presets : [],
                extra: Array.isArray(body.desiredAcl.extra) ? body.desiredAcl.extra : [],
            }
            : { presets: [], extra: [] },
        tokens: [{ id: "t1", value: makeToken(), createdAt: now, status: "active" }],
        createdAt: now,
        updatedAt: now,
    };

    const saved = await (ServiceRepo.upsert ? ServiceRepo.upsert(service) : ServiceRepo.create(service));
    return NextResponse.json({ service: saved }, { status: 201 });
}


export async function GET(_req, { params }) {
    const { id } = await params;
    const res = await ServiceRepo.list(id).catch(() => ({ items: [] }));
    const items = Array.isArray(res) ? res : (res?.items || []);
    return NextResponse.json({ items });
}


// best-effort: drop redis user if exists
async function dropAclUsers(projectId, service) {
    const candidates = new Set();
    // default name which we create in apply ACL
    candidates.add(`svc:${projectId}:${service.id}`);

    // if we ever saved explicit username - let's try too
    if (service.redisUser) candidates.add(service.redisUser);

    for (const u of candidates) {
        try { await redis.acl("DELUSER", u); } catch (_) { /* ignore */ }
    }
}

// best-effort: count our service keys (metrics/hashes/configs) using pattern
async function scanDel(pattern) {
    let cursor = "0";
    do {
        const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 500);
        cursor = next;
        if (keys?.length) {
            const pipe = redis.pipeline();
            keys.forEach(k => pipe.del(k));
            await pipe.exec();
        }
    } while (cursor !== "0");
}

export async function DELETE(_req, { params }) {
    const { id: projectId, serviceId } = await params;

    const svc = await ServiceRepo.get(projectId, serviceId);
    if (!svc) return NextResponse.json({ ok: true, deleted: false }); // idempotent

    // 1) delete ACL user(s)
    await dropAclUsers(projectId, svc);

    // 2) unbind all service bindings (and indexes)
    const nsIds = await BindingRepo.listByService(projectId, serviceId).catch(() => []);
    for (const nsId of nsIds) {
        try { await BindingRepo.remove(projectId, nsId, serviceId); } catch (_) {}
    }

    // 3) cleanup service keys (not the business data!):
    //    metrics, configs, events - we can extend the list of patterns here
    await scanDel(`mm:metrics:svc:${projectId}:${serviceId}:*`);
    await scanDel(`mm:events:svc:${projectId}:${serviceId}:*`);
    await scanDel(`mm:cfg:svc:${projectId}:${serviceId}*`);

    // 4) delete the service (and its indexes)
    await ServiceRepo.remove(projectId, serviceId);

    return NextResponse.json({ ok: true, deleted: true });
}
