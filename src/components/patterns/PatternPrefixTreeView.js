// src/components/patterns/PatternPrefixTreeView.js
"use client";
import React, { useMemo, useState, useCallback } from "react";

/** Мягкий перенос по двоеточиям */
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

/** Построить trie по списку строк */
function buildTrie(patterns) {
    const root = { name: "", children: new Map(), leaf: false, count: 0 };
    const add = (key) => {
        const parts = String(key || "").trim().split(":").filter(Boolean);
        let node = root;
        node.count++;
        if (!parts.length) { node.leaf = true; return; }
        for (const seg of parts) {
            if (!node.children.has(seg)) node.children.set(seg, { name: seg, children: new Map(), leaf: false, count: 0 });
            node = node.children.get(seg);
            node.count++;
        }
        node.leaf = true;
    };
    for (const k of patterns) add(k);
    return root;
}

/**
 * Дерево префиксов:
 *  - patterns: string[]
 *  - rootLabel?: string (заголовок корня)
 *  - className?: string
 *  - maxInitialExpandedDepth?: number (по умолчанию 1)
 */
export default function PatternPrefixTreeView({
                                                  patterns = [],
                                                  rootLabel = "",
                                                  className = "",
                                                  maxInitialExpandedDepth = 1,
                                              }) {
    // нормализация: убрать пустые/дубликаты
    const unique = useMemo(() => {
        const seen = new Set(); const out = [];
        for (const p of patterns) {
            const s = String(p || "").trim();
            if (!s || seen.has(s)) continue;
            seen.add(s); out.push(s);
        }
        return out;
    }, [patterns]);

    const trie = useMemo(() => buildTrie(unique), [unique]);

    // какие узлы развернуты (ключ — путь "a:b:c")
    const [open, setOpen] = useState(() => {
        // по умолчанию раскрываем до указанной глубины
        const o = new Set();
        function dfs(node, path, depth) {
            const key = path.join(":");
            if (depth <= maxInitialExpandedDepth) o.add(key);
            node.children.forEach((child, seg) => dfs(child, [...path, seg], depth + 1));
        }
        dfs(trie, [], 0);
        return o;
    });

    const toggle = useCallback((pathKey) => {
        setOpen(prev => {
            const next = new Set(prev);
            if (next.has(pathKey)) next.delete(pathKey);
            else next.add(pathKey);
            return next;
        });
    }, []);

    function Node({ node, path }) {
        const key = path.join(":");
        const children = Array.from(node.children.entries())
            .sort((a, b) => a[0].localeCompare(b[0]));
        const hasChildren = children.length > 0;
        const isOpen = open.has(key);

        // листья, у которых нет детей и которые соответствуют точному ключу
        const isLeaf = node.leaf && !hasChildren;

        return (
            <div className="pl-3">
                {path.length > 0 && (
                    <div className="flex items-center gap-1 py-0.5">
                        {hasChildren ? (
                            <button
                                type="button"
                                onClick={() => toggle(key)}
                                className="w-5 h-5 inline-flex items-center justify-center rounded hover:bg-white/10 text-xs border border-white/10"
                                aria-label={isOpen ? "Collapse" : "Expand"}
                                title={isOpen ? "Collapse" : "Expand"}
                            >
                                {isOpen ? "−" : "+"}
                            </button>
                        ) : (
                            <span className="w-5 h-5 inline-flex items-center justify-center text-xs opacity-40">•</span>
                        )}

                        <div className="flex items-center gap-2">
                          <span className={`font-mono ${hasChildren ? "font-semibold" : ""}`}>
                            <ColonWrap text={node.name} />
                          </span>
                            {hasChildren && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-white/10">
                                  {node.count}
                                </span>
                            )}
                            {isLeaf && <span className="text-[10px] opacity-60">(leaf)</span>}
                        </div>
                    </div>
                )}

                {hasChildren && isOpen && (
                    <div className="border-l border-white/10 ml-2">
                        {children.map(([seg, child]) => (
                            <Node key={seg} node={child} path={[...path, seg]} />
                        ))}
                    </div>
                )}

                {/* помечаем точное совпадение префикса: когда у узла leaf=true, рендерим '*' */}
                {node.leaf && hasChildren && isOpen && (
                    <div className="pl-7 py-0.5 text-xs opacity-80 font-mono">
                        <span className="opacity-70">*</span>
                    </div>
                )}
            </div>
        );
    }

    if (!unique.length) {
        return <div className={`text-xs opacity-70 ${className}`}>—</div>;
    }

    return (
        <div className={`rounded-lg border border-white/10 bg-white/5 p-2 ${className}`}>
            {rootLabel && (
                <div className="text-[11px] font-mono font-bold mb-1">
                    <ColonWrap text={rootLabel} />
                    <span className="opacity-60"> :</span>
                </div>
            )}
            {/* корневые дети */}
            <div>
                {Array.from(trie.children.keys()).length === 0 ? (
                    <div className="text-xs font-mono opacity-80">*</div>
                ) : (
                    Array.from(trie.children.entries())
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([seg, child]) => (
                            <Node key={seg} node={child} path={[seg]} />
                        ))
                )}
            </div>
        </div>
    );
}
