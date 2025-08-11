export const seedProjects = [
    {
        id: "p1",
        name: "Fraud Detection",
        department: "Risk",
        usedBytes: 42 * 1024 ** 3,
        quotaBytes: 120 * 1024 ** 3,
        ops: { rps: 15000, wps: 2100 },
        alerts: 1,
        updatedAt: Date.now() - 1000 * 60 * 12
    },
    {
        id: "p2",
        name: "Marketing Events",
        department: "Marketing",
        usedBytes: 9 * 1024 ** 3,
        quotaBytes: 40 * 1024 ** 3,
        ops: { rps: 3200, wps: 800 },
        alerts: 0,
        updatedAt: Date.now() - 1000 * 60 * 90
    },
    {
        id: "p3",
        name: "Checkout",
        department: "Commerce",
        usedBytes: 64 * 1024 ** 3,
        quotaBytes: 100 * 1024 ** 3,
        ops: { rps: 22000, wps: 4300 },
        alerts: 2,
        updatedAt: Date.now() - 1000 * 60 * 3
    }
];

export function blankProject() {
    return {
        id: `p_${Math.random().toString(36).slice(2, 8)}`,
        name: "",
        department: "",
        usedBytes: 0,
        quotaBytes: 20 * 1024 ** 3,
        ops: { rps: 0, wps: 0 },
        alerts: 0,
        updatedAt: Date.now()
    };
}