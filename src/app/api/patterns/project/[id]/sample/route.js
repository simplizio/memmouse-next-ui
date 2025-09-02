export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { redis } from "@/server/redis/client.js";

export async function POST(req, { params }) {
    await params; // проект пока не используем
    const { pattern, limit = 50 } = await req.json().catch(() => ({}));
    if (!pattern) return NextResponse.json({ error: "pattern required" }, { status: 400 });

    const out = []; let cursor = "0"; let steps = 0;
    do {
        const res = await redis.scan(cursor, "MATCH", pattern, "COUNT", 500);
        cursor = String(res[0]);
        const keys = res[1] || [];
        for (const k of keys) {
            const t = await redis.type(k).catch(() => "unknown");
            out.push({ key: k, type: t });
            if (out.length >= limit) break;
        }
        steps++;
        if (out.length >= limit || steps > 50) break;
    } while (cursor !== "0");

    return NextResponse.json({ items: out });
}

