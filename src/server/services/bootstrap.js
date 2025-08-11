import { redis } from "../redis/client.js";
import { ProjectRepo } from "../repos/ProjectRepo.js";
import { NamespaceRepo } from "../repos/NamespaceRepo.js";

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
    }

    if (createdProjects > 0 || createdNamespaces > 0) {
        await redis.set(BOOT_KEY, String(Date.now()));
    }

    return { ok: true, projects: createdProjects, namespaces: createdNamespaces, forced: force, dropped: drop };
}



// import { redis } from "../redis/client.js";
// import { ProjectRepo } from "../repos/ProjectRepo.js";
// import { NamespaceRepo } from "../repos/NamespaceRepo.js";
// import { ulid } from "ulidx";
//
// // mock packages might export arrays or functions
// import * as mockProjectsMod from "@/lib/mockProjects";
// import * as mockNamespacesMod from "@/lib/mockNamespaces";
//
// const BOOT_KEY = "mm:bootstrapped";
//
// function readSeedProjects() {
//     const sp = mockProjectsMod.seedProjects ?? mockProjectsMod.default;
//     if (Array.isArray(sp)) return sp;
//     if (typeof sp === "function") return sp() ?? [];
//     return [];
// }
// function readSeedNamespaces(projectId) {
//     const fn = mockNamespacesMod.seedNamespaces ?? mockNamespacesMod.default;
//     if (typeof fn === "function") return fn(projectId) ?? [];
//     return [];
// }
//
// // carefully wipes only our keys
// async function dropAllMemMouseKeys() {
//     let cursor = "0";
//     let total = 0;
//     do {
//         const [next, keys] = await redis.scan(cursor, "MATCH", "mm:*", "COUNT", 1000);
//         cursor = next;
//         if (keys.length) {
//             total += keys.length;
//             await redis.del(...keys);
//         }
//     } while (cursor !== "0");
//     return total;
// }
//
// /**
//  * ensureSeeded({ force=false, drop=false })
//  * - force: ignore BOOT_KEY and seed again
//  * - drop:  wipe all mm:* before seed (only for dev scenarios)
//  */
// export async function ensureSeeded(opts = {}) {
//     const { force = false, drop = false } = opts;
//
//     if (drop) {
//         await dropAllMemMouseKeys();
//     } else if (!force) {
//         const booted = await redis.get(BOOT_KEY);
//         if (booted) return { ok: true, already: true };
//     }
//
//     // если есть проекты и не просили force — считаем, что всё инициализировано
//     if (!force) {
//         const existing = await ProjectRepo.list();
//         if (existing.length) {
//             await redis.set(BOOT_KEY, String(Date.now()));
//             return { ok: true, already: true, projects: existing.length };
//         }
//     }
//
//     const projects = readSeedProjects();
//     let createdProjects = 0;
//     let createdNamespaces = 0;
//
//     for (const p of projects) {
//         const proj = {
//             id: p.id || ulid(),
//             name: p.name || "Project",
//             department: p.department || "IT",
//             quotaBytes: p.quotaBytes ?? 32 * 1024 ** 3,
//             usedBytes: p.usedBytes ?? 0,
//             updatedAt: Date.now(),
//             ...p,
//         };
//         await ProjectRepo.create(proj);
//         createdProjects++;
//
//         const nss = readSeedNamespaces(proj.id);
//         for (const ns of nss) {
//             const nsObj = {
//                 ...ns,
//                 id: ns.id || (ns.prefix ? ns.prefix.replace(/\W/g, "_") : ulid()),
//                 projectId: proj.id,
//                 updatedAt: Date.now(),
//             };
//             await NamespaceRepo.create(nsObj);
//             createdNamespaces++;
//         }
//     }
//
//     // помечаем как засиженное, только если что-то реально сиднули
//     if (createdProjects > 0 || createdNamespaces > 0) {
//         await redis.set(BOOT_KEY, String(Date.now()));
//     }
//
//     return { ok: true, projects: createdProjects, namespaces: createdNamespaces, forced: force, dropped: drop };
// }


// import { redis } from "../redis/client.js";
// import { ProjectRepo } from "../repos/ProjectRepo.js";
// import { NamespaceRepo } from "../repos/NamespaceRepo.js";
//
// // take mocks from existing files
// import { seedProjects } from "@/lib/mockProjects";
// import { seedNamespaces } from "@/lib/mockNamespaces";
//
// const BOOT_KEY = "mm:bootstrapped";
//
// export async function ensureSeeded() {
//     // already seeded? exiting
//     const booted = await redis.get(BOOT_KEY);
//     if (booted) return { ok: true, already: true };
//
//     // if projects exist then the database is initialized
//     const existing = await ProjectRepo.list();
//     if (existing.length) {
//         await redis.set(BOOT_KEY, String(Date.now()));
//         return { ok: true, already: true, projects: existing.length };
//     }
//
//     // seeding
//     const projects = seedProjects?.() || [];
//     for (const p of projects) {
//         const proj = { ...p, updatedAt: p.updatedAt ?? Date.now() };
//         await ProjectRepo.create(proj);
//
//         const nss = seedNamespaces(proj.id) || [];
//         for (const ns of nss) {
//             await NamespaceRepo.create({ ...ns, updatedAt: ns.updatedAt ?? Date.now() });
//         }
//     }
//
//     await redis.set(BOOT_KEY, String(Date.now()));
//     return { ok: true, projects: projects.length };
// }
