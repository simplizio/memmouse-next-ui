"use client";

import { create } from "zustand";

export const useBindingListStore = create((set, get) => ({
    items: /** @type {Array<{ns: any, binding: any}>} */ ([]),
    loading: false,
    error: null,

    /** Полностью заменить список карточек (снимок от родителя). */
    setFromService(rows) {
        set({ items: Array.isArray(rows) ? rows : [] });
    },

    /** Добавить/заменить одну карточку. */
    addOrReplace(ns, binding) {
        set(s => {
            const idx = s.items.findIndex(r => r.ns?.id === ns?.id);
            const row = { ns, binding };
            if (idx >= 0) {
                const next = s.items.slice();
                next[idx] = row;
                return { items: next };
            }
            return { items: [row, ...s.items] };
        });
    },

    /** Заменить данные биндинга по nsId. */
    update(nsId, binding) {
        set(s => ({
            items: (s.items || []).map(r => r.ns?.id === nsId ? ({ ns: r.ns, binding }) : r),
        }));
    },

    /** Удалить карточку по nsId. */
    remove(nsId) {
        set(s => ({ items: (s.items || []).filter(r => r.ns?.id !== nsId) }));
    },

    /** Подтянуть один биндинг и ns с бэка и обновить карточку. */
    async refreshOne(projectId, serviceId, nsId) {
        if (!projectId || !serviceId || !nsId) return;
        try {
            const [nsRes, bRes] = await Promise.all([
                fetch(`/api/projects/${projectId}/namespaces/${nsId}`, { cache: "no-store" }),
                fetch(`/api/projects/${projectId}/namespaces/${nsId}/bindings/${serviceId}`, { cache: "no-store" }),
            ]);
            if (!nsRes.ok) return;
            const ns = await nsRes.json();
            const binding = bRes.ok ? await bRes.json() : null;
            if (binding) get().addOrReplace(ns, binding);
        } catch {}
    },

    /** Отвязать биндинг и удалить карточку. */
    async unbind(projectId, serviceId, nsId) {
        const r = await fetch(`/api/projects/${projectId}/namespaces/${nsId}/bindings/${serviceId}`, { method: "DELETE" });
        if (!r.ok) throw new Error(`Unbind HTTP ${r.status}`);
        get().remove(nsId);
    },
}));
