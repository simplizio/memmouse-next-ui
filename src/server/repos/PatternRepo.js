import { redis } from "@/server/redis/client.js";
import { NamespaceRepo } from "@/server/repos/NamespaceRepo.js";

const KEY = (projectId, nsId) => `mm:patterns:proj:${projectId}:ns:${nsId}`;

function norm(p) {
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
const uniq = (arr) => Array.from(new Set((arr || []).map(norm).filter(Boolean)));

export const PatternRepo = {
    async list(projectId, nsId) {
        const items = await redis.smembers(KEY(projectId, nsId));
        return (items || []).sort();
    },

    async add(projectId, nsId, patterns = []) {
        const list = uniq(patterns);
        if (list.length) await redis.sadd(KEY(projectId, nsId), ...list);
        return this.list(projectId, nsId);
    },

    async set(projectId, nsId, patterns = []) {
        await redis.del(KEY(projectId, nsId));
        return this.add(projectId, nsId, patterns);
    },

    async remove(projectId, nsId, pattern) {
        if (!pattern || pattern === "*") {
            await redis.del(KEY(projectId, nsId));
            return [];
        }
        await redis.srem(KEY(projectId, nsId), norm(pattern));
        return this.list(projectId, nsId);
    },

    // dev-утилита: оставить только «канонический» префикс ns:* для каждого NS
    async cleanupToCanonical(projectId) {
        const namespaces = await NamespaceRepo.list(projectId);
        let touched = 0;
        for (const ns of namespaces) {
            const base = String(ns.prefix || ns.name || ns.id).replace(/[:*]+/g, "");
            const canonical = base ? `${base}:*` : "";
            await this.set(projectId, ns.id, canonical ? [canonical] : []);
            touched++;
        }
        return touched;
    },
};
