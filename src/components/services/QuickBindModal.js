"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import BindingManager from "@/components/bindings/BindingManager";
import { useBindingManagerStore } from "@/store/BindingManagerStore";

export default function QuickBindModal({
                                           open = true,
                                           onClose,
                                           projectId,
                                           service,           // { id, name }
                                           namespaces = [],   // список всех доступных неймспейсов проекта
                                           existingNsIds,     // опционально: Set<string> уже привязанных ns к сервису (если есть сверху — используем, иначе подгрузим)
                                           onSaved,           // (binding) => void — уведомить родителя по факту сохранения одного биндинга (будет вызываться множественно)
                                       }) {
    const [existing, setExisting] = useState([]); // [{ nsId, serviceId, ... }]
    const [err, setErr] = useState(null);
    const [saving, setSaving] = useState(false);
    const serviceId = service?.id;

    const managerRef = useRef(null);

    // если сверху не передали Set уже привязанных, подгружаем сами
    useEffect(() => {
        if (!open || !projectId || !serviceId) return;
        if (existingNsIds instanceof Set) return; // используем внешний источник
        (async () => {
            try {
                setErr(null);
                const r = await fetch(`/api/projects/${projectId}/services/${serviceId}/bindings`, { cache: "no-store" });
                const j = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
                setExisting(j.items || []);
            } catch (e) {
                setErr(String(e?.message || e));
            }
        })();
    }, [open, projectId, serviceId, existingNsIds instanceof Set]);

    // множество уже связанных nsId
    const normalizedExistingNsIds = useMemo(() => {
        if (existingNsIds instanceof Set) return existingNsIds;
        if (Array.isArray(existing) && existing.length) {
            const ids = existing.map(x => x?.nsId || x?.ns?.id).filter(Boolean);
            return new Set(ids);
        }
        return new Set();
    }, [existingNsIds, existing]);

    // доступные для быстрого привязывания ns (фильтруем уже связанные)
    const available = useMemo(() => {
        const bound = normalizedExistingNsIds;
        return (namespaces || []).filter(ns => !bound.has(ns.id));
    }, [namespaces, normalizedExistingNsIds]);

    async function saveCreate() {
        setErr(null); setSaving(true);
        try {
            const bm = useBindingManagerStore.getState();
            const selected = bm.getSelectedNsIds ? Array.from(bm.getSelectedNsIds()) : [];
            if (!selected.length) throw new Error("Select at least one namespace");

            // сохраняем ВСЁ через BindingManagerStore (он знает драфты, паттерны и т.д.)
            await bm.saveAll({ projectId, serviceId });

            // при необходимости — уведомим родителя о каждом сохранённом биндинге
            if (typeof onSaved === "function" && bm.getSelectedDrafts) {
                const savedDrafts = bm.getSelectedDrafts();
                for (const d of savedDrafts) {
                    onSaved({
                        projectId,
                        nsId: d.nsId,
                        serviceId,
                        serviceName: service?.name || serviceId,
                        keyPatterns: d.keyPatterns || [],
                        permissions: d.permissions || { read: true, write: true },
                        rate: d.rate || { readRps:0, writeRps:0 },
                        bandwidth: d.bandwidth || { readKbps:0, writeKBps: 0 },
                        updatedAt: Date.now(),
                        createdAt: Date.now(),
                    });
                }
            }

            onClose?.();
        } catch (e) {
            setErr(String(e?.message || e));
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* overlay */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            {/* modal */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="relative mm-glass rounded-2xl w-full max-w-3xl border border-white/10">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                        <div className="text-lg font-semibold">
                            Bind namespaces to {service?.name || service?.id}
                        </div>
                        <button onClick={onClose} className="px-2 py-1 rounded-xl hover:bg-white/10">✕</button>
                    </div>

                    <div className="px-5 pt-3 pb-5 max-h-[70vh] overflow-y-auto">
                        <div className="text-xs text-zinc-400 mb-3">
                            This only configures key patterns and limits; ACL presets are applied at the service level.
                        </div>

                        <BindingManager
                            ref={managerRef}
                            projectId={projectId}
                            serviceId={serviceId}
                            namespaces={available}
                            initialBindings={[]} // создаём новые
                            onSavedOne={(b) => onSaved?.(b)}
                        />

                        {err && (
                            <div className="mt-3 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                                {err}
                            </div>
                        )}
                    </div>

                    <div className="px-5 py-3 border-t border-white/10 flex items-center justify-end gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button onClick={saveCreate} disabled={saving}>
                            {saving ? "Saving…" : "Save"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
