import { redis } from "@/server/redis/client.js";
import {makeToken} from "@/server/repos/makeToken";

const SVC_KEY = (p, id) => `mm:service:${p}:${id}`;
const SVC_IDX = (p) => `mm:idx:services:${p}`;
const SVC_BY_NAME = (p) => `mm:idx:serviceByName:${p}`; // Hash: name -> id

function mergeService(prev, patch) {
    const base = (prev && typeof prev === "object") ? prev : {};
    const p    = (patch && typeof patch === "object") ? patch : {};
    const out  = { ...base, ...p };

    // do not overwrite arrays if there's no arrays in patch
    if (p.tokens === undefined && base.tokens) out.tokens = base.tokens;
    if (p.scopes === undefined && base.scopes) out.scopes = base.scopes;

    // ACL мерджим аккуратно
    if (p.acl && typeof p.acl === "object" && !Array.isArray(p.acl)) {
        out.acl = { ...(base.acl || {}), ...p.acl };
    } else if (base.acl) {
        out.acl = base.acl;
    }

    return out;
}

// function mergeService(prev = {}, patch = {}) {
//     const out = { ...prev, ...patch };
//     // do not overwrite arrays if there's no arrays in patch
//     if (patch.tokens === undefined && prev.tokens) out.tokens = prev.tokens;
//     if (patch.scopes === undefined && prev.scopes) out.scopes = prev.scopes;
//
//     // merging ACL subtree
//     if (patch.acl) out.acl = { ...(prev.acl || {}), ...patch.acl };
//     else if (prev.acl) out.acl = prev.acl;
//     return out;
// }

// merge without overwriting the arrays and with accurate ACL
function mergeForPatch(prev = {}, patch = {}) {
    const out = { ...prev };

    for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) continue;              // не трогаем, если поле не прислали

        if (k === "acl" && v && typeof v === "object" && !Array.isArray(v)) {
            out.acl = { ...(prev.acl || {}), ...v };  // глубокий мердж ACL
            continue;
        }

        // if in prev it was an array - than change only if new value was sent explicitly
        if (Array.isArray(prev[k])) {
            out[k] = Array.isArray(v) ? v : prev[k];
            continue;
        }

        out[k] = v;                                 // scalars/objects
    }

    // system fields
    out.createdAt = prev.createdAt ?? out.createdAt ?? Date.now();
    out.updatedAt = Date.now();

    return out;
}

export const ServiceRepo = {
    async get(projectId, id) {
        const s = await redis.get(SVC_KEY(projectId, id));
        return s ? JSON.parse(s) : null;
    },

    async findByName(projectId, name) {
        const id = await redis.hget(SVC_BY_NAME(projectId), name);
        if (id) return this.get(projectId, id);
        // fallback (медленнее): пройдёмся по списку
        const list = await this.list(projectId);
        return list.find((x) => x.name === name) || null;
    },

    async list(projectId) {
        const ids = await redis.smembers(SVC_IDX(projectId));
        if (!ids?.length) return [];
        const pipe = redis.pipeline();
        ids.forEach((id) => pipe.get(SVC_KEY(projectId, id)));
        const res = await pipe.exec();
        return res
            .map(([_, v]) => {
                try { return v ? JSON.parse(v) : null; } catch { return null; }
            })
            .filter(Boolean);
    },

    async upsert(obj) {
        const { projectId, id, name } = obj || {};
        if (!projectId || !id) throw new Error("ServiceRepo.upsert: projectId and id are required");

        const prev = await this.get(projectId, id);
        const now = Date.now();
        const next = mergeService(prev, { ...obj, updatedAt: now, createdAt: prev?.createdAt || obj?.createdAt || now });
        next.createdAt = prev?.createdAt ?? obj?.createdAt ?? now;

        await redis
            .multi()
            .set(SVC_KEY(projectId, id), JSON.stringify(next))
            .sadd(SVC_IDX(projectId), id)
            .hset(SVC_BY_NAME(projectId), String(name || id), id)
            .exec();

        return next;
    },

    async create(obj) {
        return this.upsert(obj); // alias
    },

    async patch(projectId, id, data) {
        const cur = await this.get(projectId, id);
        if (!cur) return null;

        const next = mergeForPatch(cur, data);

        // if name was changed - let's refresh index by name and remove an old record
        const oldName = String(cur.name || id);
        const newName = String(next.name || id);

        const pipe = redis.multi();
        pipe.set(SVC_KEY(projectId, id), JSON.stringify(next));
        pipe.sadd(SVC_IDX(projectId), id);
        if (newName !== oldName) {
            pipe.hdel(SVC_BY_NAME(projectId), oldName);
        }
        pipe.hset(SVC_BY_NAME(projectId), newName, id);
        await pipe.exec();

        return next;
    },

    async remove(projectId, id) {
        const svc = await this.get(projectId, id);
        await redis
            .multi()
            .del(SVC_KEY(projectId, id))
            .srem(SVC_IDX(projectId), id)
            .hdel(SVC_BY_NAME(projectId), String(svc?.name || id))
            .exec();
    },

    // --- TOKENS ---------------------------------------------------------------

    async addToken(projectId, serviceId, { id, value, status = "active", meta } = {}) {
        const svc = await this.get(projectId, serviceId);
        if (!svc) throw new Error("Service not found");
        const now = Date.now();

        const token = {
            id: id || `t_${now}`,
            value: value || makeToken(),
            status,
            createdAt: now,
            ...(meta ? { meta } : {}),
        };

        const tokens = Array.isArray(svc.tokens) ? [...svc.tokens] : [];
        // уникальность по id
        if (tokens.some(t => t.id === token.id)) {
            throw new Error("Token id already exists");
        }
        tokens.unshift(token); // новый — первым

        const saved = await this.upsert({ ...svc, tokens });
        return token; // возвращаем только созданный
    },

    async revokeToken(projectId, serviceId, tokenId) {
        const svc = await this.get(projectId, serviceId);
        if (!svc) throw new Error("Service not found");
        const tokens = Array.isArray(svc.tokens) ? [...svc.tokens] : [];
        const idx = tokens.findIndex(t => t.id === tokenId);
        if (idx === -1) throw new Error("Token not found");
        if (tokens[idx].status !== "revoked") {
            tokens[idx] = { ...tokens[idx], status: "revoked", revokedAt: Date.now() };
        }
        await this.upsert({ ...svc, tokens });
        return true;
    },

    async purgeToken(projectId, serviceId, tokenId) {
        const svc = await this.get(projectId, serviceId);
        if (!svc) throw new Error("Service not found");
        const tokens = Array.isArray(svc.tokens) ? svc.tokens.filter(t => t.id !== tokenId) : [];
        if (tokens.length === svc.tokens?.length) throw new Error("Token not found");
        await this.upsert({ ...svc, tokens });
        return true;
    },

    /**
     * Вращение токена: создаёт новый; опционально ревокает старый.
     * @returns { rotatedFrom, rotatedTo }
     */
    async rotateToken(projectId, serviceId, { fromTokenId = null, revokeOld = true } = {}) {
        const svc = await this.get(projectId, serviceId);
        if (!svc) throw new Error("Service not found");
        const now = Date.now();

        const tokens = Array.isArray(svc.tokens) ? [...svc.tokens] : [];
        let rotatedFrom = null;
        if (fromTokenId) {
            const idx = tokens.findIndex(t => t.id === fromTokenId);
            if (idx === -1) throw new Error("Token not found");
            rotatedFrom = tokens[idx];
            if (revokeOld && rotatedFrom.status !== "revoked") {
                tokens[idx] = { ...rotatedFrom, status: "revoked", revokedAt: now };
                rotatedFrom = tokens[idx];
            }
        }

        const rotatedTo = {
            id: `t_${now}`,
            value: makeToken(),
            status: "active",
            createdAt: now,
            rotatedFrom: rotatedFrom?.id || null,
        };
        tokens.unshift(rotatedTo);

        await this.upsert({ ...svc, tokens });
        return { rotatedFrom, rotatedTo };
    },

    // --- SCOPES ---------------------------------------------------------------

    async addScope(projectId, serviceId, scope) {
        const s = String(scope || "").trim();
        if (!s) return false;
        const svc = await this.get(projectId, serviceId);
        if (!svc) throw new Error("Service not found");
        const scopes = new Set(Array.isArray(svc.scopes) ? svc.scopes : []);
        scopes.add(s);
        await this.upsert({ ...svc, scopes: Array.from(scopes) });
        return true;
    },

    async removeScope(projectId, serviceId, scope) {
        const s = String(scope || "").trim();
        const svc = await this.get(projectId, serviceId);
        if (!svc) throw new Error("Service not found");
        const scopes = (Array.isArray(svc.scopes) ? svc.scopes : []).filter(x => x !== s);
        await this.upsert({ ...svc, scopes });
        return true;
    },

    async setScopes(projectId, serviceId, scopes) {
        const arr = Array.isArray(scopes) ? scopes.map(x => String(x).trim()).filter(Boolean) : [];
        const svc = await this.get(projectId, serviceId);
        if (!svc) throw new Error("Service not found");
        await this.upsert({ ...svc, scopes: arr });
        return true;
    },
};


// import { redis } from "../redis/client.js";
//
// const IDX = (projectId) => `mm:idx:services:${projectId}`;
// const KEY = (projectId, id) => `mm:service:${projectId}:${id}`;
//
// const SVC_KEY = (p, s) => `mm:service:${p}:${s}`;
// const SVC_IDX = (p)    => `mm:idx:services:${p}`;
//
// export const ServiceRepo = {
//     async list(projectId) {
//         const ids = await redis.smembers(IDX(projectId));
//         if (!ids.length) return [];
//         const pipe = redis.pipeline();
//         ids.forEach(id => pipe.get(KEY(projectId, id)));
//         const res = await pipe.exec();
//         return res.map(([,v])=>v?JSON.parse(v):null).filter(Boolean);
//     },
//     async get(projectId, id) {
//         const v = await redis.get(KEY(projectId, id));
//         return v ? JSON.parse(v) : null;
//     },
//     async create(svc) {
//         await redis.multi()
//             .set(KEY(svc.projectId, svc.id), JSON.stringify(svc))
//             .sadd(IDX(svc.projectId), svc.id)
//             .exec();
//         return svc;
//     },
//     async patch(projectId, id, data) {
//         const cur = await this.get(projectId, id);
//         if (!cur) return null;
//         const next = { ...cur, ...data, updatedAt: Date.now() };
//         await redis.set(KEY(projectId, id), JSON.stringify(next));
//         return next;
//     },
//
//     // async remove(projectId, id) {
//     //     await redis.multi().del(KEY(projectId, id)).srem(IDX(projectId), id).exec();
//     // }
//
//     async remove(projectId, serviceId) {
//         const pipe = redis.pipeline();
//         pipe.del(SVC_KEY(projectId, serviceId));
//         pipe.srem(SVC_IDX(projectId), serviceId);
//         // если есть индекс по имени — убери и там
//         await pipe.exec();
//     },
// };
