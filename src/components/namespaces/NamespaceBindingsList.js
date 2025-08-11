"use client";
import { Button } from "@/components/ui/button";

export default function NamespaceBindingsList({ items, onUnbind, onEdit }) {
    if (!items?.length) return <div className="p-4 text-zinc-400">No services bound yet.</div>;
    return (
        <div className="grid gap-2">
            {items.map((b) => (
                <div key={b.serviceId} className="mm-glass rounded-xl p-3 flex items-center gap-3">
                    <div className="font-semibold">{b.serviceName || b.serviceId}</div>
                    <span className="text-xs opacity-80 px-2 py-0.5 rounded border border-white/10 bg-white/5">
            {b.permissions || "R"}
          </span>
                    {!!b.patterns?.length && (
                        <div className="text-xs opacity-80 truncate">patterns: {b.patterns.join(", ")}</div>
                    )}
                    <div className="ml-auto flex gap-2">
                        <Button variant="ghost" onClick={() => onEdit?.(b)}>Edit</Button>
                        <Button variant="ghost" onClick={() => onUnbind?.(b)}>Unbind</Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
