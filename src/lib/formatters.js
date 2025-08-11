export const fmtPercent = (num) => `${Math.round(num)}%`;
export const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));
export const bytes = (n) => {
    if (n == null) return "—";
    const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0; let v = n;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`;
};