import { redis } from "../redis/client.js";
import { ProjectRepo } from "../repos/ProjectRepo.js";
import { NamespaceRepo } from "../repos/NamespaceRepo.js";
import { AclPresetRepo } from "@/server/repos/AclPresetRepo.js";

const BOOT_KEY = "mm:bootstrapped";

// dep-free id
const makeId = () =>
    (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : ("mm_" + Math.random().toString(36).slice(2) + Date.now().toString(36));

// support both function and array exports
async function readSeedProjects() {
    try {
        const mod = await import("@/lib/mockProjects.js").catch(() => import("@/lib/mockProjects"));
        const v = mod.seedProjects ?? mod.default;
        if (Array.isArray(v)) return v;
        if (typeof v === "function") return v() ?? [];
    } catch {}
    return [];
}
async function readSeedNamespaces(projectId) {
    try {
        const mod = await import("@/lib/mockNamespaces.js").catch(() => import("@/lib/mockNamespaces"));
        const v = mod.seedNamespaces ?? mod.default;
        if (typeof v === "function") return v(projectId) ?? [];
        if (Array.isArray(v)) return v; // на случай, если экспорт — статический массив
    } catch {}
    return [];
}

// wipe only our keys
async function dropAllMemMouseKeys() {
    let cursor = "0", total = 0;
    do {
        const [next, keys] = await redis.scan(cursor, "MATCH", "mm:*", "COUNT", 1000);
        cursor = next;
        if (keys.length) { total += keys.length; await redis.del(...keys); }
    } while (cursor !== "0");
    return total;
}

/**
 * ensureSeeded({ force=false, drop=false })
 *  - force: игнорировать BOOT_KEY и пересидить
 *  - drop:  удалить все mm:* перед сидом (для дев-режима)
 */
export async function ensureSeeded(opts = {}) {
    const { force = false, drop = false } = opts;

    if (drop) {
        await dropAllMemMouseKeys();
    } else if (!force) {
        const booted = await redis.get(BOOT_KEY);
        if (booted) return { ok: true, already: true };
    }

    if (!force) {
        const existing = await ProjectRepo.list();
        if (existing.length) {
            await redis.set(BOOT_KEY, String(Date.now()));
            return { ok: true, already: true, projects: existing.length };
        }
    }

    const projects = await readSeedProjects();
    let createdProjects = 0;
    let createdNamespaces = 0;

    for (const p of projects) {
        const proj = {
            id: p.id || makeId(),
            name: p.name || "Project",
            department: p.department || "IT",
            quotaBytes: p.quotaBytes ?? 32 * 1024 ** 3,
            usedBytes: p.usedBytes ?? 0,
            updatedAt: Date.now(),
            ...p,
        };
        await ProjectRepo.create(proj);
        createdProjects++;

        const nss = await readSeedNamespaces(proj.id);
        for (const ns of nss) {
            const nsObj = {
                ...ns,
                id: ns.id || (ns.prefix ? ns.prefix.replace(/\W/g, "_") : makeId()),
                projectId: proj.id,
                updatedAt: Date.now(),
            };
            await NamespaceRepo.create(nsObj);
            createdNamespaces++;
        }

        await AclPresetRepo.ensureDefaults();
    }

    if (createdProjects > 0 || createdNamespaces > 0) {
        await redis.set(BOOT_KEY, String(Date.now()));
    }

    return { ok: true, projects: createdProjects, namespaces: createdNamespaces, forced: force, dropped: drop };
}
