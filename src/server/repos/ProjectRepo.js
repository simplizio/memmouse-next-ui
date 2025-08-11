import { redis } from "../redis/client.js";

const IDX = "mm:idx:projects";
const KEY = (id) => `mm:project:${id}`;

export const ProjectRepo = {
    async list() {
        const ids = await redis.smembers(IDX);
        if (!ids.length) return [];
        const pipeline = redis.pipeline();
        ids.forEach((id) => pipeline.get(KEY(id)));
        const res = await pipeline.exec();
        return res.map(([, v]) => (v ? JSON.parse(v) : null)).filter(Boolean);
    },
    async get(id) {
        const raw = await redis.get(KEY(id));
        return raw ? JSON.parse(raw) : null;
    },
    async create(p) {
        await redis
            .multi()
            .set(KEY(p.id), JSON.stringify(p))
            .sadd(IDX, p.id)
            .exec();
        return p;
    },
    async patch(id, data) {
        const cur = await ProjectRepo.get(id);
        if (!cur) return null;
        const next = { ...cur, ...data, updatedAt: Date.now() };
        await redis.set(KEY(id), JSON.stringify(next));
        return next;
    },
    async remove(id) {
        await redis.multi().del(KEY(id)).srem(IDX, id).exec();
    },
};