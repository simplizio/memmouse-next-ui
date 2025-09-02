import { create } from "zustand";
import { usePatternStore } from "@/store/patternStore";

const normPerm = (p) => {
    if (!p) return "RW";
    if (typeof p === "string") return p.toUpperCase();
    const read = !!p.read, write = !!p.write;
    return read && write ? "RW" : (write ? "W" : "R");
};
const normRate = (r = {}) => ({ readRps: Number(r?.readRps || 0), writeRps: Number(r?.writeRps || 0) });
const normBw   = (b = {}) => ({ readKBps: Number(b?.readKBps || 0), writeKBps: Number(b?.writeKBps || 0) });

async function apiJSON(url, init) {
    const res = await fetch(url, { cache: "no-store", ...init });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || `${init?.method || "GET"} ${url} → ${res.status}`);
    return j;
}

export const useBindingWidgetStore = create((set, get) => ({
    _cfg: {}, // nsKey -> { perm, rate, bandwidth }

    getCfg: (nsKey) =>
        get()._cfg[nsKey] || { perm: "RW", rate: { readRps: 0, writeRps: 0 }, bandwidth: { readKBps: 0, writeKBps: 0 } },

    /** Гидрация всех полей виджета + паттернов одним вызовом */
    hydrate(nsKey, draft = {}) {
        if (!nsKey) return;
        const perms = typeof draft.permissions === "string"
            ? draft.permissions.toUpperCase()
            : (draft.permissions?.read && draft.permissions?.write ? "RW" : (draft.permissions?.write ? "W" : "R"));
        get().setPerm(nsKey, perms || "RW");
        get().setRate(nsKey, {
            readRps: Number(draft?.rate?.readRps || 0),
            writeRps: Number(draft?.rate?.writeRps || 0),
        });
        get().setBandwidth(nsKey, {
            readKBps: Number(draft?.bandwidth?.readKBps || 0),
            writeKBps: Number(draft?.bandwidth?.writeKBps || 0),
        });
        // паттерны — через patternStore
        const ps = usePatternStore.getState();
        ps.setDraftPatterns(nsKey, get()._normPatterns(draft?.keyPatterns));
    },

    setPerm:      (nsKey, perm) => set(s => ({ _cfg: { ...s._cfg, [nsKey]: { ...(s._cfg[nsKey] || {}), perm: normPerm(perm) } } })),
    setRate:      (nsKey, rate) => set(s => ({ _cfg: { ...s._cfg, [nsKey]: { ...(s._cfg[nsKey] || {}), rate: normRate(rate) } } })),
    setBandwidth: (nsKey, bw)   => set(s => ({ _cfg: { ...s._cfg, [nsKey]: { ...(s._cfg[nsKey] || {}), bandwidth: normBw(bw) } } })),

    /** Нормализация массива паттернов */
    _normPatterns(arr) {
        return Array.from(new Set((arr || []).map(String).map(s => s.trim()).filter(Boolean)));
    },

    /** Установить текущие паттерны для nsKey (виджет зовёт это на onChange) */
    setPatterns(nsKey, patterns) {
        if (!nsKey) return;
        const ps = usePatternStore.getState();
        ps.setDraftPatterns(nsKey, get()._normPatterns(patterns));
    },

    /** единичное сохранение биндинга по nsKey */
    saveOne: async ({ projectId, nsId, serviceId, nsKey }) => {
        const cfg = get().getCfg(nsKey);
        const patternStore  = usePatternStore.getState();

        // перед отправкой — сбросить актуальный драфт в репозиторий
        await patternStore.saveDraftToRepo(projectId, nsId, nsKey);

        const payload = {
            nsId,
            keyPatterns: patternStore.getDraftPatterns(nsKey) || [],
            permissions: cfg?.perm || "RW",
            rate: cfg?.rate || { readRps: 0, writeRps: 0 },
            bandwidth: cfg?.bandwidth || { readKBps: 0, writeKBps: 0 },
        };

        console.log(`patterns for binfing ${JSON.stringify(patternStore.getDraftPatterns(nsKey))}`);


        const r = await apiJSON(`/api/bindings/project/${projectId}/namespace/${nsId}/service/${serviceId}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
        });
        return r?.binding || r;
    },

    /** Загрузить существующий биндинг, гидрировать стор и вернуть объект биндинга */
    loadOne: async ({ projectId, nsId, serviceId, nsKey }) => {
        if (!projectId || !nsId || !serviceId) throw new Error("projectId, nsId, serviceId are required");
        const r = await apiJSON(`/api/bindings/project/${projectId}/namespace/${nsId}/service/${serviceId}`, {
            method: "GET"
        });
        const binding = r?.binding || r || {};
        // положим в стора всё что нужно для виджета
        get().hydrate(nsKey, {
            permissions: binding?.permissions,
            rate: binding?.rate,
            bandwidth: binding?.bandwidth,
            keyPatterns: binding?.keyPatterns,
        });
        return binding;
    },
}));