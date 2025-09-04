import {useProject} from "@/components/projects/ProjectProvider";
import {useEffect, useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import NamespaceList from "@/components/namespaces/NamespaceList";
import NamespaceWizard from "@/components/namespaces/NamespaceWizard";
import {useBreadcrumbsStore} from "@/store/BreadcrumbStore";

export default function NamespacesOverviewWidget() {
    const { id, name } = useProject(); // из Provider в layout
    const [wizardOpen, setWizardOpen] = useState(false);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [items, setItems] = useState(null); // null = loading
    const [error, setError] = useState(null);
    const router = useRouter();


    useEffect(() => {
        let cancel = false;
        async function load() {
            try {
                const res = await fetch(`/api/projects/${id}/namespaces`, { cache: "no-store" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const { items } = await res.json();
                if (!cancel) setItems(items || []);
                useBreadcrumbsStore.getState().announce({ role: "section", projectId: id, sectionId: "namespaces", sectionName: "Namespaces" });
            } catch (e) {
                if (!cancel) setError(String(e));
            }
        }
        if (id) load().then(r => {});
        return () => { cancel = true; };
    }, [id]);

    const filtered = useMemo(() => {
        if (!items) return [];
        return items.filter(ns => {
            const byStatus = status === "all" || ns.status === status;
            const byText = !q || ns.prefix.toLowerCase().includes(q.toLowerCase());
            return byStatus && byText;
        });
    }, [items, q, status]);

    async function onCreate(nsInput) {
        try {
            const res = await fetch(`/api/projects/${id}/namespaces`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nsInput),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const created = await res.json();
            setItems(prev => [created, ...(prev || [])]);
            setWizardOpen(false);
        } catch (e) {
            console.error(e);
        }
    }

    function onOpen(ns) {
        router.push(`/projects/${id}/namespaces/${ns.id}`);
    }

    async function onToggleFreeze(ns) {
        try {
            const res = await fetch(`/api/projects/${id}/namespaces/${ns.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: ns.status === "frozen" ? "active" : "frozen" }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const updated = await res.json();
            setItems(prev => prev.map(x => (x.id === updated.id ? updated : x)));
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div className="space-y-4">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Namespaces</h1>
                    <p className="text-sm text-zinc-400">Project: <strong>{name}</strong></p>
                </div>
                <Button onClick={() => setWizardOpen(true)} className="px-4 py-2">+ New Namespace</Button>
            </header>

            <section className="flex gap-2">
                <input
                    className="mm-input w-full"
                    placeholder="Search by prefix…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
                <select className="mm-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="frozen">Frozen</option>
                </select>
            </section>

            {error && <div className="p-4 mm-glass rounded-xl text-red-300">Failed to load: {error}</div>}
            {items === null && !error && <div className="p-4 text-zinc-400">Loading namespaces…</div>}
            {items && <NamespaceList items={filtered} onOpen={onOpen} onToggleFreeze={onToggleFreeze} />}

            <NamespaceWizard
                open={wizardOpen}
                onClose={() => setWizardOpen(false)}
                onCreate={onCreate}
                projectId={id}
            />
        </div>
    );
}