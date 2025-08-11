"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import NamespaceBindingsList from "@/components/namespaces/NamespaceBindingsList";
import BindingWizard from "@/components/namespaces/BindingWizard";
import NamespacePolicyModal from "@/components/namespaces/NamespacePolicyModal";

export default function NamespaceDetailsPage() {
    const { id, nsId } = useParams();
    const [ns, setNs] = useState(null);
    const [bindings, setBindings] = useState(null);
    const [error, setError] = useState(null);
    const [bindOpen, setBindOpen] = useState(false);
    const [policyOpen, setPolicyOpen] = useState(false);
    const [events, setEvents] = useState(null);

    useEffect(() => {
        let cancel = false;
        async function load() {
            try {
                const [nsRes, bRes] = await Promise.all([
                    fetch(`/api/projects/${id}/namespaces/${nsId}`, { cache: "no-store" }),
                    fetch(`/api/projects/${id}/namespaces/${nsId}/bindings`, { cache: "no-store" }),
                ]);
                if (!nsRes.ok) throw new Error(`NS HTTP ${nsRes.status}`);
                if (!bRes.ok) throw new Error(`Bindings HTTP ${bRes.status}`);
                const nsJson = await nsRes.json();
                const bJson = await bRes.json();
                if (!cancel) { setNs(nsJson); setBindings(bJson.items || []); }
            } catch (e) { if (!cancel) setError(String(e)); }
        }
        if (id && nsId) load();
        return () => { cancel = true; };
    }, [id, nsId]);

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

    async function handleBindSave(data) {
        const res = await fetch(`/api/projects/${id}/namespaces/${nsId}/bindings`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            const created = await res.json();
            setBindings(prev => [created, ...(prev || [])]);
            setBindOpen(false);
        }
    }

    async function handleUnbind(b) {
        const res = await fetch(`/api/projects/${id}/namespaces/${nsId}/bindings/${b.serviceId}`, { method: "DELETE" });
        if (res.ok) setBindings(prev => prev.filter(x => x.serviceId !== b.serviceId));
    }

    if (error) return <div className="p-4 mm-glass rounded-xl text-red-300">Failed to load: {error}</div>;
    if (!ns || !bindings) return <div className="p-4 text-zinc-400">Loading namespace…</div>;

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
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Service bindings</h2>
                    <Button onClick={() => setBindOpen(true)}>+ Bind service</Button>
                </div>
                <NamespaceBindingsList items={bindings} onUnbind={handleUnbind} onEdit={() => {}} />
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

            <BindingWizard open={bindOpen} onClose={() => setBindOpen(false)} onSave={handleBindSave} />
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


// export default async function NamespaceDetailsPage({ params }) {
//     const { id, nsId } = await params;
//     return (
//         <div>
//             <h1 className="text-xl font-semibold mb-3">Namespace</h1>
//             <p className="text-zinc-400">Project: <code>{id}</code></p>
//             <p className="text-zinc-400">Namespace ID: <code>{nsId}</code></p>
//             <p className="text-zinc-400 mt-2">Details coming soon…</p>
//         </div>
//     );
// }
