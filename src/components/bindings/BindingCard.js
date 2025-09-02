// src/components/bindings/BindingCard.js
"use client";

import { Button } from "@/components/ui/button";
import PatternList from "@/components/patterns/PatternList";
import PatternPrefixTreeView from "@/components/patterns/PatternPrefixTreeView";

function formatPerms(perms) {
    if (!perms) return "—";
    if (typeof perms === "string") return perms.toUpperCase();
    if (Array.isArray(perms)) return perms.join("").toUpperCase();
    const out = [];
    if (perms.read) out.push("R");
    if (perms.write) out.push("W");
    return out.length ? out.join("") : "—";
}
function formatPatterns(binding, ns) {
    const list = binding?.keyPatterns?.length
        ? binding.keyPatterns
        : (ns?.prefix ? [`${ns.prefix}:*`] : []);
    return list.length ? list.join(", ") : "—";
}

export default function BindingCard({ projectId, serviceId, ns, binding, onOpenNs, onEdit, onUnbind }) {
    return (
        <div className="mm-glass rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div>
                        <div className="font-medium">{ns?.name || ns?.id}</div>
                        <div className="text-xs opacity-70 font-mono">{ns?.prefix || "—"}</div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded border border-white/10 bg-white/5">
                        {formatPerms(binding?.permissions)}
                    </span>
                    {!!binding?.rate && (
                        <span className="text-xs opacity-80">
                          r/w: {binding.rate.readRps || 0}/{binding.rate.writeRps || 0}
                        </span>
                    )}
                    {!!binding?.bandwidth && (
                        <span className="text-xs opacity-80">
                          kbps r/w: {binding.bandwidth.readKBps || 0}/{binding.bandwidth.writeKBps || 0}
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => onOpenNs?.(ns)}>Open namespace</Button>
                    <Button variant="ghost" onClick={() => onEdit?.({ ns, binding })}>Edit</Button>
                    <Button variant="ghost" onClick={() => onUnbind?.(ns?.id)}>Unbind</Button>
                </div>
            </div>
            <div className="mt-2">
                <div className="mt-2">
                    <div className="text-xs opacity-80 mb-1">Patterns:</div>
                    <PatternPrefixTreeView
                     rootLabel={ns?.prefix || ns?.id}
                     patterns={binding?.keyPatterns?.length ? binding.keyPatterns : (ns?.prefix ? [`${ns.prefix}:*`] : [])}
                     maxInitialExpandedDepth={1}
                    />
                </div>
            </div>
        </div>
    );
}
