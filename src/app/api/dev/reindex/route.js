export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { redis } from "@/server/redis/client.js";

async function dropReverse() {
    let cursor = "0", dropped = 0;
    do {
        const [next, keys] = await redis.scan(cursor, "MATCH", "mm:idx:bindings_by_service:*", "COUNT", 1000);
        cursor = next;
        if (keys.length) { dropped += keys.length; await redis.del(...keys); }
    } while (cursor !== "0");
    return dropped;
}

async function reindex({ pattern = "mm:binding:*", drop = false } = {}) {
    if (drop) await dropReverse();

    // Map "projectId:serviceId" => Set(nsId)
    const map = new Map();
    let cursor = "0", scanned = 0;
    do {
        const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 1000);
        cursor = next;
        scanned += keys.length;
        for (const k of keys) {
            // k = mm:binding:{projectId}:{nsId}:{serviceId}
            const parts = k.split(":");
            if (parts.length !== 5) continue;
            const projectId = parts[2], nsId = parts[3], serviceId = parts[4];
            const key = `${projectId}:${serviceId}`;
            if (!map.has(key)) map.set(key, new Set());
            map.get(key).add(nsId);
        }
    } while (cursor !== "0");

    // Write reverse index
    let createdKeys = 0, totalPairs = 0;
    const pipe = redis.pipeline();
    for (const [ps, nsSet] of map.entries()) {
        const [projectId, serviceId] = ps.split(":");
        const idxKey = `mm:idx:bindings_by_service:${projectId}:${serviceId}`;
        const nsIds = Array.from(nsSet);
        if (nsIds.length) {
            pipe.sadd(idxKey, ...nsIds);
            createdKeys += 1;
            totalPairs += nsIds.length;
        }
    }
    if (createdKeys) await pipe.exec();

    return { scannedBindings: scanned, servicesIndexed: map.size, createdKeys, pairs: totalPairs, dropped: drop };
}

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "1";
    const drop  = searchParams.get("drop") === "1";
    const pattern = searchParams.get("pattern") || "mm:binding:*";

    if (process.env.NODE_ENV === "production" && !force) {
        return NextResponse.json({ error: "forbidden in production (use ?force=1)" }, { status: 403 });
    }

    const res = await reindex({ pattern, drop });
    return NextResponse.json({ ok: true, ...res });
}

export async function POST(req) {
    const body = await req.json().catch(() => ({}));
    const { force = false, drop = false, pattern = "mm:binding:*" } = body;
    if (process.env.NODE_ENV === "production" && !force) {
        return NextResponse.json({ error: "forbidden in production (use force=true)" }, { status: 403 });
    }
    const res = await reindex({ pattern, drop });
    return NextResponse.json({ ok: true, ...res });
}
