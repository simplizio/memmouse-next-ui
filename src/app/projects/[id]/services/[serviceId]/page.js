"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProject } from "@/components/projects/ProjectProvider";
import { Button } from "@/components/ui/button";
import ServiceEditModal from "@/components/services/ServiceEditModal";

export default function ServiceDetailsPage() {
    const { id: projectId, name: projectName } = useProject();
    const { serviceId } = useParams();
    const router = useRouter();

    const [svc, setSvc] = useState(null);
    const [bindings, setBindings] = useState(null);
    const [error, setError] = useState(null);
    const [quickBindOpen, setQuickBindOpen] = useState(false);
    const [allNamespaces, setAllNamespaces] = useState([]);
    const [editOpen, setEditOpen] = useState(false);

    useEffect(() => {
        let cancel = false;
        async function load() {
            try {
                setError(null);
                const [svcRes, listRes] = await Promise.all([
                    fetch(`/api/projects/${projectId}/services/${serviceId}`, { cache: "no-store" }),
                    fetch(`/api/projects/${projectId}/services/${serviceId}/bindings`, { cache: "no-store" }),
                ]);
                if (!svcRes.ok) throw new Error(`Service HTTP ${svcRes.status}`);
                if (!listRes.ok) throw new Error(`Bindings HTTP ${listRes.status}`);
                const svcJson = await svcRes.json();
                const { nsIds } = await listRes.json();
                const details = await Promise.all(
                    (nsIds || []).map(async (nsId) => {
                        const [nsRes, bRes] = await Promise.all([
                            fetch(`/api/projects/${projectId}/namespaces/${nsId}`, { cache: "no-store" }),
                            fetch(`/api/projects/${projectId}/namespaces/${nsId}/bindings/${serviceId}`, { cache: "no-store" }),
                        ]);
                        if (!nsRes.ok) return null;
                        const ns = await nsRes.json();
                        const binding = bRes.ok ? await bRes.json() : null;
                        return { ns, binding };
                    })
                );
                const nsList = await fetch(`/api/projects/${projectId}/namespaces`, { cache: "no-store" })
                    .then(r => r.ok ? r.json() : { items: [] });

                if (!cancel) {
                    setSvc(svcJson);
                    setBindings(details.filter(Boolean));
                    setAllNamespaces(nsList.items || []);
                }
            } catch (e) { if (!cancel) setError(String(e)); }
        }
        if (projectId && serviceId) load();
        return () => { cancel = true; };
    }, [projectId, serviceId]);

    const activeToken = useMemo(() => (svc?.tokens || []).find(t => t.status === "active"), [svc]);

    async function rotateToken() {
        const r = await fetch(`/api/projects/${projectId}/services/${serviceId}/rotate`, { method: "POST" });
        if (!r.ok) return alert(`Rotate HTTP ${r.status}`);
        const { service } = await r.json();
        setSvc(service);
    }

    async function downloadConfig() {
        const token = activeToken?.value;
        if (!token) return alert("No active token");
        const r = await fetch(`/api/projects/${projectId}/services/${serviceId}/config`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return alert(`Config HTTP ${r.status}`);
        const cfg = await r.json();
        const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${serviceId}-memmouse-config.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    async function unbind(nsId) {
        const r = await fetch(`/api/projects/${projectId}/namespaces/${nsId}/bindings/${serviceId}`, { method: "DELETE" });
        if (!r.ok) return alert(`Unbind HTTP ${r.status}`);
        setBindings(prev => prev?.filter(x => x.ns.id !== nsId));
    }

    async function deleteService() {
        if (!confirm("Delete this service? This will not remove data, only the catalog entry.")) return;
        const r = await fetch(`/api/projects/${projectId}/services/${serviceId}`, { method: "DELETE" });
        if (!r.ok) return alert(`Delete HTTP ${r.status}`);
        router.push(`/projects/${projectId}/services`);
    }

    if (error) return <div className="p-4 mm-glass rounded-xl text-red-300">Failed to load: {error}</div>;
    if (!svc || !bindings) return <div className="p-4 text-zinc-400">Loading service…</div>;

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">{svc.name}</h1>
                    <div className="text-sm text-zinc-400">
                        Service ID: <span className="font-mono">{svc.id}</span> • Project: <strong>{projectName}</strong>
                    </div>
                    {!!svc.scopes?.length && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {svc.scopes.map((s, i) => (
                                <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-xl border border-white/10 bg-white/5">
                  {s}
                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setEditOpen(true)}>Edit</Button>
                    <Button variant="ghost" onClick={rotateToken}>Rotate token</Button>
                    <Button onClick={downloadConfig}>Download config</Button>
                    <Button variant="ghost" onClick={deleteService}>Delete</Button>
                </div>
            </header>

            {/* Tokens */}
            <section className="mm-glass rounded-2xl p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Tokens</h2>
                </div>
                <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-white/5">
                        <tr>
                            <Th>ID</Th>
                            <Th>Status</Th>
                            <Th>Created</Th>
                            <Th>Value</Th>
                            <Th className="text-right pr-3">Actions</Th>
                        </tr>
                        </thead>
                        <tbody>
                        {(svc.tokens || []).map((t) => (
                            <tr key={t.id} className="border-t border-white/10">
                                <Td mono>{t.id}</Td>
                                <Td>{t.status}</Td>
                                <Td>{new Date(t.createdAt).toLocaleString()}</Td>
                                <Td mono>{mask(t.value)}</Td>
                                <Td className="text-right">
                                    <Button variant="ghost" onClick={() => copy(t.value)}>Copy</Button>
                                </Td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Bindings */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Bindings</h2>
                    <Button variant="ghost" onClick={() => setQuickBindOpen(true)}>+ Bind namespace</Button>
                </div>

                {!bindings.length && <div className="p-3 text-zinc-400">No bindings yet.</div>}

                {!!bindings.length && (
                    <div className="grid gap-2">
                        {bindings.map(({ ns, binding }) => (
                            <div key={ns.id} className="mm-glass rounded-xl p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="font-semibold">{ns.prefix}</div>
                                        <span className="text-xs px-2 py-0.5 rounded border border-white/10 bg-white/5">{binding?.permissions || "R"}</span>
                                        {!!binding?.rate && (
                                            <span className="text-xs opacity-80">r/w: {binding.rate.readRps || 0}/{binding.rate.writeRps || 0}</span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" onClick={() => router.push(`/projects/${projectId}/namespaces/${ns.id}`)}>
                                            Open namespace
                                        </Button>
                                        <Button variant="ghost" onClick={() => unbind(ns.id)}>Unbind</Button>
                                    </div>
                                </div>
                                {!!binding?.patterns?.length && (
                                    <div className="mt-2 text-xs opacity-80">
                                        patterns: {binding.patterns.join(", ")}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Quick bind modal inline (как раньше в этой же странице) */}
            {quickBindOpen && (
                <QuickBindModal
                    projectId={projectId}
                    service={{ id: svc.id, name: svc.name }}
                    namespaces={allNamespaces}
                    onClose={() => setQuickBindOpen(false)}
                    onSaved={(rec) => {
                        setBindings(prev => [{ ns: allNamespaces.find(n => n.id === rec.nsId), binding: rec }, ...(prev || [])]);
                        setQuickBindOpen(false);
                    }}
                />
            )}

            <ServiceEditModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                service={svc}
                projectId={projectId}
                onSaved={(updated) => setSvc(updated)}
            />
        </div>
    );
}

function Th({ children, className="" }) {
    return <th className={`text-left px-3 py-2 font-medium text-zinc-200 ${className}`}>{children}</th>;
}
function Td({ children, mono=false, className="" }) {
    return <td className={`px-3 py-2 ${mono ? "font-mono text-xs" : ""} ${className}`}>{children}</td>;
}
function mask(s) { return s ? s.slice(0, 6) + "…" + s.slice(-4) : "—"; }
function copy(s) { navigator.clipboard.writeText(s).catch(() => {}); }

/* QuickBindModal — оставляем как в предыдущей версии (без изменений) */
function QuickBindModal({ projectId, service, namespaces, onClose, onSaved }) {
    const [nsId, setNsId] = useState(namespaces[0]?.id || "");
    const [permissions, setPermissions] = useState("R");
    const [patterns, setPatterns] = useState("orders:*");
    const [readRps, setReadRps] = useState(0);
    const [writeRps, setWriteRps] = useState(0);
    async function save() {
        if (!nsId) return;
        const body = {
            serviceId: service.id,
            serviceName: service.name,
            permissions,
            patterns: patterns.split(",").map(s => s.trim()).filter(Boolean),
            rate: { readRps: Number(readRps || 0), writeRps: Number(writeRps || 0) },
        };
        const r = await fetch(`/api/projects/${projectId}/namespaces/${nsId}/bindings`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        if (!r.ok) return alert(`Bind HTTP ${r.status}`);
        const created = await r.json();
        onSaved?.({ ...created, nsId });
    }
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative mm-glass rounded-2xl p-4 w-full max-w-xl border border-white/10">
                <div className="text-lg font-semibold mb-2">Bind namespace</div>
                <div className="grid gap-3">
                    <Row label="Namespace">
                        <select className="mm-select w-full" value={nsId} onChange={(e)=>setNsId(e.target.value)}>
                            {namespaces.map(n => <option key={n.id} value={n.id}>{n.prefix}</option>)}
                        </select>
                    </Row>
                    <Row label="Permissions">
                        <select className="mm-select w-full" value={permissions} onChange={(e)=>setPermissions(e.target.value)}>
                            <option value="R">Read</option><option value="W">Write</option><option value="RW">Read/Write</option>
                        </select>
                    </Row>
                    <Row label="Key patterns">
                        <input className="mm-input w-full" value={patterns} onChange={(e)=>setPatterns(e.target.value)} placeholder="orders:*,customers:*" />
                    </Row>
                    <Row label="Rate limits">
                        <div className="grid grid-cols-2 gap-2">
                            <input className="mm-input" type="number" min={0} placeholder="read rps" value={readRps} onChange={(e)=>setReadRps(e.target.value)} />
                            <input className="mm-input" type="number" min={0} placeholder="write rps" value={writeRps} onChange={(e)=>setWriteRps(e.target.value)} />
                        </div>
                    </Row>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={save} disabled={!nsId}>Bind</Button>
                </div>
            </div>
        </div>
    );
}
function Row({ label, children }) {
    return (<label className="grid grid-cols-[180px_1fr] items-center gap-3 my-2.5">
        <span className="opacity-80">{label}</span>{children}
    </label>);
}
