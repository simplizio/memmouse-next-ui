"use client";
import { create } from "zustand";
import { useBindingWidgetStore } from "@/store/BindingWidgetStore";

export const useBindingWizardStore = create((set, get) => ({
    projectId: null,
    nsId: null,
    services: [],
    boundServiceIds: new Set(),
    selectedServiceId: "",
    selectedServiceName: "",
    step: 1,
    error: null,
    loading: false,

    async init(projectId, nsId) {
        set({ projectId, nsId, loading: true, error: null, step: 1 });
        const [sr, br] = await Promise.all([
              fetch(`/api/projects/${projectId}/services`, { cache: "no-store" }),
              fetch(`/api/bindings/project/${projectId}/namespace/${nsId}`, { cache: "no-store" }),
            ]);
        const sj = sr.ok ? await sr.json() : { items: [] };
        const bj = br.ok ? await br.json() : { items: [] };
        const services = sj.items || [];
        const bound = new Set((bj.items || []).map(b => b.serviceId));
        const first = services.find(s => !bound.has(s.id));
        set({
              services,
              boundServiceIds: bound,
              selectedServiceId: first?.id || "",
              selectedServiceName: first?.name || first?.id || "",
              loading: false,
              step: 1,
            });
      },

    setSelectedService(id) {
        const { services } = get();
        const found = services.find(s => s.id === id);
        set({ selectedServiceId: id, selectedServiceName: found?.name || id });
    },

    goStep2AndHydrate() {
        const { projectId, nsId, selectedServiceId } = get();
        if (!projectId || !nsId || !selectedServiceId) return;
        const nsKey = `${projectId}:${nsId}:${selectedServiceId}`;
        // дефолтная гидратация BindingWidgetStore для create
           useBindingWidgetStore().hydrate(nsKey, {});
        set({ step: 2 });
    },

    async save(onSaved) {
        const { projectId, nsId, selectedServiceId } = get();
        const nsKey = `${projectId}:${nsId}:${selectedServiceId}`;
        const saved = await useBindingWidgetStore.getState().saveOne(
            {
             projectId, nsId, serviceId: selectedServiceId, nsKey,
            });
        onSaved?.(saved);
        return saved;
    },
}));
