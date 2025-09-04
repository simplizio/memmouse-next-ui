"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProject } from "@/components/projects/ProjectProvider";
import { Button } from "@/components/ui/button";
import ServiceEditModal from "@/components/services/ServiceEditModal";
import QuickBindModal from "@/components/services/QuickBindModal";
import ServiceAclPanel from "@/components/services/ServiceAclPanel";
import ServiceTokensPanel from "@/components/services/ServiceTokensPanel";
import BindingEditModal from "@/components/bindings/BindingEditModal";
import { useServiceDetailsStore } from "@/store/ServiceDetailsStore";
import BindingListPanel from "@/components/bindings/BindingListPanel";
import {useBreadcrumbsStore} from "@/store/BreadcrumbStore";

export default function ServiceDetailsPage() {
    const { id: projectId, name: projectName } = useProject();
    const { serviceId } = useParams();
    const router = useRouter();

    const { svc, bindings, namespaces, error, loading, refresh, load, removeBinding } = useServiceDetailsStore();

    const [quickBindOpen, setQuickBindOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editCtx, setEditCtx] = useState(null); // { ns, binding }

    useEffect(() => {
        if (!projectId || !serviceId) return;
        load(projectId, serviceId).then(r => {});
    }, [projectId, serviceId, load]);

    useEffect(() => {
        if (!projectId || !svc?.id) return;
        useBreadcrumbsStore.getState().announce({ role: "section", projectId: projectId, sectionId: "services", sectionName: "Services" });
        useBreadcrumbsStore.getState().announce({ role: "service", projectId: projectId, id: svc.id, serviceName: svc.name }, [{ label: "Details" }]);
    }, [projectId, svc?.id, svc?.name]);


    const activeToken = useMemo(
        () => (svc?.tokens || []).find(t => t.status === "active"),
        [svc]
    );

    const boundNs = useMemo(
        () => new Set((bindings || []).map(row => row.ns.id)),
        [bindings]
    );

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


    async function deleteService() {
        if (!confirm("Delete this service? Bindings and ACL user will be removed. Data in namespaces is not touched.")) return;
        const r = await fetch(`/api/projects/${projectId}/services/${serviceId}`, { method: "DELETE" });
        if (!r.ok) return alert(`Delete HTTP ${r.status}`);
        router.push(`/projects/${projectId}/services`);
    }

    if (error) return <div className="p-4 mm-glass rounded-xl text-red-300">Failed to load: {error}</div>;
    if (loading || !svc || !bindings) return <div className="p-4 text-zinc-400">Loading service…</div>;

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
                    <Button onClick={downloadConfig}>Download config</Button>
                    <Button variant="ghost" onClick={deleteService}>Delete</Button>
                </div>
            </header>

            {/* ACL */}
            <section className="mm-glass rounded-2xl p-4">
                <ServiceAclPanel
                    projectId={projectId}
                    service={svc}
                    onUpdated={() => useServiceDetailsStore.getState().reloadServiceOnly(projectId, serviceId)}
                />
            </section>

            {/* Tokens */}
            <section className="mm-glass rounded-2xl p-4">
                <ServiceTokensPanel projectId={projectId} service={svc} />
            </section>

            {/* Bindings */}
            <section className="space-y-3">
                <BindingListPanel
                        projectId={projectId}
                        serviceId={serviceId}
                        onOpenQuickBind={() => setQuickBindOpen(true)}
                        onOpenNamespace={(ns) => router.push(`/projects/${projectId}/namespaces/${ns.id}`)}
                        onEditBinding={(ctx) => setEditCtx(ctx)}
                />
            </section>

            {/* Quick bind */}
            {quickBindOpen && (
                <QuickBindModal
                    projectId={projectId}
                    service={svc}
                    namespaces={namespaces}
                    existingNsIds={boundNs}     // уже привязанные ns
                    open={true}
                    onClose={() => setQuickBindOpen(false)}
                    onSaved={(binding) => {
                        // только родитель знает, как обновлять список
                        useServiceDetailsStore.getState().addOrReplaceBinding(binding);
                        // и при желании в фоне валидация
                        useServiceDetailsStore.getState().refreshBinding(projectId, serviceId, binding.nsId).then(()=>{});
                        setQuickBindOpen(false);
                    }}
                />
            )}

            {/* Edit binding */}
            {editCtx && (
                <BindingEditModal
                    open
                    onClose={() => setEditCtx(null)}
                    projectId={projectId}
                    serviceId={serviceId}
                    ns={editCtx.ns}
                    binding={editCtx.binding}
                    onSaved={(binding) => {
                        useServiceDetailsStore.getState().updateBinding(editCtx.ns.id, binding);
                        useServiceDetailsStore.getState().refreshBinding(projectId, serviceId, editCtx.ns.id).then(()=>{});
                        setEditCtx(null);
                    }}
                />
            )}

            <ServiceEditModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                service={svc}
                projectId={projectId}
                onSaved={async () => {
                    await refresh(projectId, serviceId);
                }}
            />
        </div>
    );
}
