"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import BindingWidget from "@/components/bindings/BindingWidget";
import { useBindingWidgetStore } from "@/store/BindingWidgetStore";

// helper: нормализовать permissions к коду "R" | "W" | "RW"
function permsToCode(perms) {
    if (!perms) return "RW";
    if (typeof perms === "string") return perms.toUpperCase();
    const r = !!perms.read, w = !!perms.write;
    return r && w ? "RW" : (w ? "W" : "R");
}

export default function BindingEditModal({
                                             open,
                                             projectId,
                                             serviceId,
                                             ns,              // { id, name }
                                             binding,         // существующий биндинг { permissions, rate, bandwidth, keyPatterns, ... }
                                             onClose,
                                             onSaved,
                                         }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const {saveOne, hydrate} = useBindingWidgetStore();

    const nsKey = useMemo(
        () => (projectId && ns?.id && serviceId) ? `${projectId}:${ns.id}:${serviceId}` : "",
        [projectId, ns?.id, serviceId]
    );

    // При открытии модалки — гидрим сторы текущим значением биндинга,
    // чтобы BindingWidget показывал актуальные данные и saveOne() знал, что сохранять.
    useEffect(() => {
        if (!open || !nsKey) return;

        // const bindingStore = useBindingWidgetStore.getState();
        //bindingStore.hydrate(nsKey, binding || {});
        hydrate(nsKey, binding || {});

    }, [open, nsKey, binding]);

    async function save() {
        setSaving(true); setError(null);
        try {
            // const bw = useBindingWidgetStore.getState();
            const saved = await saveOne({
                projectId,
                nsId: ns.id,
                serviceId,
                nsKey,
            });
            onSaved?.(saved);
            onClose?.();
        } catch (e) {
            setError(String(e?.message || e));
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-3xl mm-glass rounded-2xl border border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">
                        Edit binding — {ns?.name || ns?.id} —&gt; {serviceId}
                    </h3>
                    <button
                        className="px-2 py-1 rounded border border-white/10 hover:bg-white/10"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                {/* Самостоятельный виджет — источник правды по форме */}
                <div className="mt-2">
                    <BindingWidget
                        open
                        projectId={projectId}
                        serviceId={serviceId}
                        ns={ns}
                        initial={binding}              // отрисовать актуальные значения
                        onSaved={onSaved}              // если виджет сам сохранит (например, по своей кнопке)
                    />
                </div>

                {error && (
                    <div className="mt-3 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                        {error}
                    </div>
                )}

                <div className="mt-4 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button onClick={save} disabled={saving}>
                        {saving ? "Saving…" : "Save changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
