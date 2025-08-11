// src/server/scripts/reindexBindings.js (launch manually using route or node)
import { redis } from "@/server/redis/client.js";

export async function reindexBindings() {
    let cursor = "0";
    do {
        const [next, keys] = await redis.scan(cursor, "MATCH", "mm:binding:*", "COUNT", 1000);
        cursor = next;
        for (const k of keys) {
            // k = mm:binding:{projectId}:{nsId}:{serviceId}
            const [, , projectId, nsId, serviceId] = k.split(":");
            await redis.sadd(`mm:idx:bindings_by_service:${projectId}:${serviceId}`, nsId);
        }
    } while (cursor !== "0");
}
