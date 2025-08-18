"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export default function AclApplyModal({ open, onClose, projectId, serviceId }) {
    const [presets, setPresets] = useState([]);
    const [selected, setSelected] = useState(["kv_rw","metrics"]);
    const [extra, setExtra] = useState("");
    const [preview, setPreview] = useState(null);
    const [applying, setApplying] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [testRes, setTestRes] = useState(null)

    useEffect(() => {
        if (!open) return;
        fetch("/api/acl/presets")
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(({ items }) => setPresets(items || []))
            .catch(() => setPresets([]));
    }, [open]);

    async function buildPreview() {
        setError(null);
        setPreview(null);
        try {
            const body = {
                presets: selected,
                extra: extra.split(",").map(s => s.trim()).filter(Boolean),
                dryRun: true,
            };
            const r = await fetch(`/api/projects/${projectId}/services/${serviceId}/acl/apply`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
            setPreview(j);
        } catch (e) {
            setError(String(e));
        }
    }

    async function applyNow() {
        setApplying(true); setError(null); setResult(null);
        try {
            const body = {
                presets: selected,
                extra: extra.split(",").map(s => s.trim()).filter(Boolean),
                dryRun: false,
            };
            const r = await fetch(`/api/projects/${projectId}/services/${serviceId}/acl/apply`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
            setResult(j);
        } catch (e) { setError(String(e)); }
        finally { setApplying(false); }
    }

    async function testAccess() {
        setError(null); setTestRes(null);
        try {
            const body = {
                presets: selected,
                extra: extra.split(",").map(s => s.trim()).filter(Boolean),
                op: "rw"
            };
            const r = await fetch(`/api/projects/${projectId}/services/${serviceId}/acl/test`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
            setTestRes(j);
        } catch (e) { setError(String(e)); }
    }

    function togglePreset(name) {
        setSelected((cur) => cur.includes(name) ? cur.filter(n => n !== name) : [...cur, name]);
    }

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative mm-glass rounded-2xl p-4 w-full max-w-2xl border border-white/10">
                <div className="text-lg font-semibold mb-2">Apply ACL</div>

                <div className="grid gap-3">
                    <div>
                        <div className="text-sm mb-1 opacity-80">Presets</div>
                        <div className="flex flex-wrap gap-2">
                            {presets.map(p => (
                                <button key={p.name}
                                        onClick={()=>togglePreset(p.name)}
                                        className={`px-2 py-1 rounded-xl border ${selected.includes(p.name) ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10"}`}>
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="text-sm mb-1 opacity-80">Extra commands (comma-separated)</div>
                        <input className="mm-input w-full" placeholder="+hget,+hexists"
                               value={extra} onChange={(e)=>setExtra(e.target.value)} />
                    </div>

                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={buildPreview}>Preview</Button>
                        <Button variant="ghost" onClick={testAccess}>Test</Button>
                        <Button onClick={applyNow} disabled={applying}>Apply</Button>
                        <Button variant="ghost" onClick={onClose} className="ml-auto">Close</Button>
                    </div>

                    {error && <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{String(error)}</div>}
                    {testRes && (
                        <div className="mm-glass rounded-xl p-3 text-sm">
                            <div className="font-semibold mb-1">Test result</div>
                            <div className="opacity-80">sample key: <code className="font-mono">{testRes.key}</code></div>
                            <div className="mt-1">Read: {testRes.canRead ? "✅ allowed" : "❌ denied"} {testRes.readErr && <span className="opacity-70">({testRes.readErr})</span>}</div>
                            <div>Write: {testRes.canWrite ? "✅ allowed" : "❌ denied"} {testRes.writeErr && <span className="opacity-70">({testRes.writeErr})</span>}</div>
                        </div>
                    )}

                    {preview && (
                        <div className="mm-glass rounded-xl p-3 text-xs">
                            <div className="font-semibold mb-1">Preview</div>
                            <div className="opacity-90 break-words font-mono">{preview.preview}</div>
                            <div className="mt-2 opacity-70">Patterns: {preview.keyPatterns.join(", ") || "—"}</div>
                            <div className="opacity-70">Commands: {preview.allowCmds.join(" ") || "—"}</div>
                        </div>
                    )}

                    {result && (
                        <div className="mm-glass rounded-xl p-3">
                            <div className="font-semibold mb-1 text-green-300">Applied</div>
                            <div className="text-sm">Redis user: <code className="font-mono">{result.username}</code></div>
                            <div className="text-sm">Password (copy now): <code className="font-mono">{result.secret}</code></div>
                            <div className="mt-2 text-xs opacity-70">Keep this secret safe — it will not be shown again.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
