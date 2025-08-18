import { redis } from "../redis/client.js";

const IDX_NS = (projectId, nsId) => `mm:idx:bindings:${projectId}:${nsId}`;               // serviceId[]
const IDX_SVC = (projectId, serviceId) => `mm:idx:bindings_by_service:${projectId}:${serviceId}`; // nsId[]
const KEY     = (projectId, nsId, serviceId) => `mm:binding:${projectId}:${nsId}:${serviceId}`;

// const BIND_KEY = (p, ns, s) => `mm:binding:${p}:${ns}:${s}`;
// const NS_IDX   = (p, ns)     => `mm:idx:bindings:ns:${p}:${ns}`;
// const SVC_IDX  = (p, s)      => `mm:idx:bindings:svc:${p}:${s}`;

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

    // async remove(projectId, nsId, serviceId) {
    //     await redis
    //         .multi()
    //         .del(KEY(projectId, nsId, serviceId))
    //         .srem(IDX_NS(projectId, nsId), serviceId)
    //         .srem(IDX_SVC(projectId, serviceId), nsId)
    //         .exec();
    // },

    // async remove(projectId, nsId, serviceId) {
    //     const pipe = redis.pipeline();
    //     pipe.del(BIND_KEY(projectId, nsId, serviceId));
    //     pipe.srem(NS_IDX(projectId, nsId), serviceId);
    //     pipe.srem(SVC_IDX(projectId, serviceId), nsId);
    //     await pipe.exec();
    // },

    // new: quickly get nsId list for the service
    async listNamespacesForService(projectId, serviceId) {
        return await redis.smembers(IDX_SVC(projectId, serviceId));
    },

    async listForNamespace(projectId, nsId) {
        return await redis.smembers(IDX_NS(projectId,nsId));
    },


};
