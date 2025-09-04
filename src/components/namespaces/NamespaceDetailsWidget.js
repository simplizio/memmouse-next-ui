import {useEffect, useMemo, useState} from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import BindingWizard from "@/components/namespaces/BindingWizard";
import NamespacePolicyModal from "@/components/namespaces/NamespacePolicyModal";
import BindingEditModal from "@/components/bindings/BindingEditModal";
import {useNamespaceBindingsStore} from "@/store/NamespaceBindingStore";
import NamespaceBindingsPanel from "@/components/bindings/NamespaceBindingsPanel";
import {useBreadcrumbsStore} from "@/store/BreadcrumbStore";

export default function NamespaceDetailsWidget() {
    const { id, nsId } = useParams();
    const [policyOpen, setPolicyOpen] = useState(false);
    const [events, setEvents] = useState(null);

    const [bindOpen, setBindOpen] = useState(false);

    const [editCtx, setEditCtx] = useState(null); // { binding, service }

    const { ns, bindings, services, error, loading, load, addOrReplace, remove, refreshOne } = useNamespaceBindingsStore();

    useEffect(() => { if (id && nsId) load(id, nsId).then(()=>{}); }, [id, nsId, load]);

    useEffect(() => {
        if (!id || !nsId) return;
        useBreadcrumbsStore.getState().announce({ role: "section", projectId: id, sectionId: "namespaces", sectionName: "Namespaces" });
        useBreadcrumbsStore.getState().announce({ role: "namespace", projectId: id, id: nsId, nsName: ns?.name || nsId }, [{ label: "Details" }]);
    }, [id, nsId, ns?.name]);


    // const [services, setServices] = useState([]);
    const availableServices =   useMemo(() => {
        const used = new Set((bindings || []).map(b => b.serviceId));
        return (services || []).filter(s => !used.has(s.id));
    }, [bindings, services]);

    function openCreate() {
        setBindMode("create");
        setEditBinding(null);
        setBindOpen(true);
    }
    function openEdit(binding) {
        setBindMode("edit");
        setEditBinding(binding);
        setBindOpen(true);
    }

    // quick events (stubbed API)
    useEffect(() => {
        let cancel = false;
        async function load() {
            try {
                const res = await fetch(`/api/projects/${id}/events?nsId=${nsId}`, { cache: "no-store" });
                if (!res.ok) throw new Error(`Events HTTP ${res.status}`);
                const { items } = await res.json();
                if (!cancel) setEvents(items || []);
            } catch { if (!cancel) setEvents([]); }
        }
        if (id && nsId) load();
        return () => { cancel = true; };
    }, [id, nsId]);

    async function toggleFreeze() {
        const nextStatus = ns.status === "frozen" ? "active" : "frozen";
        const res = await fetch(`/api/projects/${id}/namespaces/${nsId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
        });
        if (res.ok) { const updated = await res.json(); setNs(updated); }
    }

    if (error) return <div className="p-4 mm-glass rounded-xl text-red-300">Failed to load: {error}</div>;

    if (loading || !ns || !bindings) return <div className="p-4 text-zinc-400">Loading namespace…</div>;

    const p = Math.max(0, Math.min(100, Math.round((ns.usedBytes / Math.max(ns.quotaBytes || 1, 1)) * 100)));

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">{ns.prefix}</h1>
                    <div className="mt-1 text-sm text-zinc-400">TTL: {ns.ttl === "none" ? "—" : ns.ttl} • {ns.eviction}</div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={toggleFreeze}>{ns.status === "frozen" ? "Unfreeze" : "Freeze"}</Button>
                    <Button variant="ghost">Purge volatile</Button>
                    <Button onClick={()=>setPolicyOpen(true)}>Edit policy</Button>
                </div>
            </header>

            <section className="grid gap-3 grid-cols-1 md:grid-cols-2">
                <div className="mm-glass rounded-2xl p-4">
                    <div className="text-sm mb-2">Usage</div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden border border-white/10">
                        <div className="h-full bg-white/60" style={{ width: `${p}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-zinc-300 flex justify-between">
                        <span>Used {bytes(ns.usedBytes)} / {bytes(ns.quotaBytes)}</span>
                        <span>{p}%</span>
                    </div>
                </div>
                <div className="mm-glass rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
                    <Meta label="Keys" value={ns.keys ?? 0} />
                    <Meta label="RPS" value={ns.ops?.rps ?? 0} />
                    <Meta label="WPS" value={ns.ops?.wps ?? 0} />
                </div>
            </section>

            <section className="space-y-3">
                <div className="space-y-4">
                    {error && <div className="text-red-400 text-sm">{error}</div>}

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-lg font-semibold">{ns?.name || nsId}</div>
                            <div className="text-xs opacity-70 font-mono">{ns?.prefix || nsId}</div>
                        </div>
                        <div>
                            <Button onClick={() => setBindOpen(true)}>+ New binding</Button>
                        </div>
                    </div>

                    <NamespaceBindingsPanel
                        projectId={id}
                        ns={ns}
                        bindings={bindings}
                        services={services}
                        onOpenService={(svc) => window.location.href = `/projects/${id}/services/${svc?.id || svc?.serviceId}`}
                        onEdit={({ binding, service }) => setEditCtx({ binding, service })}
                        onUnbind={async (b) => {
                            try { await useNamespaceBindingsStore.getState().unbind(id, nsId, b.serviceId); }
                            catch(e){ alert(String(e?.message || e)); }
                        }}
                    />

                    {/* Create binding (single NS) */}
                    {bindOpen && (
                        <BindingWizard
                           open={bindOpen}
                           onClose={() => setBindOpen(false)}
                           projectId={id}
                           nsId={nsId}
                           onSaved={(saved) => { addOrReplace(saved); refreshOne(id, nsId, saved.serviceId).then(r => {}); }}
                        />
                    )}

                    {/* Edit binding */}
                    {editCtx && (
                        <BindingEditModal
                            open
                            onClose={() => setEditCtx(null)}
                            projectId={id}
                            serviceId={editCtx.binding.serviceId}
                            ns={ns}
                            binding={editCtx.binding}
                            onSaved={(saved) => {
                                const b = saved?.binding || saved;
                                addOrReplace(b);
                                refreshOne(id, nsId, b.serviceId).then(r => {});
                                setEditCtx(null);
                            }}
                        />
                    )}
                </div>
            </section>

            <section className="space-y-2">
                <h2 className="text-lg font-semibold">Recent events</h2>
                {!events ? (
                    <div className="p-4 text-zinc-400">Loading events…</div>
                ) : events.length === 0 ? (
                    <div className="p-3 mm-glass rounded-xl text-zinc-400">No recent events.</div>
                ) : (
                    <div className="grid gap-2">
                        {events.map((ev, i) => (
                            <div key={i} className="mm-glass rounded-xl p-2 text-sm">
                                <span className="opacity-70">{new Date(ev.ts).toLocaleString()}</span>{" — "}
                                <span className="font-medium">{ev.type}</span>
                                {ev.message ? <> — <span className="opacity-90">{ev.message}</span></> : null}
                            </div>
                        ))}
                    </div>
                )}
            </section>


            <NamespacePolicyModal
                open={policyOpen}
                onClose={()=>setPolicyOpen(false)}
                ns={ns}
                projectId={id}
                onSaved={(updated)=>setNs(updated)}
            />
        </div>
    );
}

function bytes(n) {
    if (n == null) return "—";
    const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0, v = n;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`;
}
function Meta({ label, value }) {
    return (
        <div className="mm-glass rounded-xl px-3 py-2">
            <div className="font-semibold">{value}</div>
            <div className="text-xs text-zinc-300">{label}</div>
        </div>
    );
}