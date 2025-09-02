
"use client";

import {forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react";
import {usePatternStore} from "@/store/patternStore";

// утиль нормализации
function normalizePattern(s) {
    if (!s) return "";
    let t = String(s).trim();

    // убрать пробелы
    t = t.replace(/\s+/g, "");

    // схлопнуть повторяющиеся символы
    t = t.replace(/:+/g, ":");       // ::: -> :
    t = t.replace(/\*{2,}/g, "*");   // ** -> *
    t = t.replace(/:\*{2,}/g, ":*"); // :** -> :*
    t = t.replace(/:\*:+/g, ":*:");  // :*: -> :*:
    t = t.replace(/\*+$/g, "*");     // xxx*** -> xxx*
    t = t.replace(/^[:*]+/, "");     // ведущие : или * в начале

    // если пользователь ввёл только base — подставим :*
    if (t && !t.includes(":")) t = `${t}:*`;
    return t;
}
const uniq = (arr = []) => Array.from(new Set(arr.map(normalizePattern).filter(Boolean)));

async function apiJSON(url, init) {
    const res = await fetch(url, { cache: "no-store", ...init });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || `${init?.method || "GET"} ${url} → ${res.status}`);
    return j;
}

/**
 * KeyPatternBuilderSingleNs
 * - контролируемый список паттернов для одного ns
 * - сам тянет подсказки из /api/patterns/project/:id/namespaces/:nsId/suggestions
 * - по внешней команде .saveToRepo() сам пишет новые паттерны в /api/patterns/project/:id/namespaces/:nsId (POST { add: [...] })
 *
 * props:
 *  - projectId: string
 *  - ns: { id, name, prefix? }
 *  - value: string[]                      // контролируемое значение
 *  - onChange(next: string[])
 *  - onDirtyChange?(boolean)              // сообщаем родителю, «грязно ли»
 *  - maxChips?: number                    // лимит видимых подсказок (дефолт 24)
 *
 * ref API:
 *  - isDirty(): boolean
 *  - saveToRepo(): Promise<{saved:boolean, added:string[], items:string[]}>
 *  - resetDirty(): void
 *  // - ensureSuggestions(nsId?: string): Promise<void>
 */
const KeyPatternBuilderSingleNs = forwardRef(function KeyPatternSingleNs(
    {
        projectId, ns, nsKey, value = [], onChange, onDirtyChange, maxChips = 24
    },
    ref
) {

    const nsId = ns?.id;
    // const [chips, setChips] = useState([]);        // подсказки (из repo), нормализованные
    // const [repoItems, setRepoItems] = useState([]); // фактические элементы в repo (нормализованные)
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [input, setInput] = useState("");

    const store = usePatternStore();
    // const current = useMemo(() => {
    //                 const fromDraft = Array.isArray(store.getDraftPatterns?.(nsKey)) ?
    //                                                 store.getDraftPatterns(nsKey) : [];
    //
    //                 // если родитель всё ещё передаёт value — аккуратно мерджим
    //                 return uniq([ ...fromDraft, ...(value || []) ]);
    //                 },
    //             [store, nsKey, value]);

    const current = useMemo(() => {
                const draft = Array.isArray(store.getDraftPatterns?.(nsKey))
                    ? store.getDraftPatterns(nsKey)
                        : [];
                return draft.length ? draft : uniq(value || []);
            }, [store, nsKey, value]);

    // если драфта ещё нет — один раз инициализируем его из value
    useEffect(() => {
        const draft = store.getDraftPatterns?.(nsKey) || [];
        if (!draft.length && (value?.length)) {
            store.setDraftPatterns(nsKey, uniq(value));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nsKey]);

    const chips = store.getSuggestions(projectId, nsId);

    // dirty = изменились ли patterns относительно «базовой» точки
    const baseRef = useRef(current);
    const dirty = useMemo(() => {
        const a = new Set(baseRef.current);
        const b = new Set(current);
        if (a.size !== b.size) return true;
        for (const x of a) if (!b.has(x)) return true;
        return false;
    }, [current]);

    useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

    const fetchingRef = useRef(new Set()); // nsId in-progress


    // ensure suggestions (кеш)
    async function ensureSuggestions(id) {
        if(!projectId || !id) return;
        setLoading(true);
        try { await store.ensureSuggestions(projectId, id); } finally { setLoading(false); }
    }
    useEffect(()=> { if(projectId && nsId) ensureSuggestions(nsId).then(r => {}); }, [projectId, nsId]); // eslint-disable-line


    // Публичный API для родителя
    useImperativeHandle(ref, () => ({
        isDirty: () => dirty,
        resetDirty: () => { baseRef.current = current; onDirtyChange?.(false); },
        // ensureSuggestions,
        // ВАЖНО: сохраним паттерны в repo через стор
        async saveToRepo() {
            if (!projectId || !nsId) return { saved:false, added:[], items:[] };
            // обновим черновик в сторе текущими value (на случай если родитель не вызывал onChange)
            // store.setDraftPatterns(nsKey, current);
            store.setDraftPatterns(nsKey, current);
            setSaving(true);
            try {
                return await store.saveDraftToRepo(projectId, nsId, nsKey);
            } finally {
                setSaving(false);
            }
        }
    }), [dirty, current, projectId, nsId, nsKey, store, onDirtyChange]);

    const nsBase = useMemo(() => {
        const base = String(ns?.prefix || ns?.name || ns?.id || "").replace(/[:*]+/g, "");
        return base;
    }, [ns]);


    function addFromInput(){
        const batch = uniq(String(input).split(","));
        if(!batch.length) return;
        const next = uniq([...current, ...batch]);
        store.setDraftPatterns(nsKey, next);
        onChange?.(next);
        setInput("");
    }

    function addChip(p){
        const n = normalizePattern(p);
        if(!n || current.includes(n)) return;
        const next = uniq([...current, n]);
        store.setDraftPatterns(nsKey, next);
        onChange?.(next);
    }

    function removeOne(p){
        const next = current.filter(x=>x!==p);
        console.log(JSON.stringify(next));
        store.setDraftPatterns(nsKey, next);
        onChange?.(next);
    }

    return (
        <div className="space-y-3">
            <div className="text-sm opacity-80">
                Patterns for <span className="font-mono">{ns?.name || ns?.id}</span>
                {loading && <span className="ml-2 opacity-60">loading…</span>}
                {saving && <span className="ml-2 opacity-60">saving…</span>}
            </div>

            {chips?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {chips.slice(0, maxChips).map(c => (
                        <button key={c} type="button"
                                className="text-xs px-2 py-1 rounded-xl border border-white/10 hover:bg-white/10"
                                onClick={() => addChip(c)}>
                            {c}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-2">
                <input
                    className="mm-input flex-1"
                    placeholder={`${nsBase || "ns"}:*  or  comma,separated`}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFromInput(); } }}
                />
                <button className="px-3 py-2 rounded-xl border border-white/10 hover:bg-white/10" onClick={addFromInput}>
                    Add
                </button>
            </div>

            <div>
                <div className="text-xs opacity-70 mb-1">Current patterns:</div>
                <div className="flex flex-wrap gap-2">
                    {current.length === 0 && <span className="text-xs opacity-50">—</span>}
                    {current.map(p => (
                        <span key={p} className="text-xs px-2 py-1 rounded-xl bg-white/8 border border-white/10">
                            {p}
                            <button
                                type="button"
                                className="ml-2 opacity-70 hover:opacity-100"
                                onClick={() => removeOne(p)}
                                aria-label="remove pattern"
                            >×</button>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default KeyPatternBuilderSingleNs;
