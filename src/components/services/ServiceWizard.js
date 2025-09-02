"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import { Button } from "@/components/ui/button";
import CopyField from "@/components/ui/CopyField";
import BindingManager from "@/components/bindings/BindingManager";
import {useServiceWizardStore} from "@/store/ServiceWizardStore";
import {useBindingManagerStore} from "@/store/BindingManagerStore";

function Chip({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`px-2 py-1 rounded-xl border text-sm transition
        ${active
                ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,.25)]"
                : "bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10"}`}
        >
            {children}
        </button>
    );
}

function StepHeader({ step, total, title, subtitle }) {
    return (
        <div className="mb-3">
            <div className="text-xs uppercase opacity-60">Step {step} of {total}</div>
            <div className="text-lg font-semibold">{title}</div>
            {subtitle && <div className="text-sm text-zinc-400">{subtitle}</div>}
        </div>
    );
}

export default function ServiceWizard({ open, onClose, projectId, onCreated }) {
    const [step, setStep] = useState(1);
    const total = 4; // Basics, ACL, Bindings, Review

    // сторы
    const swStore = useServiceWizardStore();      // источник правды для Basics/ACL
    const bmStore = useBindingManagerStore();     // только для сброса при открытии

    // Step 1 — Basics
    const [scopeDefs, setScopeDefs] = useState([]);
    // читаем прямо из стора визарда
    const basics = swStore.basics; // { name, scopes, description }

    // Step 2 — ACL
    const acl = swStore.acl;       // { presets, extra }
    const [presets, setPresets] = useState([]);

    const extraText = useMemo(
        () => (acl.extra || []).join(","),
        [acl.extra]
    );

    // локальный текстовый инпут extra → парсим в список и пишем в стор
    const handleExtraText = (text) => {
        const list = text.split(",").map(s => s.trim()).filter(Boolean);
        swStore.setAcl({ extra: list });
    };

    const [aclPreview, setAclPreview] = useState(null);
    const [aclError, setAclError] = useState(null);

    // Step 3 — Bindings
    const [nsList, setNsList] = useState([]);

    // Превью выбранных биндингов (шаг 4)
    const [bmDraft, setBmDraft] = useState([]); // [{nsId, keyPatterns, permissions, rate, bandwidth}]

    // Review
    const [applyNow, setApplyNow] = useState(true);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [created, setCreated] = useState(null);
    const [applyResult, setApplyResult] = useState(null);

    useEffect(() => {
        if (!open) return;

        // reset local UI
        resetAll();

        // чистим сторы шагов
        swStore.reset();
        swStore.resetBindingManager();

        // scopes
        fetch("/api/scopes")
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(({items}) => setScopeDefs(items || []))
            .catch(() => setScopeDefs([]));

        // ACL presets
        fetch("/api/acl/presets")
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(({ items }) => setPresets(items || []))
            .catch(() => setPresets([]));

        // namespaces для шагa 3
        if (projectId) {
            fetch(`/api/projects/${projectId}/namespaces`, { cache: "no-store" })
                .then(r => r.ok ? r.json() : { items: [] })
                .then(j => setNsList(j.items || []))
                .catch(() => setNsList([]));
        }
    }, [open, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

    function togglePreset(name) {
        const cur = acl.presets || [];
        const next = cur.includes(name) ? cur.filter(n => n !== name) : [...cur, name];
        swStore.setAcl({ presets: next });
    }

    async function doPreviewAcl() {
        setAclError(null);
        setAclPreview(null);
        try {
            // формальный превью ACL: отрисуем выбранные пресеты и экстра в текстовом виде
            const preview = [
                "ACL SETUSER <svc:user>",
                "  reset",
                "  on",
                ...(acl.presets?.length ? [`  # presets: ${acl.presets.join(", ")}`] : []),
                ...(acl.extra?.length ? [`  # extra: ${acl.extra.join(", ")}`] : []),
                "  resetchannels",
                "  resetkeys",
                "  ~<patterns from bindings>",
                "  > <secret>"
            ].join("\n");

            setAclPreview({ preview });
        } catch (e) {
            setAclError(String(e?.message || e));
        }
    }

    function goNext() {
        if (step === 1) {
            if (!basics.name?.trim()) { setError("Service name is required"); return; }

            // seed ACL presets из scopes, если пользователь ещё ничего не выбрал
            if ((!acl.presets || !acl.presets.length) && scopeDefs.length) {
                const set = new Set();
                (basics.scopes || []).forEach(n => {
                    const def = scopeDefs.find(x => x.name === n);
                    (def?.defaultPresets || []).forEach(p => set.add(p));
                });
                if (set.size) swStore.setAcl({ presets: Array.from(set) });
            }
            setStep(2);

        } else if (step === 2) {
            setStep(3);

        } else if (step === 3) {
            setBmDraft(swStore.getSelectedBindingDrafts());
            setStep(4);
        }
    }

    function goBack() {
        if (step > 1) setStep(step - 1);
    }

    async function finalizeCreate() {
        setSaving(true); setError(null); setCreated(null); setApplyResult(null);
        try {
            // 1) создать сервис (Basics/ACL — из стора визарда)
            const body = {
                name: (basics.name || "").trim(),
                scopes: basics.scopes || [],
                description: (basics.description || "").trim() || undefined,
                desiredAcl: { presets: acl.presets || [], extra: acl.extra || [] },
            };

            const r1 = await fetch(`/api/projects/${projectId}/services`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
            });
            const j1 = await r1.json();
            if (!r1.ok) throw new Error(j1?.error || `HTTP ${r1.status}`);
            const service = j1?.service || j1;
            const serviceId = service?.id;
            setCreated(service);
            if (!serviceId) throw new Error("Cannot detect created service ID");

            // 2) сохранить все биндинги (через BindingManager)
            await swStore.saveAllBindings(projectId, serviceId, nsList);

            // 3) применить ACL сейчас (опционально)
            if (applyNow) {
                const r3 = await fetch(`/api/projects/${projectId}/services/${serviceId}/acl/apply`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ presets: acl.presets || [], extra: acl.extra || [] }),
                });
                const j3 = await r3.json();
                if (!r3.ok) throw new Error(j3?.error || `ACL apply HTTP ${r3.status}`);
                setApplyResult(j3);
            }

            setSaving(false);
            onCreated?.(service);

        } catch (e) {
            setSaving(false);
            setError(String(e?.message || e));
        }
    }

    if (!open) return null;

    // внутри компонента ServiceWizard: локальный UI-ресет (стор не трогаем здесь)
    function resetAll() {
        setStep(1);
        setError(null);
        setSaving(false);
        setCreated(null);
        setApplyResult(null);
        setAclPreview(null);
        setAclError(null);
        setBmDraft([]);
        setApplyNow(true);
    }

    function handleClose() {
        resetAll();
        swStore.reset();
        bmStore.resetAll();
        onClose?.();
    }

    // удобные шорткаты для рендера
    const nameVal = basics.name || "";
    const scopesVal = basics.scopes || [];
    const descVal = basics.description || "";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative mm-glass rounded-2xl p-5 w-full max-w-3xl border border-white/10">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-semibold">Create service</div>
                    <button onClick={onClose} className="px-2 py-1 rounded-xl hover:bg-white/10">✕</button>
                </div>

                {/* Stepper */}
                <div className="text-xs opacity-70">Step {step} of {total}</div>

                {/* Steps */}
                {step === 1 && (
                    <>
                        <StepHeader step={1} total={total} title="Basics"
                                    subtitle="Name, scopes, and a short description for your teammates." />

                        <div className="grid gap-3">
                            <div>
                                <div className="text-sm mb-1 opacity-80">Name</div>
                                <input
                                    className="mm-input w-full"
                                    placeholder="your-api"
                                    value={nameVal}
                                    onChange={e => swStore.setBasics({ name: e.target.value })}
                                />
                            </div>

                            <div>
                                <div className="text-sm mb-1 opacity-80">Scopes</div>
                                <div className="grid sm:grid-cols-2 gap-2">
                                    {scopeDefs.map(s => {
                                        const active = scopesVal.includes(s.name);
                                        return (
                                            <label key={s.name}
                                                   className={`mm-glass rounded-xl p-3 border cursor-pointer transition
                                                   ${active
                                                       ? "border-emerald-400/40 bg-emerald-500/10"
                                                       : "border-white/10 hover:bg-white/5"}`}>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        className="mm-checkbox"
                                                        checked={active}
                                                        onChange={() => {
                                                            const next = active
                                                                ? scopesVal.filter(n => n !== s.name)
                                                                : [...scopesVal, s.name];
                                                            swStore.setBasics({ scopes: next });
                                                        }}
                                                    />
                                                    <div className="font-medium">{s.title || s.name}</div>
                                                </div>
                                                <div className="text-xs opacity-70 mt-1">{s.desc}</div>
                                                <div className="text-[11px] opacity-60 mt-1">
                                                    Seeds ACL presets: {(s.defaultPresets || []).join(", ") || "—"}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                <div className="text-xs text-zinc-400 mt-1">
                                    Scopes are service capabilities (e.g. <span className="font-mono">kv.read</span>, <span className="font-mono">kv.write</span>).
                                    They do <strong>not</strong> define key prefixes; prefixes are configured per namespace on the Bindings step.
                                </div>
                            </div>

                            <div>
                                <div className="text-sm mb-1 opacity-80">Description (optional)</div>
                                <textarea
                                    className="mm-input w-full min-h-[80px]"
                                    placeholder="What this service does…"
                                    value={descVal}
                                    onChange={e => swStore.setBasics({ description: e.target.value })}
                                />
                            </div>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <StepHeader step={2} total={total} title="Access Control (ACL)"
                                    subtitle="Select presets and optional extra commands. This records desired ACL for the service." />
                        <div className="grid gap-3">
                            <div>
                                <div className="text-sm font-medium mb-2">Presets</div>
                                <div className="flex flex-wrap gap-2">
                                    {presets.map(p => (
                                        <Chip key={p.name}
                                              active={(acl.presets || []).includes(p.name)}
                                              onClick={() => togglePreset(p.name)}
                                        >
                                            {p.name}
                                        </Chip>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm mb-1 opacity-80">Extra ACL commands (comma-separated)</div>
                                <input
                                    className="mm-input w-full"
                                    placeholder="+xread,+xreadgroup"
                                    value={extraText}
                                    onChange={e => handleExtraText(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={doPreviewAcl}>Preview</Button>
                                {aclError && <div className="text-sm text-red-300">{aclError}</div>}
                            </div>
                            {aclPreview && (
                                <div className="mm-glass rounded-xl p-3 border border-white/10 text-xs">
                                    <div className="font-semibold mb-1">Preview</div>
                                    <pre className="whitespace-pre-wrap font-mono">{aclPreview.preview}</pre>
                                </div>
                            )}
                            <div className="text-xs text-zinc-400">
                                ACL will be applied to a Redis user. You can also apply it later from the service page.
                            </div>
                        </div>
                    </>
                )}

                {step === 3 && (
                    <>
                        <StepHeader step={3} total={total} title="Bindings"
                                    subtitle="Grant your service access to namespaces and key patterns." />
                        <div className="max-h-[60vh] overflow-auto pr-1">
                            <BindingManager
                                projectId={projectId}
                                serviceId={"__WILL_BE_SET_AFTER_CREATE__"}
                                namespaces={nsList}
                                initialBindings={[]}
                                onDraftChange={setBmDraft}
                            />
                        </div>
                    </>
                )}

                {step === 4 && (
                    <>
                        <StepHeader step={4} total={total} title="Review & Create"
                                    subtitle="We will create the service, add bindings, and optionally apply ACL now." />
                        <div className="grid gap-3 text-sm">
                            <div className="mm-glass rounded-xl p-3 border border-white/10">
                                <div className="font-semibold">Basics</div>
                                <div>Name: <span className="font-mono">{basics.name || ""}</span></div>
                                <div>Scopes: <span className="font-mono">{(basics.scopes || []).join(", ") || "—"}</span></div>
                                {basics.description && <div>Description: {basics.description}</div>}
                            </div>
                            <div className="mm-glass rounded-xl p-3 border border-white/10">
                                <div className="font-semibold">Desired ACL</div>
                                <div>Presets: {(acl.presets || []).join(", ") || "—"}</div>
                                <div>Extra: {(acl.extra || []).join(", ") || "—"}</div>
                            </div>

                            <div className="mm-glass rounded-xl p-3 border border-white/10">
                                <div className="font-semibold mb-1">Bindings (selected)</div>
                                {!bmDraft?.length && <div className="text-zinc-400">— none —</div>}
                                {bmDraft?.map(d => {
                                    const ns = nsList.find(n => n.id === d.nsId);
                                    return (
                                        <div key={d.nsId} className="mt-1">
                                            <span className="font-medium">{ns?.name || d.nsId}</span>{" "}
                                            <span className="text-xs opacity-70">[{d.permissions}]</span>{" "}
                                            <span className="font-mono">{(d.keyPatterns || []).join(", ") || "—"}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="mm-checkbox" checked={applyNow} onChange={e => setApplyNow(e.target.checked)} />
                                <span>Apply ACL now</span>
                            </label>

                        </div>
                    </>
                )}

                {error && (
                    <div className="mt-3 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                        {error}
                    </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs opacity-70">You can edit bindings and ACL later from the service page.</div>
                    <div className="flex gap-2">
                        {step > 1 && <Button variant="ghost" onClick={goBack}>Back</Button>}
                        {step < total && <Button onClick={goNext}>Next</Button>}
                        {step === total && (
                            <Button onClick={finalizeCreate} disabled={saving}>
                                {saving ? "Creating…" : "Create"}
                            </Button>
                        )}
                        <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                    </div>
                </div>

                {/* после Create показываем креды, если apply ACL now */}
                {applyResult && (
                    <div className="mm-glass rounded-2xl p-4 border border-emerald-400/25 shadow-[0_0_40px_rgba(16,185,129,.15)]">
                        <div className="font-semibold mb-2 text-emerald-300">ACL applied</div>
                        <div className="grid gap-2">
                            <CopyField label="Redis user" value={applyResult.username} />
                            <CopyField label="Password" value={applyResult.secret} masked />
                        </div>
                        <div className="mt-2 text-xs opacity-70">Keep this password safe.</div>
                    </div>
                )}
            </div>
        </div>
    );
}
