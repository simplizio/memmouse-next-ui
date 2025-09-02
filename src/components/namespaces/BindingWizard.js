"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import {useBindingWizardStore} from "@/store/BindingWizardStore";
import BindingWidget from "@/components/bindings/BindingWidget";

export default function BindingWizard({ open, onClose, projectId, nsId, onSaved }) {
    const bindingWizardStore = useBindingWizardStore();
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);

    useEffect(() => { if (open) bindingWizardStore.init(projectId, nsId); }, [open, projectId, nsId]);

    const selectableServices = useMemo(() => {
            const bound = bindingWizardStore.boundServiceIds || new Set();
            return (bindingWizardStore.services || []).filter(s => !bound.has(s.id));
          }, [bindingWizardStore.services, bindingWizardStore.boundServiceIds]);

    async function save() {
        try {
            const saved = await bindingWizardStore.save(onSaved);
            onClose?.();
        } catch (e) {
            setErr(String(e?.message || e));
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    const title = `Bind service to namespace ${nsId}`;

    return (
        <Modal open={open} onClose={onClose} title={title}>
            <div className="space-y-4">
                {/* Шаг 1 — выбор сервиса (только при create) */}

                {bindingWizardStore.step === 1 ? (
                    <Row label="Service">
                        <select
                            className="mm-input w-full"
                            value={bindingWizardStore.selectedServiceId}
                            onChange={(e) => useBindingWizardStore.getState().setSelectedService(e.target.value)}
                        >
                            {!selectableServices.length && <option value="">— no available services —</option>}
                            {selectableServices.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name || s.id} ({s.id})
                                </option>
                            ))}
                        </select>
                    </Row>
                ) : null}

                {/* Шаг 2 — редактор */}
                {bindingWizardStore.step === 2 && (
                    <>
                        <BindingWidget
                            projectId={projectId}
                            ns={{id:nsId}}
                            serviceId={useBindingWizardStore.getState().selectedServiceId}
                        />
                    </>
                )}

                {err && (
                    <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{err}</div>
                )}

                <div className="flex justify-between gap-2 pt-2">
                    <div />
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        {bindingWizardStore.step === 1 ? (
                            <Button onClick={()=>useBindingWizardStore.setState({ step: 2 })} disabled={!bindingWizardStore.selectedServiceId}>Next</Button>
                    ) : (
                            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}

function Row({ label, children }) {
    return (
        <label className="grid grid-cols-[180px_1fr] items-center gap-3">
            <span className="opacity-80">{label}</span>
            {children}
        </label>
    );
}
