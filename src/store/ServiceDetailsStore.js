// src/store/ServiceDetailsStore.js
"use client";

import { create } from "zustand";

/**
 * Хранилище состояния страницы сервиса:
 *  - svc: объект сервиса
 *  - bindings: [{ ns, binding }]
 *  - namespaces: все ns проекта (для QuickBindModal)
 */
export const useServiceDetailsStore = create((set, get) => ({
    svc: null,
    bindings: null,     // [{ ns, binding }]
    namespaces: [],
    error: null,
    loading: false,

    async load(projectId, serviceId) {
        if (!projectId || !serviceId) return;
        set({ loading: true, error: null });
        try {
            // базовые данные сервиса + список nsId, к которым он привязан
            const [svcRes, listRes] = await Promise.all([
                fetch(`/api/projects/${projectId}/services/${serviceId}`, { cache: "no-store" }),
                fetch(`/api/projects/${projectId}/services/${serviceId}/bindings`, { cache: "no-store" }),
            ]);
            if (!svcRes.ok) throw new Error(`Service HTTP ${svcRes.status}`);
            if (!listRes.ok) throw new Error(`Bindings HTTP ${listRes.status}`);

            const svc = await svcRes.json();
            const { nsIds = [] } = await listRes.json();

            // грузим карточки ns + binding парами
            const details = await Promise.all(nsIds.map(async (nsId) => {
                const [nsRes, bRes] = await Promise.all([
                    fetch(`/api/projects/${projectId}/namespaces/${nsId}`, { cache: "no-store" }),
                    fetch(`/api/projects/${projectId}/namespaces/${nsId}/bindings/${serviceId}`, { cache: "no-store" }),
                ]);
                if (!nsRes.ok) return null;
                const ns = await nsRes.json();
                const binding = bRes.ok ? await bRes.json() : null;
                return { ns, binding };
            }));

            // список всех неймспейсов — для модалки быстрого бинд-йнга
            const nsListRes = await fetch(`/api/projects/${projectId}/namespaces`, { cache: "no-store" });
            const nsListJson = nsListRes.ok ? await nsListRes.json() : { items: [] };

            set({
                svc,
                bindings: details.filter(Boolean),
                namespaces: nsListJson.items || [],
                loading: false,
                error: null,
            });
        } catch (e) {
            set({ error: String(e?.message || e), loading: false });
        }
    },

    async refresh(projectId, serviceId) {
        return get().load(projectId, serviceId);
    },

    // локальные апдейты без полного рефреша (опционально)
    updateBinding(nsId, binding) {
        const rows = get().bindings || [];
        set({ bindings: rows.map(r => r.ns.id === nsId ? { ns: r.ns, binding } : r) });
    },

    removeBinding(nsId) {
        const rows = get().bindings || [];
        set({ bindings: rows.filter(r => r.ns.id !== nsId) });
    },

    addOrReplaceBinding(binding) {
       if (!binding?.nsId) return;
       const rows = get().bindings || [];
       // найдём объект ns из уже загруженного списка всех namespaces
           const ns = (get().namespaces || []).find(n => n.id === binding.nsId);
       const row = { ns: ns || { id: binding.nsId }, binding };
       const idx = rows.findIndex(r => r.ns.id === binding.nsId);
       if (idx >= 0) {
            const next = rows.slice();
             next[idx] = row;
             set({ bindings: next });
           } else {
             set({ bindings: [row, ...rows] });
           }
    },

    async refreshBinding(projectId, serviceId, nsId) {
       try {
             const [nsRes, bRes] = await Promise.all([
                   fetch(`/api/projects/${projectId}/namespaces/${nsId}`, { cache: "no-store" }),
                   fetch(`/api/projects/${projectId}/namespaces/${nsId}/bindings/${serviceId}`, { cache: "no-store" }),
                 ]);
             if (!nsRes.ok) return;
             const ns = await nsRes.json();
             const binding = bRes.ok ? await bRes.json() : null;
             if (!binding) return;
             get().updateBinding(nsId, binding);
           } catch {}
    },

    async reloadServiceOnly(projectId, serviceId) {
       try {
             const svcRes = await fetch(`/api/projects/${projectId}/services/${serviceId}`, { cache: "no-store" });
             if (!svcRes.ok) return;
             const svc = await svcRes.json();
             set({ svc });
           } catch {}
    },
}));
