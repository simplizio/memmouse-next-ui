// Единая нормализация/рендер прав

export function normalizePerms(p) {
    if (!p) return { read: true, write: true };           // default = RW
    if (typeof p === "string") {
        const u = p.toUpperCase();
        return { read: u.includes("R"), write: u.includes("W") };
    }
    if (Array.isArray(p)) {
        const S = new Set(p.map(x => String(x).toUpperCase()));
        return { read: S.has("R") || S.has("READ"), write: S.has("W") || S.has("WRITE") };
    }
    return { read: !!p.read, write: !!p.write };
}

export function permCode(p) {
    const n = normalizePerms(p);
    return n.read && n.write ? "RW" : (n.write ? "W" : "R");
}


// // Единая нормализация и код
// export function normalizePerms(p) {
//     if (!p) return { read: true, write: true };          // по умолчанию RW
//     if (typeof p === "string") {
//         const u = p.toUpperCase();
//         return { read: u.includes("R"), write: u.includes("W") };
//     }
//     if (Array.isArray(p)) {
//         const S = new Set(p.map(x => String(x).toUpperCase()));
//         return { read: S.has("R") || S.has("READ"), write: S.has("W") || S.has("WRITE") };
//     }
//     return { read: !!p.read, write: !!p.write };
// }
// export function permCode(p) {
//     const n = normalizePerms(p);
//     return n.read && n.write ? "RW" : (n.write ? "W" : "R");
// }
