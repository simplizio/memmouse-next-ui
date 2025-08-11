import { redis } from "../redis/client.js";

const IDX = (projectId) => `mm:idx:namespaces:${projectId}`;
const KEY = (projectId, id) => `mm:namespace:${projectId}:${id}`;

export const NamespaceRepo = {
    async list(projectId) {
        const ids = await redis.smembers(IDX(projectId));
        if (!ids.length) return [];
        const pipeline = redis.pipeline();
        ids.forEach((id) => pipeline.get(KEY(projectId, id)));
        const res = await pipeline.exec();
        return res.map(([, v]) => (v ? JSON.parse(v) : null)).filter(Boolean);
    },

    async get(projectId, id) {
        const raw = await redis.get(KEY(projectId, id));
        return raw ? JSON.parse(raw) : null;
    },

    async create(ns) {
        // ns: { projectId, id, ... }
        await redis
            .multi()
            .set(KEY(ns.projectId, ns.id), JSON.stringify(ns))
            .sadd(IDX(ns.projectId), ns.id)
            .exec();
        return ns;
    },

    async patch(projectId, id, data) {
        const cur = await this.get(projectId, id);
        if (!cur) return null;
        const next = { ...cur, ...data, updatedAt: Date.now() };
        await redis.set(KEY(projectId, id), JSON.stringify(next));
        return next;
    },

    async remove(projectId, id) {
        await redis.multi().del(KEY(projectId, id)).srem(IDX(projectId), id).exec();
    },
};
