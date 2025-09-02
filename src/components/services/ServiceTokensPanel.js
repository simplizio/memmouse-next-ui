"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import CopyField from "@/components/ui/CopyField";

function Badge({ children, tone="zinc" }) {
    const tones = {
        green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
        red:   "bg-red-500/15 text-red-300 border-red-500/25",
        zinc:  "bg-white/10 text-zinc-200 border-white/15",
    };
    return (
        <span className={`px-2 py-0.5 rounded-lg text-xs border ${tones[tone] || tones.zinc}`}>
      {children}
    </span>
    );
}

export default function ServiceTokensPanel({ projectId, service }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    const [issuing, setIssuing] = useState(false);
    const [newToken, setNewToken] = useState(null);

    const [rotating, setRotating] = useState(false);
    const [rotateFrom, setRotateFrom] = useState("");
    const [rotateRes, setRotateRes] = useState(null);

    async function reload() {
        setLoading(true); setErr(null);
        try {
            const r = await fetch(`/api/projects/${projectId}/services/${service.id}/tokens`);
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
            setItems(j.items || []);
        } catch (e) {
            setErr(String(e?.message || e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { reload(); }, [projectId, service?.id]);

    async function issue() {
        setIssuing(true); setNewToken(null); setErr(null);
        try {
            const r = await fetch(`/api/projects/${projectId}/services/${service.id}/tokens`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({})
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
            setNewToken(j.token); // j.token.value есть только здесь
            await reload();
        } catch (e) {
            setErr(String(e?.message || e));
        } finally {
            setIssuing(false);
        }
    }

    async function revoke(tokenId) {
        if (!confirm(`Revoke token ${tokenId}? The value will stop working.`)) return;
        setErr(null);
        const r = await fetch(`/api/projects/${projectId}/services/${service.id}/tokens/${tokenId}/revoke`, { method: "POST" });
        const j = await r.json().catch(()=>({}));
        if (!r.ok) return setErr(j?.error || `HTTP ${r.status}`);
        reload();
    }

    async function purge(tokenId) {
        if (!confirm(`Purge token ${tokenId}? This permanently deletes the record.`)) return;
        setErr(null);
        const r = await fetch(`/api/projects/${projectId}/services/${service.id}/tokens/${tokenId}/purge`, { method: "POST" });
        const j = await r.json().catch(()=>({}));
        if (!r.ok) return setErr(j?.error || `HTTP ${r.status}`);
        reload();
    }

    async function rotate() {
        setRotating(true); setRotateRes(null); setErr(null);
        try {
            const r = await fetch(`/api/projects/${projectId}/services/${service.id}/tokens/rotate`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fromTokenId: rotateFrom || null, revokeOld: true })
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
            setRotateRes(j); // j.rotatedTo.value есть только здесь
            setRotateFrom("");
            await reload();
        } catch (e) {
            setErr(String(e?.message || e));
        } finally {
            setRotating(false);
        }
    }

    return (
        <div className="mm-glass p-4 rounded-2xl border border-white/10">
            <div className="text-sm font-semibold mb-2">Service tokens</div>

            <div className="flex items-center gap-2 mb-3">
                <Button onClick={issue} disabled={issuing}>{issuing ? "Issuing…" : "Issue new"}</Button>
                <div className="ml-auto text-xs opacity-70">
                    Values are shown only on issue/rotate. Keep them in ENV.
                </div>
            </div>

            {newToken && (
                <div className="mb-4 mm-glass rounded-2xl p-4 border border-emerald-400/25 shadow-[0_0_40px_rgba(16,185,129,.15)]">
                    <div className="font-semibold text-emerald-300 mb-2">New token</div>
                    <div className="grid gap-2">
                        <CopyField label="Token ID" value={newToken.id} />
                        <CopyField label="Value" value={newToken.value} />
                    </div>
                    <div className="mt-2 text-xs opacity-70">
                        Copy the value now — it won’t be shown again.
                    </div>
                </div>
            )}

            {rotateRes?.rotatedTo && (
                <div className="mb-4 mm-glass rounded-2xl p-4 border border-emerald-400/25">
                    <div className="font-semibold text-emerald-300 mb-2">Rotated token</div>
                    <div className="grid gap-2">
                        {rotateRes.rotatedFrom && <CopyField label="Old token ID" value={rotateRes.rotatedFrom.id} />}
                        <CopyField label="New token ID" value={rotateRes.rotatedTo.id} />
                        <CopyField label="New value" value={rotateRes.rotatedTo.value} />
                    </div>
                    <div className="mt-2 text-xs opacity-70">
                        Update your ENV with the new value.
                    </div>
                </div>
            )}

            {/* Rotate controls */}
            <div className="mb-3 mm-glass rounded-xl p-3 border border-white/10">
                <div className="text-sm font-medium mb-2">Rotate</div>
                <div className="flex items-center gap-2">
                    <select
                        className="mm-input"
                        value={rotateFrom}
                        onChange={e => setRotateFrom(e.target.value)}
                    >
                        <option value="">— create new (keep others revoked) —</option>
                        {items.map(t => (
                            <option key={t.id} value={t.id}>{t.id} {t.status === "revoked" ? "(revoked)" : ""}</option>
                        ))}
                    </select>
                    <Button variant="ghost" onClick={rotate} disabled={rotating}>
                        {rotating ? "Rotating…" : "Rotate"}
                    </Button>
                </div>
            </div>

            {/* Tokens table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs uppercase opacity-70">
                    <tr>
                        <th className="text-left py-2">Token</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Created</th>
                        <th className="text-left py-2">Revoked</th>
                        <th className="text-right py-2">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading && (
                        <tr><td colSpan={5} className="py-4 opacity-60">Loading…</td></tr>
                    )}
                    {!loading && service.tokens.length === 0 && (
                        <tr><td colSpan={5} className="py-4 opacity-60">No tokens yet.</td></tr>
                    )}
                    {!loading && service.tokens.map(t => (
                        <tr key={t.id} className="border-t border-white/5">
                            <td className="py-2 font-mono">{t.id}</td>
                            <td className="py-2">
                                {t.status === "revoked" ? <Badge tone="red">revoked</Badge> : <Badge tone="green">active</Badge>}
                            </td>
                            <td className="py-2">{t.createdAt ? new Date(Number(t.createdAt)).toLocaleString() : "—"}</td>
                            <td className="py-2">{t.revokedAt ? new Date(Number(t.revokedAt)).toLocaleString() : "—"}</td>
                            <td className="py-2 text-right">
                                <div className="flex gap-2 justify-end">
                                    {t.status !== "revoked" && (
                                        <Button variant="ghost" onClick={() => revoke(t.id)}>Revoke</Button>
                                    )}
                                    <Button variant="ghost" onClick={() => purge(t.id)}>Purge</Button>
                                    <Button variant="ghost" onClick={() => copy(t.value)}>Copy</Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {err && (
                <div className="mt-3 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                    {err}
                </div>
            )}
        </div>
    );
}

function copy(s) { navigator.clipboard.writeText(s).catch(() => {}); }