import { redis } from "../redis/client.js";

const IDX_NS = (projectId, nsId) => `mm:idx:bindings:${projectId}:${nsId}`;               // serviceId[]
const IDX_SVC = (projectId, serviceId) => `mm:idx:bindings_by_service:${projectId}:${serviceId}`; // nsId[]
const KEY     = (projectId, nsId, serviceId) => `mm:binding:${projectId}:${nsId}:${serviceId}`;

export const BindingRepo = {
    async list(projectId, nsId) {
        const ids = await redis.smembers(IDX_NS(projectId, nsId));
        if (!ids.length) return [];
        const pipe = redis.pipeline();
        ids.forEach((sid) => pipe.get(KEY(projectId, nsId, sid)));
        const res = await pipe.exec();
        return res.map(([, v]) => (v ? JSON.parse(v) : null)).filter(Boolean);
    },

    async get(projectId, nsId, serviceId) {
        const v = await redis.get(KEY(projectId, nsId, serviceId));
        return v ? JSON.parse(v) : null;
    },

    async upsert(binding) {
        // binding: { projectId, nsId, serviceId, ... }
        const { projectId, nsId, serviceId } = binding;
        await redis
            .multi()
            .set(KEY(projectId, nsId, serviceId), JSON.stringify(binding))
            .sadd(IDX_NS(projectId, nsId), serviceId)   // для выборок по namespace
            .sadd(IDX_SVC(projectId, serviceId), nsId)  // для выборок по service
            .exec();
        return binding;
    },

    async remove(projectId, nsId, serviceId) {
        await redis
            .multi()
            .del(KEY(projectId, nsId, serviceId))
            .srem(IDX_NS(projectId, nsId), serviceId)
            .srem(IDX_SVC(projectId, serviceId), nsId)
            .exec();
    },

    // новое: быстро получить список nsId для сервиса
    async listNamespacesForService(projectId, serviceId) {
        return await redis.smembers(IDX_SVC(projectId, serviceId));
    },
};




// import { redis } from "../redis/client.js";
//
// const IDX = (projectId, nsId) => `mm:idx:bindings:${projectId}:${nsId}`;
// const KEY = (projectId, nsId, serviceId) => `mm:binding:${projectId}:${nsId}:${serviceId}`;
//
// export const BindingRepo = {
//     async list(projectId, nsId) {
//         const ids = await redis.smembers(IDX(projectId, nsId));
//         if (!ids.length) return [];
//         const pipeline = redis.pipeline();
//         ids.forEach((sid) => pipeline.get(KEY(projectId, nsId, sid)));
//         const res = await pipeline.exec();
//         return res.map(([, v]) => (v ? JSON.parse(v) : null)).filter(Boolean);
//     },
//     async get(projectId, nsId, serviceId) {
//         const v = await redis.get(KEY(projectId, nsId, serviceId));
//         return v ? JSON.parse(v) : null;
//     },
//     async upsert(binding) {
//         const { projectId, nsId, serviceId } = binding;
//         await redis
//             .multi()
//             .set(KEY(projectId, nsId, serviceId), JSON.stringify(binding))
//             .sadd(IDX(projectId, nsId), serviceId)
//             .exec();
//         return binding;
//     },
//     async remove(projectId, nsId, serviceId) {
//         await redis
//             .multi()
//             .del(KEY(projectId, nsId, serviceId))
//             .srem(IDX(projectId, nsId), serviceId)
//             .exec();
//     },
// };
