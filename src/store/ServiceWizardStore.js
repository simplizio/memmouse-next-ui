import { create } from "zustand";
import {useBindingManagerStore} from "@/store/BindingManagerStore";

// утиль
const uniqNorm = (arr = []) =>
    Array.from(new Set(arr.map(String).map(s => s.trim()).filter(Boolean)));

export const useServiceWizardStore = create((set, get) => ({
    // Шаг 1 — Basics
    basics: { name: "", scopes: ["kv.read", "kv.write"], description: "" },
    setBasics: (patch) =>
        set((state) => ({ basics: { ...state.basics, ...patch } })),

    // Шаг 2 — ACL
    acl: { presets: [], extra: [] }, // extra: string[]
    setAcl: (patch) => set((state) => ({ acl: { ...state.acl, ...patch } })),

    // ──────────────────────────────────────────────────────────────
    // Централизация взаимодействий с BindingManagerStore
    getSelectedBindingDrafts: () => {
         const bm = useBindingManagerStore.getState();
             return bm.getSelectedDrafts();
    },

    saveAllBindings: async (projectId, serviceId, namespaces = []) => {
         const bm = useBindingManagerStore.getState();
         return await bm.saveAll({ projectId, serviceId, namespaces });
    },

    resetBindingManager: () => {
         const bm = useBindingManagerStore.getState();
         bm.resetAll();
    },
    // ──────────────────────────────────────────────────────────────


    // Сброс всего визарда
    reset: () =>
        set({
            basics: { name: "", scopes: ["kv.read", "kv.write"], description: "" },
            acl: { presets: [], extra: [] },
        }),
}));



