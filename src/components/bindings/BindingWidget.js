"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import KeyPatternBuilderSingleNs from "@/components/patterns/KeyPatternBuilderSingleNs";
import { useBindingWidgetStore } from "@/store/BindingWidgetStore";
import {usePatternStore} from "@/store/patternStore";

// helpers
function normalizePerms(p) {
    if (!p) return { read: true, write: true };
    if (typeof p === "string") {
        const u = p.toUpperCase();
        return { read: u.includes("R"), write: u.includes("W") };
    }
    return { read: !!p.read, write: !!p.write };
}
function codeFromPerms(p) {
    const n = normalizePerms(p);
    return n.read && n.write ? "RW" : (n.write ? "W" : "R");
}
function PermSelector({ value = "RW", onChange }) {
    return (
        <div className="flex gap-2">
            {["R", "RW", "W"].map((c) => (
                <button
                    key={c}
                    type="button"
                    onClick={() => onChange?.(c)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition ${
                        value === c
                            ? "border-emerald-400/50 bg-emerald-400/10"
                            : "border-white/10 hover:bg-white/10"
                    }`}
                >
                    {c}
                </button>
            ))}
        </div>
    );
}

const BindingWidget = forwardRef(function BindingWidget(
    { open = false, projectId, serviceId, ns, initial, onDirtyChange, onSaved, onDraftChange },
    ref
) {
    const nsKey = useMemo(() => `${projectId}:${ns?.id}:${serviceId || "new"}`, [projectId, ns?.id, serviceId]);

    // console.log(`binding widget for ${projectId} ${ns} ${serviceId} nsKey: ${nsKey}`)

    // local ui state
    const [permCode, setPermCode] = useState(codeFromPerms(initial?.permissions || "RW"));
    const [rate, setRate] = useState({
        readRps: Number(initial?.rate?.readRps || 0),
        writeRps: Number(initial?.rate?.writeRps || 0),
    });
    const [bandwidth, setBandwidth] = useState({
        readKBps: Number(initial?.bandwidth?.readKBps || 0),
        writeKBps: Number(initial?.bandwidth?.writeKBps || 0),
    });
    // const [patterns, setPatterns] = useState(initial?.keyPatterns || []);

    const ps = usePatternStore();

    // baseline for dirty
    const initialRef = useRef({
        perm: codeFromPerms(initial?.permissions || "RW"),
        rate: { ...rate },
        bandwidth: { ...bandwidth },
        patterns: [...(initial?.keyPatterns || [])],
    });

    const dirtySelf = useMemo(() => {
        const a = initialRef.current;
        if (a.perm !== permCode) return true;
        if (a.rate.readRps !== rate.readRps || a.rate.writeRps !== rate.writeRps) return true;
        if (a.bandwidth.readKBps !== bandwidth.readKBps || a.bandwidth.writeKBps !== bandwidth.writeKBps) return true;
        return false;
    }, [permCode, rate, bandwidth]);

    const [dirtyPatterns, setDirtyPatterns] = useState(false);
    useEffect(() => { onDirtyChange?.(dirtySelf || dirtyPatterns); }, [dirtySelf, dirtyPatterns, onDirtyChange]);

    const {
        setPerm,
        setRate: setRateStore,
        setBandwidth: setBandwidthStore,
        saveOne,
        hydrate,
        loadOne,
        setPatterns: setPatternsInStore,
    } = useBindingWidgetStore();

    useEffect(() => { if (nsKey) setPerm(nsKey, permCode); }, [nsKey, permCode, setPerm]);
    useEffect(() => { if (nsKey) setRateStore(nsKey, rate); }, [nsKey, rate, setRateStore]);
    useEffect(() => { if (nsKey) setBandwidthStore(nsKey, bandwidth); }, [nsKey, bandwidth, setBandwidthStore]);


    // при маунте: если есть initial → гидрируем из него; иначе (редактирование) — грузим из API
    useEffect(() => {
        if (!nsKey) return;
        let dead = false;
        (async () => {
            try {
                if (initial) {
                    hydrate(nsKey, initial);
                } else if (projectId && ns?.id && serviceId) {
                    const b = await loadOne({ projectId, nsId: ns.id, serviceId, nsKey });
                    if (dead) return;
                    // синхронизируем локальный UI с тем, что пришло
                    setPermCode(codeFromPerms(b?.permissions || "RW"));
                    setRate({
                        readRps: Number(b?.rate?.readRps || 0),
                        writeRps: Number(b?.rate?.writeRps || 0),
                    });
                    setBandwidth({
                        readKBps: Number(b?.bandwidth?.readKBps || 0),
                        writeKBps: Number(b?.bandwidth?.writeKBps || 0),
                    });
                } else {
                    // fallback: гидрируем текущим локальным состоянием
                    hydrate(nsKey, {
                        permissions: permCode,
                        rate,
                        bandwidth,
                        // keyPatterns: patterns
                    });
                }
            } catch {
                // ignore ошибки загрузки
            }
        })();
        return () => { dead = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nsKey, projectId, serviceId, ns?.id]);

    // report draft up (exclude onDraftChange from deps to avoid loop on new function identity)
    useEffect(() => {
            const keyPatterns = ps.getDraftPatterns?.(nsKey) || initial?.keyPatterns || [];
            const draft = { nsId: ns?.id, keyPatterns, permissions: permCode, rate, bandwidth };
            onDraftChange?.(draft);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        },
        [ns?.id, permCode, rate, bandwidth, ps, nsKey, initial?.keyPatterns, onDraftChange]
    );

    const keyPatternBuilderRef = useRef(null);

    function getDraft() {
        const keyPatterns = ps.getDraftPatterns?.(nsKey) || initial?.keyPatterns || [];
        return { nsId: ns?.id, keyPatterns, permissions: permCode, rate, bandwidth };
    }

    async function doSave(overrideServiceId) {
        const sid = overrideServiceId || serviceId;
        const binding = await saveOne({ projectId, nsId: ns.id, serviceId: sid, nsKey });
        onSaved?.(binding);
        return { saved: true, binding };
    }

    useImperativeHandle(
        ref,
        () => ({ isDirty: () => dirtySelf || dirtyPatterns, save: doSave, getDraft }),
        [dirtySelf, dirtyPatterns, permCode, rate, bandwidth, projectId, serviceId, ns?.id]
    );

    return (
        <div className="mm-glass rounded-xl p-3 border border-white/10 space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
                <div>
                    <div className="text-sm mb-1">Permissions</div>
                    <PermSelector value={permCode} onChange={setPermCode} />
                </div>

                <div>
                    <div className="text-sm mb-1">Rate limits (RPS)</div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <label className="w-16 text-xs text-muted-foreground">Read</label>
                            <input
                                type="number" min="0" inputMode="numeric" aria-label="Read RPS"
                                className="mm-input w-24"
                                value={rate.readRps}
                                onChange={(e) => setRate((r) => ({ ...r, readRps: Number(e.target.value || 0) }))}
                                placeholder="0"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="w-16 text-xs text-muted-foreground">Write</label>
                            <input
                                type="number" min="0" inputMode="numeric" aria-label="Write RPS"
                                className="mm-input w-24"
                                value={rate.writeRps}
                                onChange={(e) => setRate((r) => ({ ...r, writeRps: Number(e.target.value || 0) }))}
                                placeholder="0"
                            />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">0 = без лимита (используется значение по умолчанию)</div>
                    </div>
                </div>

                <div>
                    <div className="text-sm mb-1">Bandwidth (KB/s)</div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <label className="w-16 text-xs text-muted-foreground">Read</label>
                            <input
                                type="number" min="0" inputMode="numeric" aria-label="Read bandwidth KB/s"
                                className="mm-input w-24"
                                value={bandwidth.readKBps}
                                onChange={(e) => setBandwidth((b) => ({ ...b, readKBps: Number(e.target.value || 0) }))}
                                placeholder="0"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="w-16 text-xs text-muted-foreground">Write</label>
                            <input
                                type="number" min="0" inputMode="numeric" aria-label="Write bandwidth KB/s"
                                className="mm-input w-24"
                                value={bandwidth.writeKBps}
                                onChange={(e) => setBandwidth((b) => ({ ...b, writeKBps: Number(e.target.value || 0) }))}
                                placeholder="0"
                            />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">0 = без лимита (используется значение по умолчанию)</div>
                    </div>
                </div>
            </div>

            <KeyPatternBuilderSingleNs
                key={`${ns?.id}:${open ? 1 : 0}`}
                ref={keyPatternBuilderRef}
                projectId={projectId}
                ns={ns}
                nsKey={nsKey}
                onDirtyChange={setDirtyPatterns}
            />
        </div>
    );
});

export default BindingWidget;

