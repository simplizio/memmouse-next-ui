"use client";

import { Button } from "@/components/ui/button";

function permsLabel(p) {
    if (p == null) return "—";
    if (typeof p === "string") return p.toUpperCase();
    if (typeof p === "object") {
        const r = p.read ? "R" : "";
        const w = p.write ? "W" : "";
        return (r + w) || "—";
    }
    return String(p);
}

function Chip({ children }) {
    return (
        <span className="px-2 py-0.5 rounded-xl text-xs font-mono bg-white/5 border border-white/10">
      {children}
    </span>
    );
}

/**
 * items: [
 *   {
 *     serviceId: string,
 *     serviceName?: string,
 *     keyPatterns?: string[],
 *     permissions?: { read?: boolean, write?: boolean } | "rw" | "r" | "w",
 *     updatedAt?: number
 *   }
 * ]
 */
export default function NamespaceBindingsList({ items = [], onUnbind, onEdit }) {
    if (!items || items.length === 0) {
        return <div className="p-3 mm-glass rounded-xl text-zinc-400">No bindings yet.</div>;
    }

    return (
        <div className="grid gap-2">
            {items.map((b) => (
                <div
                    key={b.serviceId}
                    className="mm-glass rounded-xl p-3 border border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="font-semibold truncate">
                                {b.serviceName || b.serviceId}
                            </div>
                            <Chip>{permsLabel(b.permissions)}</Chip>
                            {b.updatedAt ? (
                                <span className="text-xs opacity-60">
                  • {new Date(b.updatedAt).toLocaleString()}
                </span>
                            ) : null}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-1">
                            {(b.keyPatterns || []).map((p, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-xl text-xs font-mono bg-white/5 border border-white/10">
                  {p}
                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {onEdit ? (
                            <Button variant="ghost" onClick={() => onEdit(b)}>Edit</Button>
                        ) : null}
                        {onUnbind ? (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    if (confirm("Unbind this service from the namespaces?")) onUnbind(b);
                                }}
                            >
                                Unbind
                            </Button>
                        ) : null}
                    </div>
                </div>
            ))}
        </div>
    );
}


// "use client";
// import { Button } from "@/components/ui/button";
//
// export default function NamespaceBindingsList({ items, onUnbind, onEdit }) {
//     if (!items?.length) return <div className="p-4 text-zinc-400">No services bound yet.</div>;
//     return (
//         <div className="grid gap-2">
//             {items.map((b) => (
//                 <div key={b.serviceId} className="mm-glass rounded-xl p-3 flex items-center gap-3">
//                     <div className="font-semibold">{b.serviceName || b.serviceId}</div>
//                     <span className="text-xs opacity-80 px-2 py-0.5 rounded border border-white/10 bg-white/5">
//             {b.permissions || "R"}
//           </span>
//                     {!!b.patterns?.length && (
//                         <div className="text-xs opacity-80 truncate">patterns: {b.patterns.join(", ")}</div>
//                     )}
//                     <div className="ml-auto flex gap-2">
//                         <Button variant="ghost" onClick={() => onEdit?.(b)}>Edit</Button>
//                         <Button variant="ghost" onClick={() => onUnbind?.(b)}>Unbind</Button>
//                     </div>
//                 </div>
//             ))}
//         </div>
//     );
// }
