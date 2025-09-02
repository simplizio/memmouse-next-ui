// src/components/patterns/PatternList.js
"use client";

import React, { useMemo } from "react";

function ColonWrap({ text }) {
    if (!text) return <span className="opacity-70">*</span>;
    const parts = String(text).split(":");
    return (
        <span className="break-words">
            {parts.map((seg, i) => (
                     <React.Fragment key={i}>
                           <span>{seg}</span>
                           {i < parts.length - 1 && <>:<wbr/></>}
                         </React.Fragment>
                   ))}
        </span>
    );
}

/**
 * Группирует ключи вида "ns:a:b:c" по первым prefixDepth сегментам
 * и рисует адаптивной сеткой (auto-fit, minmax).
 *
 * props:
 *  - patterns: string[]   // список ключей
 *  - prefixDepth?: number // глубина группировки (по умолчанию авто/2)
 *  - className?: string
 */
export default function PatternList({
                                        patterns = [],
                                        prefixDepth,                // (опция) жёстко ограничить глубину префикса
                                        minColWidth = 220,          // ширина колонки
                                        showCounts = true,          // бейдж с количеством
                                        maxGroupSize = 10,          // если в группе больше — делим глубже
                                        maxDepth = 4,               // предохранитель от слишком глубокой рекурсии
                                        className = "",
                                    }) {

    const norm = useMemo(() => {
        const seen = new Set();
        const out = [];
        for (const raw of patterns) {
            const s = String(raw || "").trim();
            if (!s) continue;
            if (seen.has(s)) continue;
            seen.add(s);
            out.push(s);
        }
        return out;
    }, [patterns]);

    // // авто-выбор глубины группировки: если у >=2 ключей совпадают первые два сегмента — берем 2, иначе 1
    // const depth = useMemo(() => {
    //     if (typeof prefixDepth === "number") return Math.max(1, prefixDepth);
    //     const freq = new Map(); // "seg0:seg1" -> count
    //     for (const p of norm) {
    //         const parts = p.split(":");
    //         if (parts.length >= 2) {
    //             const k = `${parts[0]}:${parts[1]}`;
    //             freq.set(k, (freq.get(k) || 0) + 1);
    //         }
    //     }
    //     for (const [, cnt] of freq) {
    //         if (cnt >= 2) return 2;
    //     }
    //     return 1;
    // }, [norm, prefixDepth]);

    // const groups = useMemo(() => {
    //     const map = new Map(); // groupKey -> suffixes[]
    //     for (const p of norm) {
    //         const parts = p.split(":");
    //         if (parts.length <= depth) {
    //             const key = parts.join(":");
    //             const arr = map.get(key) || [];
    //             arr.push(""); // нет суффикса
    //             map.set(key, arr);
    //             continue;
    //         }
    //         const key = parts.slice(0, depth).join(":");
    //         const suffix = parts.slice(depth).join(":");
    //         const arr = map.get(key) || [];
    //         arr.push(suffix);
    //         map.set(key, arr);
    //     }
    //     // отсортируем группы и элементы в них для стабильного вида
    //     return Array.from(map.entries())
    //         .sort((a, b) => a[0].localeCompare(b[0]))
    //         .map(([k, arr]) => [k, arr.sort((x, y) => x.localeCompare(y))]);
    // }, [norm, depth]);

    // // строим префиксное дерево по сегментам "a:b:c"
    // const trie = useMemo(() => {
    //         const root = { children: new Map(), count: 0 };
    //         function insert(parts) {
    //             let node = root;
    //             node.count++;
    //             for (const seg of parts) {
    //                 if (!node.children.has(seg)) node.children.set(seg, { children: new Map(), count: 0 });
    //                 node = node.children.get(seg);
    //                 node.count++;
    //             }
    //         }
    //         for (const p of norm) insert(p.split(":"));
    //         return root;
    //     }, [norm]);

    // const groups = useMemo(() => {
    //       const map = new Map(); // prefixKey -> suffixes[]
    //       for (const p of norm) {
    //             const parts = p.split(":");
    //             const [pre, suf] = splitByBranch(parts);
    //             const key = pre.join(":") || parts[0] || ""; // fallback на первый сегмент
    //             const arr = map.get(key) || [];
    //             arr.push(suf.join(":")); // может быть пустая строка — это «точное совпадение префикса»
    //             map.set(key, arr);
    //           }
    //       return Array.from(map.entries())
    //            .sort((a, b) => a[0].localeCompare(b[0]))
    //         .map(([k, arr]) => [k, arr.sort((x, y) => x.localeCompare(y))]);
    //     }, [norm, splitByBranch]);


    // Находим LCP (общий префикс) у набора строк, работаем по сегментам ":"
    function lcpParts(list) {
        if (!list.length) return [];
        const split = list.map(s => s.split(":"));
        const minLen = Math.min(...split.map(a => a.length));
        const out = [];
        for (let i = 0; i < minLen; i++) {
            const seg = split[0][i];
            if (split.every(a => a[i] === seg)) out.push(seg);
            else break;
        }
        return out;
    }


    // Рекурсивное разбиение: {prefixParts, items[]} -> [[prefix, suffixes[]], ...]
    function buildGroups(list, baseParts = [], depth = 0) {
        if (!list.length) return [];
        // общий префикс на этом уровне
        const common = lcpParts(list);
        const prefix = [...baseParts, ...common];
        const suffixes = list.map(s => s.split(":").slice(prefix.length));

        // если всё уместно и/или достигли глубины — одна группа
        const canSplit = suffixes.some(parts => parts.length > 0);
        if (!canSplit || suffixes.length <= maxGroupSize || depth >= maxDepth) {
            const key = prefix.join(":") || (list[0].split(":")[0] || "");
            const flat = suffixes.map(parts => parts.join(":")); // "" = точное совпадение
            return [[key, flat.sort((a, b) => a.localeCompare(b))]];
        }

        // иначе — группируем по первому сегменту суффикса ("" тоже отдельная группа)
        const buckets = new Map(); // firstSeg -> strings[]
        for (let i = 0; i < list.length; i++) {
            const suf = suffixes[i];
            const first = suf[0] ?? "";
            const arr = buckets.get(first) || [];
            arr.push(list[i]); // целиком исходную строку
            buckets.set(first, arr);
        }

        // строим группы для каждого «первого сегмента»
        const out = [];
        for (const [first, bucket] of Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
            const nextBase = first === "" ? prefix : [...prefix, first];
            // если бакет всё ещё велик — рекурсивно делим дальше
            if (bucket.length > maxGroupSize && depth + 1 < maxDepth) {
                out.push(...buildGroups(bucket, nextBase, depth + 1));
            } else {
                const key = nextBase.join(":");
                const flat = bucket.map(s => s.split(":").slice(nextBase.length).join(":"));
                out.push([key, flat.sort((a, b) => a.localeCompare(b))]);
            }
        }
        return out;
    }
    const groups = useMemo(() => buildGroups(norm), [norm]);

    // helper: найти "точку ветвления" для конкретного ключа
    function splitByBranch(parts) {
        if (typeof prefixDepth === "number" && prefixDepth > 0) {
            const d = Math.min(prefixDepth, parts.length);
            return [parts.slice(0, d), parts.slice(d)];
        }
        let node = trie;
        let idx = 0;
        for (; idx < parts.length; idx++) {
            const seg = parts[idx];
            const next = node.children.get(seg);
            if (!next) break;
            // если у текущего узла >1 ребёнка — здесь уже было ветвление раньше,
            // но нам важно идти до точки, где у СЛЕДУЮЩЕГО узла начнётся ветка.
            node = next;
            // если у next более одного ребёнка — дальше начинается ветка, останавливаемся на текущем idx+1
            if (node.children.size > 1) { idx += 1; break; }
        }
        // idx — длина префикса-группы
        return [parts.slice(0, idx), parts.slice(idx)];
    }


    if (!norm.length) {
        return <div className={`text-xs opacity-70 ${className}`}>—</div>;
    }

    return (
        <div className={className}>
            <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minColWidth}px, 1fr))` }}
            >
                {groups.map(([gk, items]) => (
                    <div key={gk} className="rounded-lg border border-white/10 bg-white/5 p-2">
                        {/*<div className="text-[11px] font-semibold opacity-80 mb-1">*/}
                        {/*    <span className="font-mono">{gk}</span>{items.some(s => s) ? ":" : ""}*/}
                        {/*</div>*/}
                        <div className="text-[11px] mb-1 flex items-center gap-2">
                            <span className="font-mono font-bold"><ColonWrap text={gk || "∅"} /></span>
                            {items.some(s => s) && <span className="opacity-60">:</span>}
                            {showCounts &&
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-white/10">
                                    {items.length}
                                </span>}
                        </div>

                        {/*<ul className="text-xs opacity-80 font-mono space-y-0.5">*/}
                        <ul className="text-xs opacity-80 font-mono space-y-0.5 break-words [overflow-wrap:anywhere]">
                            {items.map((s, i) => (
                                <li key={`${gk}:${i}`}>
                                    {/*{s ? s : "*"}*/}
                                    {/*{s ? s : <span className="opacity-70">*</span>}*/}
                                    <ColonWrap text={s} />
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}
