"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

function mapPermToPresets(p) {
    const x = String(p || "R").toUpperCase();
    if (x === "RW") return ["kv_rw", "metrics"];
    if (x === "W")  return ["kv_write", "metrics"];
    return ["kv_read", "metrics"];
}

function Row({ label, children }) {
    return (
        <div className="grid grid-cols-3 gap-3 items-center">
            <div className="text-sm opacity-80">{label}</div>
            <div className="col-span-2">{children}</div>
        </div>
    );
}

export default function QuickBindModal({ projectId, service, namespaces = [], open, onClose, onSaved }) {
    const [nsId, setNsId] = useState(namespaces[0]?.id || "");
    const [permissions, setPermissions] = useState("R");
    const [patterns, setPatterns] = useState(""); // "orders:*"
    const [readRps, setReadRps] = useState(0);
    const [writeRps, setWriteRps] = useState(0);

    // ACL extras
    const [applyAcl, setApplyAcl] = useState(true);
    const [presets, setPresets] = useState([]);
    const [selectedPresets, setSelectedPresets] = useState(["kv_read", "metrics"]);
    const [aclExtra, setAclExtra] = useState("");

    // Preview/Test result
    const [preview, setPreview] = useState(null);
    const [testRes, setTestRes] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [auxMsg, setAuxMsg] = useState(null);

    const ns = useMemo(() => namespaces.find(n => n.id === nsId), [namespaces, nsId]);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setAuxMsg(null);
        setPreview(null);
        setTestRes(null);

        // default patterns под выбранный ns
        if (!patterns && ns?.prefix) {
            setPatterns(`${ns.prefix}*`);
        }
        // тянем ACL пресеты
        fetch("/api/acl/presets")
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(({ items }) => setPresets(items || []))
            .catch(() => setPresets([]));
    }, [open, nsId]);

    useEffect(() => {
        setSelectedPresets(mapPermToPresets(permissions));
    }, [permissions]);

    function togglePreset(name) {
        setSelectedPresets(cur => cur.includes(name) ? cur.filter(n => n !== name) : [...cur, name]);
    }

    async function buildPreview() {
        setError(null); setPreview(null); setTestRes(null);
        try {
            const body = {
                presets: selectedPresets,
                extra: aclExtra.split(",").map(s => s.trim()).filter(Boolean),
                dryRun: true,
            };
            const r = await fetch(`/api/projects/${projectId}/services/${service.id}/acl/apply`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
            setPreview(j);
            // Подсказка: до сохранения этого биндинга паттернов может не быть в превью
            if (!j.keyPatterns?.length) {
                setAuxMsg("Preview uses existing bindings only. Save this binding to include its patterns.");
            } else {
                setAuxMsg(null);
            }
        } catch (e) {
            setError(String(e?.message || e));
        }
    }

    async function testAccess() {
        setError(null); setTestRes(null);
        try {
            const body = {
                presets: selectedPresets,
                extra: aclExtra.split(",").map(s => s.trim()).filter(Boolean),
                op: "rw",
            };
            const r = await fetch(`/api/projects/${projectId}/services/${service.id}/acl/test`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
            setTestRes(j);
            if (!j.canWrite && permissions.toUpperCase().includes("W")) {
                setAuxMsg("Write denied in test likely because new binding is not saved yet.");
            }
        } catch (e) {
            setError(String(e?.message || e));
        }
    }

    async function save() {
        setSaving(true); setError(null);
        try {
            const body = {
                serviceId: service.id,
                serviceName: service.name,
                permissions,
                patterns: patterns.split(",").map(s => s.trim()).filter(Boolean),
                rate: { readRps: Number(readRps || 0), writeRps: Number(writeRps || 0) },
                applyAcl,
                aclPresets: selectedPresets,
                aclExtra: aclExtra.split(",").map(s => s.trim()).filter(Boolean),
            };
            const r = await fetch(`/api/projects/${projectId}/namespaces/${nsId}/bindings`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
            onSaved?.({ ...(j.binding || j), nsId });
            // после сохранения можно обновить превью (уже с новым биндингом)
            setPreview(null); setTestRes(null);
            setAuxMsg("Binding saved. You can Preview/Test again to include the new patterns.");
            setSaving(false);
            // onClose?.(); // оставим открытой, чтобы можно было нажать Preview/Test ещё раз
        } catch (e) {
            setSaving(false);
            setError(String(e?.message || e));
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative mm-glass rounded-2xl p-5 w-full max-w-3xl border border-white/10">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-semibold">Bind service to namespace</div>
                    <button onClick={onClose} className="px-2 py-1 rounded-xl hover:bg-white/10">✕</button>
                </div>

                <div className="grid gap-4">
                    <Row label="Namespace">
                        <select className="mm-input w-full" value={nsId} onChange={e=>setNsId(e.target.value)}>
                            {namespaces.map(ns => <option key={ns.id} value={ns.id}>{ns.name || ns.prefix || ns.id}</option>)}
                        </select>
                    </Row>

                    <Row label="Permissions">
                        <div className="flex gap-2">
                            {["R","W","RW"].map(p => (
                                <button key={p} onClick={()=>setPermissions(p)}
                                        className={`px-2 py-1 rounded-xl border ${permissions===p?"bg-white/15 border-white/20":"bg-white/5 border-white/10"}`}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </Row>

                    <Row label="Key patterns">
                        <input className="mm-input w-full"
                               placeholder={ns?.prefix ? `${ns.prefix}*` : "orders:*"}
                               value={patterns}
                               onChange={e=>setPatterns(e.target.value)} />
                    </Row>

                    <Row label="Rate limit (R/W RPS)">
                        <div className="flex gap-2">
                            <input className="mm-input w-24" type="number" min="0" value={readRps} onChange={e=>setReadRps(e.target.value)} />
                            <input className="mm-input w-24" type="number" min="0" value={writeRps} onChange={e=>setWriteRps(e.target.value)} />
                        </div>
                    </Row>

                    <div className="mt-1 flex items-center gap-2">
                        <input id="applyAcl" type="checkbox" className="mm-checkbox" checked={applyAcl} onChange={e=>setApplyAcl(e.target.checked)} />
                        <label htmlFor="applyAcl" className="text-sm opacity-90">Apply ACL after saving</label>
                    </div>

                    {applyAcl && (
                        <div className="mm-glass rounded-xl p-3 border border-white/10">
                            <div className="text-sm font-medium mb-2">ACL presets</div>
                            <div className="flex flex-wrap gap-2">
                                {presets.map(p => (
                                    <button key={p.name} onClick={()=>togglePreset(p.name)}
                                            className={`px-2 py-1 rounded-xl border ${selectedPresets.includes(p.name)?"bg-white/15 border-white/20":"bg-white/5 border-white/10"}`}>
                                        {p.name}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-3">
                                <div className="text-sm mb-1 opacity-80">Extra ACL commands (comma-separated)</div>
                                <input className="mm-input w-full" placeholder="+xread,+xreadgroup" value={aclExtra} onChange={e=>setAclExtra(e.target.value)} />
                            </div>

                            <div className="mt-3 flex gap-2">
                                <Button variant="ghost" onClick={buildPreview}>Preview</Button>
                                <Button variant="ghost" onClick={testAccess}>Test</Button>
                            </div>

                            {preview && (
                                <div className="mt-3 text-xs opacity-80">
                                    <div className="font-semibold mb-1">Preview</div>
                                    <div className="font-mono break-words">{preview.preview}</div>
                                    <div className="mt-1">Patterns: {preview.keyPatterns?.join(", ") || "—"}</div>
                                </div>
                            )}

                            {testRes && (
                                <div className="mt-3 mm-glass rounded-xl p-3 text-sm">
                                    <div className="font-semibold mb-1">Test result</div>
                                    <div className="opacity-80">sample key: <code className="font-mono">{testRes.key}</code></div>
                                    <div className="mt-1">Read: {testRes.canRead ? "✅ allowed" : "❌ denied"} {testRes.readErr && <span className="opacity-70">({testRes.readErr})</span>}</div>
                                    <div>Write: {testRes.canWrite ? "✅ allowed" : "❌ denied"} {testRes.writeErr && <span className="opacity-70">({testRes.writeErr})</span>}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {auxMsg && (
                        <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-sm">{auxMsg}</div>
                    )}
                    {error && (
                        <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
                    )}

                    <div className="flex gap-2">
                        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save binding"}</Button>
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
