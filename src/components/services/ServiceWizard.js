"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import CopyField from "@/components/ui/CopyField";

export default function ServiceWizard({ open, onClose, projectId, onCreated }) {
    const [name, setName] = useState("");
    const [scopes, setScopes] = useState("kv.read,kv.write");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // --- ACL (optional) ---
    const [applyAcl, setApplyAcl] = useState(false);
    const [presets, setPresets] = useState([]);           // list from server
    const [selectedPresets, setSelectedPresets] = useState(["metrics"]);
    const [aclExtra, setAclExtra] = useState("");
    const [aclPreview, setAclPreview] = useState(null);   // dry-run response
    const [aclResult, setAclResult] = useState(null);     // final apply result
    const [aclError, setAclError] = useState(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setAclError(null);
        setAclPreview(null);
        setAclResult(null);

        // loading presets list from Redis using our API
        fetch("/api/acl/presets")
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(({ items }) => setPresets(items || []))
            .catch(() => setPresets([]));
    }, [open]);

    function togglePreset(name) {
        setSelectedPresets(cur =>
            cur.includes(name) ? cur.filter(n => n !== name) : [...cur, name]
        );
    }

    async function createService() {
        setSaving(true);
        setError(null);
        setAclError(null);
        setAclPreview(null);
        setAclResult(null);

        try {
            // 1) creating a service
            const body = {
                name: name.trim(),
                scopes: scopes.split(",").map(s => s.trim()).filter(Boolean),
            };
            if (!body.name) throw new Error("Service name is required");

            const r = await fetch(`/api/projects/${projectId}/services`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

            // service might be got in different forms - let's have some guard here
            // const created = j?.service || j?.item || j?.saved || j;
            // const serviceId = created?.id || created?.serviceId || created?.name;
            // if (!serviceId) throw new Error("Cannot detect created service ID");
            // onCreated?.(created);

            const created = j?.service || j;                     // ждём { service }, но терпим и “сырой” ответ
            const serviceId = created?.id || created?.serviceId; // для apply ACL нужен настоящий id
            onCreated?.(created);                                // обновим список в UI
            if (!applyAcl) {                                     // если ACL не применяем — можно завершать
                   setSaving(false);
                   // onClose?.();  // по желанию закрывать модалку сразу
                       return;
                 }
             if (!serviceId) throw new Error("Cannot detect created service ID"); // нужен для apply ACL дальше

            // 2) (optional) try to apply ACL
            if (applyAcl) {
                const extraList = aclExtra
                    .split(",")
                    .map(s => s.trim())
                    .filter(Boolean);

                // 2a) dry-run to make sure the patterns (bindings) exist
                const r1 = await fetch(
                    `/api/projects/${projectId}/services/${serviceId}/acl/apply`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            presets: selectedPresets,
                            extra: extraList,
                            dryRun: true,
                        }),
                    }
                );
                const preview = await r1.json();
                if (!r1.ok) throw new Error(preview?.error || `ACL preview HTTP ${r1.status}`);
                setAclPreview(preview);

                // if there's no patterns then the bindings don not exist yet - then do not apply ACL
                const kp = Array.isArray(preview?.keyPatterns) ? preview.keyPatterns : [];
                if (!kp.length || (kp.length === 1 && kp[0] === "mm:*")) {
                    setAclError(
                        "No bindings yet: ACL not applied. Create at least one binding (service ↔ namespace) and apply ACL later."
                    );
                } else {
                    // 2b) apply ACL
                    const r2 = await fetch(
                        `/api/projects/${projectId}/services/${serviceId}/acl/apply`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                presets: selectedPresets,
                                extra: extraList,
                                dryRun: false,
                            }),
                        }
                    );
                    const applied = await r2.json();
                    if (!r2.ok) throw new Error(applied?.error || `ACL apply HTTP ${r2.status}`);
                    setAclResult(applied);
                }
            }


            // 3) ready
            setSaving(false);

            // optional
            // do not close the modal for the password to be copied from ACL
            onClose?.();

        } catch (e) {
            setSaving(false);
            setError(String(e?.message || e));
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative mm-glass rounded-2xl p-5 w-full max-w-2xl border border-white/10">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-semibold">Create service</div>
                    <button onClick={onClose} className="px-2 py-1 rounded-xl hover:bg-white/10">✕</button>
                </div>

                <div className="grid gap-3">
                    <div>
                        <div className="text-sm mb-1 opacity-80">Name</div>
                        <input
                            className="mm-input w-full"
                            placeholder="checkout-api"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <div className="text-sm mb-1 opacity-80">Scopes (comma-separated)</div>
                        <input
                            className="mm-input w-full"
                            placeholder="kv.read,kv.write"
                            value={scopes}
                            onChange={e => setScopes(e.target.value)}
                        />
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                        <input
                            id="applyAcl"
                            type="checkbox"
                            className="mm-checkbox"
                            checked={applyAcl}
                            onChange={e => setApplyAcl(e.target.checked)}
                        />
                        <label htmlFor="applyAcl" className="text-sm opacity-90">
                            Apply ACL right after creation
                        </label>
                    </div>

                    {applyAcl && (
                        <div className="mm-glass rounded-xl p-3 border border-white/10">
                            <div className="text-sm font-medium mb-2">ACL presets</div>
                            <div className="flex flex-wrap gap-2">
                                {presets.map((p) => (
                                    <button
                                        key={p.name}
                                        onClick={() => togglePreset(p.name)}
                                        className={`px-2 py-1 rounded-xl border ${
                                            selectedPresets.includes(p.name)
                                                ? "bg-white/15 border-white/20"
                                                : "bg-white/5 border-white/10"
                                        }`}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-3">
                                <div className="text-sm mb-1 opacity-80">Extra ACL commands (comma-separated)</div>
                                <input
                                    className="mm-input w-full"
                                    placeholder="+xread,+xreadgroup"
                                    value={aclExtra}
                                    onChange={e => setAclExtra(e.target.value)}
                                />
                            </div>

                            {aclError && (
                                <div className="mt-3 p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-sm">
                                    {aclError}
                                </div>
                            )}

                            {aclPreview && (
                                <div className="mt-3 text-xs opacity-80">
                                    <div className="font-semibold mb-1">Preview</div>
                                    <div className="font-mono break-words">{aclPreview.preview}</div>
                                    <div className="mt-1">Patterns: {aclPreview.keyPatterns?.join(", ") || "—"}</div>
                                </div>
                            )}

                            {aclResult && (
                                <div className="mt-3 mm-glass rounded-2xl p-4 border border-emerald-400/25 shadow-[0_0_40px_rgba(16,185,129,.15)]">
                                    <div className="font-semibold mb-2 text-emerald-300">ACL applied</div>

                                    <div className="grid gap-2">
                                        <CopyField label="Redis user" value={aclResult.username} />
                                        <CopyField label="Password" value={aclResult.secret} masked />
                                    </div>

                                    <div className="mt-3 text-xs opacity-80">
                                        Keep this password safe — it’s shown only once.
                                    </div>

                                    <div className="mt-3 mm-glass rounded-xl p-3 text-xs border border-white/10">
                                        <div className="font-semibold mb-1">How to use</div>
                                        <pre className="font-mono whitespace-pre-wrap break-words">
                                            {
                                                `# env for your service:
                                                    REDIS_USERNAME=${aclResult.username}
                                                    REDIS_PASSWORD=${aclResult.secret}

                                                # example (redis-cli):
                                                    redis-cli -u redis://<host>:6379 --user "$REDIS_USERNAME" --pass "$REDIS_PASSWORD"`
                                            }
                                        </pre>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {error && (
                        <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="mt-2 flex gap-2">
                        <Button onClick={createService} disabled={saving}>
                            {saving ? "Creating…" : "Create service"}
                        </Button>
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
