"use client";
import NamespaceCard from "@/components/namespaces/NamespaceCard";

export default function NamespaceList({ items, onOpen, onToggleFreeze }) {
    if (!items?.length) {
        return <div className="p-6 text-zinc-400">No namespaces yet. Create the first one.</div>;
    }
    return (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map(ns => (
                <NamespaceCard key={ns.id} ns={ns} onOpen={onOpen} onToggleFreeze={onToggleFreeze} />
            ))}
        </div>
    );
}
