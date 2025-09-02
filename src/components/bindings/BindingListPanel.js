// src/components/bindings/BindingListPanel.js
"use client";

import { useEffect, useMemo } from "react";
import BindingCard from "./BindingCard";
import { Button } from "@/components/ui/button";
import { useBindingListStore } from "@/store/BindingListStore";
import { useServiceDetailsStore } from "@/store/ServiceDetailsStore";

export default function BindingListPanel({
                                             projectId,
                                             serviceId,
                                             onEditBinding,     // (ctx) => void
                                             onOpenQuickBind,   // () => void
                                             onOpenNamespace,   // (ns) => void
                                         }) {
    const rows = useServiceDetailsStore(s => s.bindings); // подписка на родителя
    const { items, setFromService, unbind, refreshOne } = useBindingListStore();

    // синхронизируем локальный список с родительским снимком
    useEffect(() => {
        setFromService(rows || []);
    }, [rows, setFromService]);

    const hasItems = useMemo(() => !!(items && items.length), [items]);

    async function handleUnbind(nsId) {
        try {
            await unbind(projectId, serviceId, nsId);
        } catch (e) {
            alert(String(e?.message || e));
        }
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Bindings</h2>
                <Button variant="ghost" onClick={onOpenQuickBind}>+ Bind namespace</Button>
            </div>

            {!hasItems && <div className="p-3 text-zinc-400">No bindings yet.</div>}

            {hasItems && (
                <div className="grid gap-2">
                    {items.map(({ ns, binding }) => (
                        <BindingCard
                            key={ns.id}
                            projectId={projectId}
                            serviceId={serviceId}
                            ns={ns}
                            binding={binding}
                            onOpenNs={onOpenNamespace}
                            onEdit={onEditBinding}
                            onUnbind={handleUnbind}
                        />
                    ))}
                </div>
            )}
        </>
    );
}
