"use client";

import { create } from "zustand";

export const useNamespaceBindingsStore = create((set, get) => ({
    ns: null,
    bindings: [],      // ⬅️ было null — теперь пустой массив
    services: [],
    error: null,
    loading: false,

    async load(projectId, nsId) {
        if (!projectId || !nsId) return;
        set({ loading: true, error: null });
        try {
            const [nsRes, listRes, svcRes] = await Promise.all([
                fetch(`/api/projects/${projectId}/namespaces/${nsId}`, { cache: "no-store" }),
                fetch(`/api/bindings/project/${projectId}/namespace/${nsId}`, { cache: "no-store" }),
                fetch(`/api/projects/${projectId}/services`, { cache: "no-store" }),
            ]);
            if (!nsRes.ok) throw new Error(`NS HTTP ${nsRes.status}`);
            const ns = await nsRes.json();
            const listJ = listRes.ok ? await listRes.json() : { items: [] };
            const svcJ  = svcRes.ok ? await svcRes.json()  : { items: [] };

            console.log(`namespace: ${JSON.stringify(ns)}`);
            console.log(`bindings: ${JSON.stringify(listJ)}`);

            set({ ns, bindings: listJ.items || [], services: svcJ.items || [], loading: false });
        } catch (e) {
            set({ error: String(e?.message || e), loading: false });
        }
    },

    async refreshOne(projectId, nsId, serviceId) {
        try {
            const r = await fetch(`/api/bindings/project/${projectId}/namespace/${nsId}/service/${serviceId}`, { cache: "no-store" })
            if (!r.ok) return;
            const b = await r.json();
            set(s => ({
                bindings: (s.bindings || []).map(x => x.serviceId === serviceId ? b : x),
            }));
        } catch {}
    },

    addOrReplace(binding) {
        set(s => {
            const arr = s.bindings || [];
            const idx = arr.findIndex(x => x.serviceId === binding.serviceId);
            if (idx >= 0) {
                const next = arr.slice(); next[idx] = binding; return { bindings: next };
            }
            return { bindings: [binding, ...arr] };
        });
    },

    remove(serviceId) {
        set(s => ({ bindings: (s.bindings || []).filter(x => x.serviceId !== serviceId) }));
    },

    async create(projectId, nsId, payload) {
        const r = await fetch(`/api/bindings/project/${projectId}/namespace/${nsId}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const j = await r.json().catch(()=> ({}));
        if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        const b = j.binding || { nsId, ...payload };
        get().addOrReplace(b);
        return b;
    },

    async update(projectId, nsId, serviceId, payload) {
        const r = await fetch(`/api/bindings/project/${projectId}/namespace/${nsId}/service/${serviceId}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const j = await r.json().catch(()=> ({}));
        if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        const b = j.binding || { nsId, serviceId, ...payload };
        get().addOrReplace(b);
        return b;
    },

    async unbind(projectId, nsId, serviceId) {
        const r = await fetch(`/api/bindings/project/${projectId}/namespace/${nsId}/service/${serviceId}`, { method: "DELETE" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        get().remove(serviceId);
    },
}));
