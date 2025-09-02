import { create } from "zustand";
import {useBindingWidgetStore} from "@/store/BindingWidgetStore";


// ---- helpers ----
const normPerm = (p) => {
    if (!p) return "RW";
    if (typeof p === "string") return p.toUpperCase();
    const read = !!p.read, write = !!p.write;
    return read && write ? "RW" : (write ? "W" : "R");
};
const normalizeDraft = (d = {}) => ({
    nsId: d.nsId,
    permissions: normPerm(d.permissions || "RW"),
    rate: { readRps: Number(d?.rate?.readRps || 0), writeRps: Number(d?.rate?.writeRps || 0) },
    bandwidth: { readKBps: Number(d?.bandwidth?.readKBps || 0), writeKBps: Number(d?.bandwidth?.writeKBps || 0) },
    keyPatterns: Array.from(new Set((d?.keyPatterns || []).map(String).map(s => s.trim()).filter(Boolean))),
});
const defaultDraft = (nsId) => normalizeDraft({
    nsId,
    permissions: "RW",
    rate: { readRps: 0, writeRps: 0 },
    bandwidth: { readKBps: 0, writeKBps: 0 },
    keyPatterns: [],
});

export const useBindingManagerStore = create((set, get) => ({
    // UI
    openMap: {},        // nsId -> bool
    selectedMap: {},    // nsId -> bool

    // Data
    drafts: {},         // nsId -> draft (нормализованный)
    initialByNs: {},    // nsId -> draft (для сравнения)
    _nsIdsKey: "",      // guard против переинициализации

    /** Однократная инициализация под набор ns + initialBindings. */
    initForNamespaces: (namespaces = [], initialBindings = []) => {
        const nsIds = (namespaces || []).map(n => n.id);
        const key = nsIds.join("|");
        const prev = get();
        if (prev._nsIdsKey === key && nsIds.length) return; // уже готово

        const openMap = { ...prev.openMap };
        const selectedMap = { ...prev.selectedMap };
        const drafts = { ...prev.drafts };
        const initialByNs = { ...prev.initialByNs };

        const initMap = new Map();
        for (const b of Array.isArray(initialBindings) ? initialBindings : []) {
            if (b?.nsId) initMap.set(b.nsId, normalizeDraft(b));
        }

        for (const n of namespaces) {
            const id = n.id;
            if (openMap[id] === undefined) openMap[id] = false;
            if (selectedMap[id] === undefined) selectedMap[id] = false; // никаких автогалок
            if (!drafts[id]) drafts[id] = initMap.get(id) || defaultDraft(id);
            if (!initialByNs[id]) initialByNs[id] = initMap.get(id) || defaultDraft(id);
        }

        // подчистить отсутствующие ns
        const nsSet = new Set(nsIds);
        for (const id of Object.keys(openMap)) if (!nsSet.has(id)) delete openMap[id];
        for (const id of Object.keys(selectedMap)) if (!nsSet.has(id)) delete selectedMap[id];
        for (const id of Object.keys(drafts)) if (!nsSet.has(id)) delete drafts[id];
        for (const id of Object.keys(initialByNs)) if (!nsSet.has(id)) delete initialByNs[id];

        set({ openMap, selectedMap, drafts, initialByNs, _nsIdsKey: key });
    },

    // accordion
    toggleOpen: (nsId) => set(s => ({ openMap: { ...s.openMap, [nsId]: !s.openMap[nsId] } })),
    setOpenAll: (ids = [], v) => set(s => {
        const m = { ...s.openMap }; for (const id of ids) m[id] = !!v; return { openMap: m };
    }),

    // selection
    setSelected: (nsId, v) => set(s => (!!s.selectedMap[nsId] === !!v ? s
        : { selectedMap: { ...s.selectedMap, [nsId]: !!v } })),
    setSelectedAll: (ids = [], v) => set(s => {
        const m = { ...s.selectedMap }; let ch = false;
        for (const id of ids) { const nv = !!v; if (!!m[id] !== nv) { m[id] = nv; ch = true; } }
        return ch ? { selectedMap: m } : s;
    }),
    toggleSelect: (nsId) => set(s => ({ selectedMap: { ...s.selectedMap, [nsId]: !s.selectedMap[nsId] } })),

    // drafts
    setDraft: (nsId, draft) => set(s => {
        const d = normalizeDraft({ ...draft, nsId });
        const cur = s.drafts?.[nsId];
        if (cur && JSON.stringify(cur) === JSON.stringify(d)) return s; // no-op (убираем риск циклов)

        const nextDrafts = { ...s.drafts, [nsId]: d };
        // автогалка — только если отличается от initial/дефолта
        let nextSelected = s.selectedMap;
        const base = s.initialByNs?.[nsId] || defaultDraft(nsId);
        if (JSON.stringify(d) !== JSON.stringify(base) && !s.selectedMap[nsId]) {
            nextSelected = { ...s.selectedMap, [nsId]: true };
        }
        return { drafts: nextDrafts, selectedMap: nextSelected };
    }),

    getSelectedNsIds: () => Object.keys(get().selectedMap).filter(id => !!get().selectedMap[id]),
    getSelectedDrafts: () => get().getSelectedNsIds().map(id => get().drafts[id]).filter(Boolean),

    /** Пакетное сохранение: гидрим конфиг и паттерны под АКТУАЛЬНЫЙ nsKey и шлём saveOne(). */
    saveAll: async ({ projectId, serviceId, namespaces = [] }) => {
        const sel = get().getSelectedNsIds();
        if (!namespaces?.length) {
            namespaces = sel.map(id => ({ id })); // fallback чтобы пройти гидрацию/сохранение
        }
        let saved = 0; const results = [];

        for (const ns of namespaces) {
            const nsId = ns.id;
            if (!sel.includes(nsId)) {
                results.push({ nsId, ok: true, skipped: true });
                continue;
            }

            try {
                const nsKey = `${projectId}:${nsId}:${serviceId || "new"}`;
                const draft = get().drafts[nsId] || defaultDraft(nsId);

                // 1) гидрим конфиг виджета текущими значениями
                const bindingWidgetStore = useBindingWidgetStore.getState();
                bindingWidgetStore.hydrate(nsKey, draft);

                // const bwStore = useBindingWidgetStore.getState();
                // bwStore.setPerm(nsKey, draft.permissions);
                // bwStore.setRate(nsKey, draft.rate);
                // bwStore.setBandwidth(nsKey, draft.bandwidth);
                //
                // // 2) прокинем паттерны в patternStore под АКТУАЛЬНЫЙ nsKey
                // const ps = usePatternStore.getState();
                // ps.setDraftPatterns?.(nsKey, draft.keyPatterns || []);

                // 3) единый путь сохранения

                console.log(`BindingManagerStore - saveOne: prjId ${projectId}, nsId ${nsId}, svcId ${serviceId}, nsKey ${nsKey}`);

                const binding = await bindingWidgetStore.saveOne({ projectId, nsId, serviceId, nsKey });
                results.push({ nsId, ok: true, binding, saved: true });
                saved++;
            } catch (e) {
                results.push({ nsId, ok: false, err: String(e?.message || e) });
            }
        }
        return { saved, results };
    },

    resetAll: () => set({ openMap: {}, selectedMap: {}, drafts: {}, initialByNs: {}, _nsIdsKey: "" }),
}));

