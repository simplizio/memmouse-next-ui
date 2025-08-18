// minimalistic presets and the preset generator
export const ACL_PRESETS = {
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

// dangerous/admin level commands, avoid providing by default
export const ACL_DENY = [
    "-eval","-evalsha","-script","-config","-keys","-monitor","-debug",
    "-save","-shutdown","-migrate","-bgrewriteaof","-slaveof","-replicaof","-flushall","-flushdb"
];

// builds allowed command list based on presets + some extra
// export function buildAllowedCommands(presets = [], extra = []) {
//     const s = new Set();
//     // reset всё — потом добавляем deny и allow; deny уже с минусами
//     ACL_DENY.forEach((c) => s.add(c));
//     presets.forEach((p) => (ACL_PRESETS[p] || []).forEach((c) => s.add(c)));
//     (extra || []).filter(Boolean).forEach((c) => s.add(c.trim()));
//     return Array.from(s);
// }

export function buildAllowedCommandsFromPresets(presets = [], extra = [], presetsMap = {}) {
    const set = new Set(ACL_DENY);
    for (const p of presets) (presetsMap[p] || []).forEach(c => set.add(c));
    (extra || []).filter(Boolean).forEach(c => set.add(c.trim()));
    return Array.from(set);
}