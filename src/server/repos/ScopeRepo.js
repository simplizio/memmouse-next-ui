import { redis } from "@/server/redis/client.js";

const KEY = "mm:scopes";
const DEFAULTS = [
    { name: "kv.read",           title: "KV Read",            desc: "Read-only KV access.",
        defaultPresets: ["kv_read", "metrics"], extra: [] },
    { name: "kv.write",          title: "KV Write",           desc: "Read & write KV.",
        defaultPresets: ["kv_rw", "metrics"],   extra: [] },
    { name: "metrics",           title: "Metrics Only",       desc: "Ping, info, time.",
        defaultPresets: ["metrics"],            extra: [] },
    { name: "streams.consumer",  title: "Streams Consumer",   desc: "XREAD/GROUP/ACK.",
        defaultPresets: ["x_cons"],             extra: [] },
    { name: "streams.producer",  title: "Streams Producer",   desc: "XADD/XTRIM.",
        defaultPresets: ["x_prod"],             extra: [] },
];

export const ScopeRepo = {
    async ensureDefaults() {
        const raw = await redis.get(KEY);
        if (raw) return JSON.parse(raw);
        await redis.set(KEY, JSON.stringify(DEFAULTS));
        return DEFAULTS;
    },
    async list() {
        const raw = await redis.get(KEY);
        return raw ? JSON.parse(raw) : this.ensureDefaults();
    }
};
