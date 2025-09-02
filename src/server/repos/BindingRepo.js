import { redis } from "../redis/client.js";

const IDX_NS = (projectId, nsId) => `mm:idx:bindings:${projectId}:${nsId}`;               // serviceId[]
const IDX_SVC = (projectId, serviceId) => `mm:idx:bindings_by_service:${projectId}:${serviceId}`; // nsId[]
const KEY_BIND = (projectId, nsId, serviceId) => `mm:binding:${projectId}:${nsId}:${serviceId}`;

function normPerm(input) {
    if (!input) return { read: true, write: true };
    if (typeof input === "string") {
        const u = input.toUpperCase();
        return { read: u.includes("R"), write: u.includes("W") };
    }
    return { read: !!input.read, write: !!input.write };
}

export const BindingRepo = {
    async list(projectId, nsId) {
        const ids = await redis.smembers(IDX_NS(projectId, nsId));
        if (!ids.length) return [];
        const pipe = redis.pipeline();
        ids.forEach((sid) => pipe.get(KEY_BIND(projectId, nsId, sid)));
        const res = await pipe.exec();
        return res.map(([, v]) => (v ? JSON.parse(v) : null)).filter(Boolean);
    },


    async get(projectId, nsId, serviceId) {
        const key = KEY_BIND(projectId, nsId, serviceId);
        const j = await redis.get(key);
        return j ? JSON.parse(j) : null;
    },

    async upsert(projectId, nsId, serviceId, patch) {
        const key = KEY_BIND(projectId, nsId, serviceId);
        const prev = await this.get(projectId, nsId, serviceId);

        // если patch.keyPatterns задан → трактуем как полный список (PUT semantics)
        const nextKeyPatterns = Array.isArray(patch?.keyPatterns) ?
            Array.from(new Set(patch.keyPatterns.map(String)))
                    :
            (prev?.keyPatterns || []);

        const next = {
            projectId, nsId, serviceId,
            // keyPatterns: Array.from(new Set([...(prev?.keyPatterns || []), ...(patch?.keyPatterns || [])])),
            keyPatterns: nextKeyPatterns,
            permissions: normPerm(patch?.permissions ?? prev?.permissions ?? "RW"),
            rate: { ...(prev?.rate || {}), ...(patch?.rate || {}) },
            bandwidth: { ...(prev?.bandwidth || {}), ...(patch?.bandwidth || {}) },
            createdAt: prev?.createdAt || Date.now(),
            updatedAt: Date.now(),
        };

        console.log(JSON.stringify(next));

        await redis.set(key, JSON.stringify(next));
        // оба индекса
        await redis.sadd(IDX_SVC(projectId, serviceId), nsId);
        await redis.sadd(IDX_NS(projectId, nsId), serviceId);

        return next;
    },

    async remove(projectId, nsId, serviceId) {
        await redis
            .multi()
            .del(KEY_BIND(projectId, nsId, serviceId))
            .srem(IDX_NS(projectId, nsId), serviceId)
            .srem(IDX_SVC(projectId, serviceId), nsId)
            .exec();
    },

    async listByService(projectId, serviceId) {
        const nsIds = await redis.smembers(IDX_SVC(projectId, serviceId));
        if (!nsIds?.length) return [];
        const keys = nsIds.map(nsId => KEY_BIND(projectId, nsId, serviceId));
        const rows = await redis.mget(keys);
        const out = [];
        rows.forEach((v, i) => {
            if (!v) return;
            const b = JSON.parse(v);
            out.push(b);
        });
        return out;
    },

    async listByNamespace(projectId, nsId) {
        const serviceIds = await redis.smembers(IDX_NS(projectId, nsId));
        if (!serviceIds?.length) return [];
        const keys = serviceIds.map(svc => KEY_BIND(projectId, nsId, svc));
        const rows = await redis.mget(keys);
        const out = [];
        rows.forEach((v) => {
            if (!v) return;
            out.push(JSON.parse(v));
        });
        return out;
    },

};
