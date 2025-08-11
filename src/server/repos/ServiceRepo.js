import { redis } from "../redis/client.js";

const IDX = (projectId) => `mm:idx:services:${projectId}`;
const KEY = (projectId, id) => `mm:service:${projectId}:${id}`;

export const ServiceRepo = {
    async list(projectId) {
        const ids = await redis.smembers(IDX(projectId));
        if (!ids.length) return [];
        const pipe = redis.pipeline();
        ids.forEach(id => pipe.get(KEY(projectId, id)));
        const res = await pipe.exec();
        return res.map(([,v])=>v?JSON.parse(v):null).filter(Boolean);
    },
    async get(projectId, id) {
        const v = await redis.get(KEY(projectId, id));
        return v ? JSON.parse(v) : null;
    },
    async create(svc) {
        await redis.multi()
            .set(KEY(svc.projectId, svc.id), JSON.stringify(svc))
            .sadd(IDX(svc.projectId), svc.id)
            .exec();
        return svc;
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
    }
};
