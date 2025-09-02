"use client";

import { useEffect, useMemo, useState } from "react";
import ProjectEventsFeed from "@/components/projects/ProjectEventsFeed";

function bytes(n){ if(n==null) return "—"; const u=["B","KB","MB","GB","TB"]; let i=0,v=n; while(v>=1024&&i<u.length-1){v/=1024;i++;} return `${v.toFixed(v<10?1:0)} ${u[i]}`; }
function pct(u,q){ return Math.max(0, Math.min(100, Math.round((u/Math.max(q||1,1))*100))); }

function Card({ title, children }) {
    return (
        <div className="mm-glass rounded-2xl p-4">
            <div className="text-sm font-semibold mb-2">{title}</div>
            {children}
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div className="mm-glass rounded-xl px-3 py-2">
            <div className="font-semibold">{value}</div>
            <div className="text-xs text-zinc-300">{label}</div>
        </div>
    );
}

function Progress({ used, quota, small=false }) {
    const p = pct(used, quota);
    return (
        <div className={`rounded-full bg-white/10 overflow-hidden border border-white/10 ${small ? "h-2" : "h-3"}`}>
            <div className="h-full bg-white/60" style={{ width: `${p}%` }} />
        </div>
    );
}

export default function ProjectDetailsClientSideWidget({ projectId }) {
    const [namespaces, setNamespaces] = useState([]);
    const [services, setServices] = useState([]);
    const [bindingsCount, setBindingsCount] = useState(0);
    const [err, setErr] = useState(null);
    const [loading, setLoading] = useState(true);

    async function fetchJSON(url, init) {
        const r = await fetch(url, { cache: "no-store", ...init });
        if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
        return r.json();
    }

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true); setErr(null);

                const [nsRes, svcRes] = await Promise.all([
                    fetchJSON(`/api/projects/${projectId}/namespaces`),
                    fetchJSON(`/api/projects/${projectId}/services`),
                ]);

                if (cancelled) return;
                const ns = nsRes?.items || [];
                const sv = svcRes?.items || [];
                setNamespaces(ns);
                setServices(sv);

                // посчитаем биндинги: для демки пойдём простым путём
                const lists = await Promise.all(
                    sv.map(s => fetch(`/api/projects/${projectId}/services/${s.id}/bindings`, { cache: "no-store" })
                        .then(r => r.ok ? r.json() : { items: [] })
                        .catch(() => ({ items: [] })))
                );
                if (cancelled) return;
                setBindingsCount(lists.reduce((acc, j) => acc + (j.items?.length || 0), 0));
            } catch (e) {
                if (!cancelled) setErr(String(e?.message || e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [projectId]);

    const totals = useMemo(() => {
        return (namespaces || []).reduce((acc, n) => {
            acc.usedBytes += n.usedBytes || 0;
            acc.quotaBytes += n.quotaBytes || 0;
            acc.rps += n.ops?.rps || 0;
            acc.wps += n.ops?.wps || 0;
            return acc;
        }, { usedBytes: 0, quotaBytes: 0, rps: 0, wps: 0 });
    }, [namespaces]);

    const top = useMemo(() => {
        return [...(namespaces || [])]
            .sort((a,b) => (b.usedBytes||0) - (a.usedBytes||0))
            .slice(0, 5);
    }, [namespaces]);

    if (loading) {
        return <div className="p-4 text-zinc-400">Loading project overview…</div>;
    }
    if (err) {
        return <div className="p-4 text-red-300">Error: {err}</div>;
    }

    return (
        <div className="space-y-6">
            <section className="grid gap-3 grid-cols-1 lg:grid-cols-3">
                <Card title="Capacity">
                    <Progress used={totals.usedBytes} quota={totals.quotaBytes} />
                    <div className="mt-2 text-xs text-zinc-300">
                        Used {bytes(totals.usedBytes)} / {bytes(totals.quotaBytes)} ({pct(totals.usedBytes, totals.quotaBytes)}%)
                    </div>
                </Card>
                <Card title="Inventory">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <Stat label="Namespaces" value={namespaces.length} />
                        <Stat label="Services" value={services.length} />
                        <Stat label="Bindings" value={bindingsCount} />
                    </div>
                </Card>
                <Card title="Ops snapshot">
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <Stat label="Reads/sec" value={totals.rps} />
                        <Stat label="Writes/sec" value={totals.wps} />
                    </div>
                </Card>
            </section>

            <section className="grid gap-3 grid-cols-1 lg:grid-cols-2">
                <Card title="Top namespaces (by used)">
                    <div className="grid gap-2">
                        {top.map((n) => (
                            <div key={n.id} className="mm-glass rounded-xl p-2">
                                <div className="flex items-center justify-between">
                                    <div className="font-semibold">{n.prefix}</div>
                                    <div className="text-sm">{bytes(n.usedBytes)} / {bytes(n.quotaBytes)}</div>
                                </div>
                                <Progress used={n.usedBytes} quota={n.quotaBytes} small />
                                <div className="mt-1 text-xs text-zinc-400">
                                    TTL: {n.ttl === "none" ? "—" : n.ttl} • {n.eviction} • Keys: {n.keys ?? 0}
                                </div>
                            </div>
                        ))}
                        {!top.length && <div className="p-2 text-zinc-400">No namespaces yet.</div>}
                    </div>
                </Card>

                <Card title="Recent events">
                    <ProjectEventsFeed projectId={projectId} />
                </Card>
            </section>
        </div>
    );
}
