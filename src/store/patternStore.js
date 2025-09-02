// src/store/PatternStore.js
import { create } from "zustand";

const norm = (s) => String(s ?? "").trim();
const normalizePattern = (s) => {
    let t = norm(s);
    t = t.replace(/\s+/g, "").replace(/:+/g, ":").replace(/\*{2,}/g, "*")
        .replace(/:\*{2,}/g, ":*").replace(/:\*:+/g, ":*:")
        .replace(/\*+$/g, "*").replace(/^[:*]+/, "");
    if (t && !t.includes(":")) t = `${t}:*`;
    return t;
};
const uniq = (arr=[]) => Array.from(new Set(arr.map(normalizePattern).filter(Boolean)));

async function apiJSON(url, init) {
    const res = await fetch(url, { cache:"no-store", ...init });
    const j = await res.json().catch(()=> ({}));
    if (!res.ok) throw new Error(j?.error || `${init?.method||"GET"} ${url} → ${res.status}`);
    return j;
}

export const usePatternStore = create((set, get) => ({
    // cache: "proj:nsId" -> { suggestions:[], repo:[], ts:number }
    _nsCache: {},
    // drafts: nsKey -> { patterns:[], input:"" }
    _drafts: {},

    // -------- cache (suggestions / repo) ----------
    getSuggestions: (projectId, nsId) => (get()._nsCache[`${projectId}:${nsId}`]?.suggestions) || [],
    getRepoItems:   (projectId, nsId) => (get()._nsCache[`${projectId}:${nsId}`]?.repo) || [],

    ensureSuggestions: async (projectId, nsId, ttlMs=30000) => {
        const key = `${projectId}:${nsId}`;
        const cached = get()._nsCache[key];
        const now = Date.now();
        if (cached && now - (cached.ts||0) < ttlMs && cached.suggestions?.length) return cached.suggestions;

        const [sug, all] = await Promise.all([
            apiJSON(`/api/patterns/project/${projectId}/namespaces/${nsId}/suggestions`),
            apiJSON(`/api/patterns/project/${projectId}/namespaces/${nsId}`)
        ]);
        const suggestions = uniq(sug?.items || []);
        const repo = uniq(all?.items || []);
        set(state => ({
            _nsCache: { ...state._nsCache, [key]: { suggestions, repo, ts: now } }
        }));
        return suggestions;
    },

    mergeRepo: (projectId, nsId, added=[]) => set(state => {
        const key = `${projectId}:${nsId}`;
        const cur = state._nsCache[key] || { suggestions:[], repo:[], ts:Date.now() };
        const repo = uniq([ ...(cur.repo||[]), ...added ]);
        return { _nsCache: { ...state._nsCache, [key]: { ...cur, repo } } };
    }),

    // -------- drafts ----------
    getDraftPatterns: (nsKey) => get()._drafts[nsKey]?.patterns || [],
    setDraftPatterns: (nsKey, arr) => set(state => ({
        _drafts: { ...state._drafts, [nsKey]: { ...(state._drafts[nsKey]||{}), patterns: uniq(arr||[]) } }
    })),
    getDraftInput: (nsKey) => get()._drafts[nsKey]?.input || "",
    setDraftInput: (nsKey, v) => set(state => ({
        _drafts: { ...state._drafts, [nsKey]: { ...(state._drafts[nsKey]||{}), input: norm(v) } }
    })),
    resetDraft: (nsKey) => set(state => {
        const next = { ...state._drafts }; delete next[nsKey]; return { _drafts: next };
    }),
    resetAllDrafts: () => set({ _drafts: {} }),

    // -------- ПЕРСИСТЕНС ПАТТЕРНОВ В РЕПО ----------
    /**
     * Сохранить ЯВНЫЙ список паттернов в repo данного неймспейса.
     * Возвращает { saved:boolean, added:string[], items:string[] }.
     */
    savePatterns: async (projectId, nsId, patterns=[]) => {
        const key = `${projectId}:${nsId}`;
        console.log(`saving patterns ${JSON.stringify(patterns)}`);
        // актуализируем repo (если пусто в кэше)
        if (!get()._nsCache[key]?.repo?.length) {
            console.log(`ensuring suggestions having patterns ${JSON.stringify(patterns)}`);
            await get().ensureSuggestions(projectId, nsId);
        }
        const repoNow = get().getRepoItems(projectId, nsId);
        console.log(`repo now ${JSON.stringify(repoNow)}`);
        const repoSet = new Set(repoNow.map(String));
        console.log(`repo set ${JSON.stringify(repoSet)}`);
        const toAdd = uniq(patterns).filter(p => !repoSet.has(String(p)));
        console.log(`will send ${JSON.stringify(toAdd)}`);
        if (!toAdd.length) return { saved:false, added:[], items: repoNow };

        const j = await apiJSON(`/api/patterns/project/${projectId}/namespaces/${nsId}`, {
            method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ add: toAdd })
        });
        const newItems = uniq(j?.items || []);
        console.log(`save result ${JSON.stringify(j)}`);
        // обновим кеш
        set(state => ({
            _nsCache: {
                ...state._nsCache,
                [key]: { ...(state._nsCache[key]||{ suggestions:[], repo:[], ts:Date.now() }), repo: newItems }
            }
        }));
        return { saved:true, added: toAdd, items: newItems };
    },

    /**
     * Сохранить ЧЕРНОВИК паттернов из drafts[nsKey] в repo (удобно для билдера).
     */
    saveDraftToRepo: async (projectId, nsId, nsKey) => {
        const patterns = get().getDraftPatterns(nsKey) || [];
        console.log(`pattern repo: saving ${JSON.stringify(patterns)}`);
        return await get().savePatterns(projectId, nsId, patterns);
    },
}));
