import { useEffect, useState } from "react";
import {useProject} from "@/components/projects/ProjectProvider";
import {Button} from "@/components/ui/button";
import Link from "next/link";
import ServiceWizard from "@/components/services/ServiceWizard";

export default function ServicesOverview() {
    const { id: projectId } = useProject();
    const [items, setItems] = useState(null); // null = loading
    const [error, setError] = useState(null);
    const [wizardOpen, setWizardOpen] = useState(false);

    async function deleteServiceRow(svc) {
        if (!confirm(`Delete service "${svc.name || svc.id}"? This will remove all its bindings.`)) return;
        try {
            const r = await fetch(`/api/projects/${projectId}/services/${svc.id}`, { method: "DELETE" });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
            // локально убираем строку без полного рефетча
            setItems(prev => (prev || []).filter(x => x.id !== svc.id));
        } catch (e) {
            alert(`Delete failed: ${String(e?.message || e)}`);
        }
    }

    async function load() {
        try {
            setError(null);
            const res = await fetch(`/api/projects/${projectId}/services`, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { items } = await res.json();
            setItems(items || []);
            // подтянем числа биндингов параллельно
            items?.forEach(async (svc) => {
                try {
                    const r = await fetch(`/api/projects/${projectId}/services/${svc.id}/bindings`, { cache: "no-store" });
                    if (!r.ok) return;
                    const { nsIds } = await r.json();
                    setItems(prev => prev?.map(s => s.id === svc.id ? { ...s, _bindingsCount: nsIds.length } : s));
                } catch {}
            });
        } catch (e) {
            setError(String(e));
            setItems([]);
        }
    }

    useEffect(() => { if (projectId) load(); }, [projectId]);

    // async function rotateToken(svc) {
    //     try {
    //         const r = await fetch(`/api/projects/${projectId}/services/${svc.id}/rotate`, { method: "POST" });
    //         if (!r.ok) throw new Error(`HTTP ${r.status}`);
    //         const { service } = await r.json();
    //         setItems(prev => prev.map(x => x.id === service.id ? service : x));
    //     } catch (e) { console.error(e); }
    // }

    async function downloadConfig(svc) {
        const token = (svc.tokens || []).find(t => t.status === "active")?.value;
        if (!token) return alert("No active token");
        const r = await fetch(`/api/projects/${projectId}/services/${svc.id}/config`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return alert(`Config HTTP ${r.status}`);
        const cfg = await r.json();
        const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${svc.id}-memmouse-config.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    return (
        <div className="space-y-4">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Services</h1>
                    <p className="text-sm text-zinc-400">Catalog of microservices bound to namespaces.</p>
                </div>
                <Button onClick={() => setWizardOpen(true)}>+ New Service</Button>
            </header>

            {error && <div className="p-3 mm-glass rounded-xl text-red-300">Failed to load: {error}</div>}
            {items === null && !error && <div className="p-3 text-zinc-400">Loading services…</div>}

            {!!items?.length && (
                <div className="mm-glass rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-white/5">
                        <tr>
                            <Th>ID</Th>
                            <Th>Name</Th>
                            <Th>Tokens</Th>
                            <Th>Bindings</Th>
                            <Th className="text-right pr-3">Actions</Th>
                        </tr>
                        </thead>
                        <tbody>
                        {items.map(svc => (
                            <tr key={svc.id} className="border-t border-white/10">
                                {/*<Td mono>{svc.id}</Td>*/}
                                <Td mono><Link href={`/projects/${projectId}/services/${svc.id}`} className="hover:underline">{svc.id}</Link></Td>
                                <Td>{svc.name}</Td>
                                <Td>{svc.tokens?.length ?? 0}</Td>
                                <Td>{svc._bindingsCount ?? "—"}</Td>
                                <Td className="text-right space-x-2">
                                    {/*<Button variant="ghost" onClick={() => rotateToken(svc)}>Rotate token</Button>*/}
                                    <Button variant="ghost" onClick={() => downloadConfig(svc)}>Download config</Button>
                                    <Button variant="ghost" onClick={() => deleteServiceRow(svc)}>Delete</Button>
                                </Td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {items?.length === 0 && <div className="p-4 text-zinc-400">No services yet. Create the first one.</div>}

            <ServiceWizard
                open={wizardOpen}
                onClose={() => setWizardOpen(false)}
                onCreated={() => { setWizardOpen(false); load(); }}
                projectId={projectId}
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