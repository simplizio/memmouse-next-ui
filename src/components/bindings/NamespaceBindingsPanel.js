"use client";

import NamespaceBindingCard from "@/components/bindings/NamespaceBindingCard";

export default function NamespaceBindingsPanel({
                                                   projectId, ns, bindings = [], services = [],
                                                   onOpenService, onEdit, onUnbind,
                                               }) {
    const hasItems = (bindings || []).length > 0;

    return (
        <div className="space-y-3">
            {!hasItems && <div className="p-3 text-zinc-400">No bindings yet.</div>}

            {hasItems && (
                <div className="grid gap-2">
                    {bindings.map((b) => {
                        const svc = (services || []).find(s => s.id === b.serviceId);
                        return (
                            <NamespaceBindingCard
                                key={b.serviceId}
                                projectId={projectId}
                                ns={ns}
                                binding={b}
                                service={svc}
                                onOpenService={onOpenService}
                                onEdit={onEdit}
                                onUnbind={onUnbind}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
