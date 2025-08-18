import { redis } from "@/server/redis/client.js";

const IDX = "mm:idx:acl:presets";
const KEY = (name) => `mm:acl:preset:${name}`;

export const DefaultAclPresets = {
    kv_read:  ["+get","+mget","+exists","+ttl","+pttl"],
    kv_write: ["+set","+mset","+del","+unlink","+expire","+pexpire"],
    kv_rw:    ["+get","+mget","+exists","+ttl","+pttl","+set","+mset","+del","+unlink","+expire","+pexpire"],
    hash_rw:  ["+hget","+hmget","+hset","+hdel","+hlen","+hkeys","+hvals"],
    x_prod:   ["+xadd"],
    x_cons:   ["+xread","+xreadgroup","+xack","+xpending"],
    pub:      ["+publish"],
    sub:      ["+subscribe","+psubscribe","+unsubscribe","+punsubscribe"],
    metrics:  ["+ping","+info","+time"],
    admin_ro: ["+scan","+type","+memory","+ttl","+pttl"],
};

export const AclPresetRepo = {
    async list() {
        const names = await redis.smembers(IDX);
        if (!names?.length) return [];
        const pipe = redis.pipeline();
        names.forEach(n => pipe.get(KEY(n)));
        const res = await pipe.exec();
        return res.map(([_, s]) => {
            try { const j = JSON.parse(s); return j && j.name ? j : null; } catch { return null; }
        }).filter(Boolean);
    },

    async upsert({ name, commands, description = "", builtin = false }) {
        const rec = { name, commands, description, builtin: !!builtin };
        await redis.multi()
            .set(KEY(name), JSON.stringify(rec))
            .sadd(IDX, name)
            .exec();
        // await redis.sadd(IDX, name);
        // await redis.set(KEY(name), JSON.stringify(rec));
        return rec;
    },

    async get(name) {
        const s = await redis.get(KEY(name));
        return s ? JSON.parse(s) : null;
    },

    async remove(name) {
        await redis.del(KEY(name));
        await redis.srem(IDX, name);
    },

    async ensureDefaults() {
        const existing = new Set(await redis.smembers(IDX));
        const pipe = redis.pipeline();
        for (const [name, commands] of Object.entries(DefaultAclPresets)) {
            if (!existing.has(name)) {
                pipe.sadd(IDX, name);
                pipe.set(KEY(name), JSON.stringify({ name, commands, description: "", builtin: true }));
            }
        }
        // await pipe.exec();
        if (pipe.length) await pipe.exec();
        return this.list();
    },
};
