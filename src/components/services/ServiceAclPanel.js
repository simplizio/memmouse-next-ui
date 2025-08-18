"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import CopyField from "@/components/ui/CopyField";

export default function ServiceAclPanel({ projectId, service, onUpdated }) {
    const [presets, setPresets] = useState([]);
    const [sel, setSel] = useState(service?.acl?.presetsApplied || ["kv_read","metrics"]);
    const [extra, setExtra] = useState((service?.acl?.extraApplied || []).join(","));
    const [preview, setPreview] = useState(null);
    const [testRes, setTestRes] = useState(null);
    const [appRes, setAppRes] = useState(null);
    const [err, setErr] = useState(null);
    const [busy, setBusy] = useState(false);

    const defaults = ["kv_read","metrics"];

    useEffect(() => {
        if (!service) return;
        setSel(service?.acl?.presetsApplied?.length ? service.acl.presetsApplied : defaults);
        setExtra((service?.acl?.extraApplied || []).join(","));
    }, [service?.id, service?.acl?.presetsApplied, service?.acl?.extraApplied]);

    useEffect(() => {
        fetch("/api/acl/presets")
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(({ items }) => setPresets(items || []))
            .catch(()=> setPresets([]));
    }, []);

    function toggle(name) {
        setSel(cur => cur.includes(name) ? cur.filter(n=>n!==name) : [...cur, name]);
    }

    async function doPreview() {
        setErr(null); setPreview(null); setTestRes(null); setAppRes(null);
        try {
            const r = await fetch(`/api/projects/${service.projectId}/services/${service.id}/acl/apply`, {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ presets: sel, extra: extra.split(",").map(s=>s.trim()).filter(Boolean), dryRun: true })
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
            setPreview(j);
        } catch (e) { setErr(String(e?.message || e)); }
    }

    async function doTest() {
        setErr(null); setTestRes(null);
        try {
            const r = await fetch(`/api/projects/${service.projectId}/services/${service.id}/acl/test`, {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ presets: sel, extra: extra.split(",").map(s=>s.trim()).filter(Boolean), op: "rw" })
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
            setTestRes(j);
        } catch (e) { setErr(String(e?.message || e)); }
    }

    async function doApply() {
        setBusy(true); setErr(null); setAppRes(null);
        try {
            const r = await fetch(`/api/projects/${service.projectId}/services/${service.id}/acl/apply`, {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ presets: sel, extra: extra.split(",").map(s=>s.trim()).filter(Boolean) })
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

            setAppRes(j);             // покажем username/secret (one-time)
            if (j.service) onUpdated?.(j.service);  // ← обновим страницу точным состоянием с сервера
            else onUpdated?.();                     // fallback — прежний рефетч
        } catch (e) {
            setErr(String(e?.message || e));
        } finally {
            setBusy(false);
        }
    }

    // async function doApply() {
    //     setBusy(true); setErr(null); setAppRes(null);
    //     try {
    //         const r = await fetch(`/api/projects/${service.projectId}/services/${service.id}/acl/apply`, {
    //             method: "POST", headers: {"Content-Type":"application/json"},
    //             body: JSON.stringify({ presets: sel, extra: extra.split(",").map(s=>s.trim()).filter(Boolean) })
    //         });
    //         const j = await r.json();
    //         if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
    //         setAppRes(j); // username/secret shown once
    //         onUpdated?.(); // перезагрузить сервис, чтобы подтянуть lastAclAppliedAt и acl.*
    //     } catch (e) { setErr(String(e?.message || e)); }
    //     finally { setBusy(false); }
    // }

    return (
        <div className="mm-glass p-4 rounded-2xl border border-white/10">
            <div className="text-sm font-semibold mb-2">Access & ACL</div>

            <div className="grid gap-2 text-sm">
                <div className="opacity-80">Redis user: <span className="font-mono">{service.redisUser || "— not applied —"}</span></div>
                {service.lastAclAppliedAt && (
                    <div className="opacity-60">Last applied: {new Date(service.lastAclAppliedAt).toLocaleString()}</div>
                )}
            </div>

            <div className="mt-3">
                <div className="text-xs uppercase opacity-75 mb-1">Presets</div>
                <div className="flex flex-wrap gap-2">
                    {presets.map(p => (
                        <button key={p.name}
                                onClick={()=>toggle(p.name)}
                                className={`px-2 py-1 rounded-xl border ${sel.includes(p.name) ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10"}`}>
                            {p.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-3">
                <div className="text-xs uppercase opacity-75 mb-1">Extra commands (comma-sep)</div>
                <input className="mm-input w-full" value={extra} onChange={e=>setExtra(e.target.value)} placeholder="+xread,+xreadgroup" />
            </div>

            <div className="mt-3 flex gap-2">
                <Button variant="ghost" onClick={doPreview}>Preview</Button>
                <Button variant="ghost" onClick={doTest}>Test</Button>
                <Button onClick={doApply} disabled={busy}>{busy ? "Applying…" : "Apply"}</Button>
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

            {appRes && (
                <div className="mt-3 mm-glass rounded-2xl p-4 border border-emerald-400/25">
                    <div className="font-semibold mb-2 text-emerald-300">ACL applied</div>
                    <div className="grid gap-2">
                        <CopyField label="Redis user" value={appRes.username} />
                        <CopyField label="Password" value={appRes.secret} masked />
                    </div>
                    <div className="mt-2 text-xs opacity-70">Copy the password now — it won't be shown again.</div>
                </div>
            )}

            {err && (
                <div className="mt-3 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{err}</div>
            )}
        </div>
    );
}
