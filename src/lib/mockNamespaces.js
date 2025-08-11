export function seedNamespaces(projectId) {
    const now = Date.now();
    return [
        ns(projectId, "orders:*", 16 * 1024**3, 6.2 * 1024**3, "24h", "volatile-lru", { rps: 320, wps: 140 }, 1_250_000),
        ns(projectId, "sessions:*", 8 * 1024**3, 2.9 * 1024**3, "1h", "volatile-ttl", { rps: 540, wps: 520 }, 3_900_000, "frozen"),
        ns(projectId, "customers:*", 32 * 1024**3, 9.7 * 1024**3, "30d", "noeviction", { rps: 90, wps: 12 }, 420_000),
        ns(projectId, "metrics:*", 64 * 1024**3, 12.1 * 1024**3, "7d", "allkeys-lru", { rps: 1800, wps: 1650 }, 18_200_000),
    ].map((n,i)=>({ ...n, updatedAt: now - i*3600_000 }));
}

function ns(projectId, prefix, quotaBytes, usedBytes, ttl, eviction, ops, keys, status="active") {
    return {
        id: prefix.replace(/\W/g, "_"),
        projectId, prefix,
        quotaBytes, usedBytes, ttl, eviction,
        ops, keys, status, encryption: { atRest: true, inFlight: true }
    };
}

export function blankNamespace(projectId) {
    return {
        id: "", projectId, prefix: "",
        quotaBytes: 8 * 1024**3, usedBytes: 0,
        ttl: "none", eviction: "noeviction",
        ops: { rps: 0, wps: 0 }, keys: 0,
        status: "active", encryption: { atRest: true, inFlight: true }
    };
}
