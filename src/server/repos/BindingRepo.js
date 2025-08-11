import { redis } from "../redis/client.js";

const IDX = (projectId, nsId) => `mm:idx:bindings:${projectId}:${nsId}`;
const KEY = (projectId, nsId, serviceId) => `mm:binding:${projectId}:${nsId}:${serviceId}`;

export const BindingRepo = {
    async list(projectId, nsId) {
        const ids = await redis.smembers(IDX(projectId, nsId));
        if (!ids.length) return [];
        const pipeline = redis.pipeline();
        ids.forEach((sid) => pipeline.get(KEY(projectId, nsId, sid)));
        const res = await pipeline.exec();
        return res.map(([, v]) => (v ? JSON.parse(v) : null)).filter(Boolean);
    },
    async get(projectId, nsId, serviceId) {
        const v = await redis.get(KEY(projectId, nsId, serviceId));
        return v ? JSON.parse(v) : null;
    },
    async upsert(binding) {
        const { projectId, nsId, serviceId } = binding;
        await redis
            .multi()
            .set(KEY(projectId, nsId, serviceId), JSON.stringify(binding))
            .sadd(IDX(projectId, nsId), serviceId)
            .exec();
        return binding;
    },
    async remove(projectId, nsId, serviceId) {
        await redis
            .multi()
            .del(KEY(projectId, nsId, serviceId))
            .srem(IDX(projectId, nsId), serviceId)
            .exec();
    },
};
