"use client";
import { useEffect, useMemo, useState } from "react";
import ProjectList from "@/components/projects/ProjectList";
import ProjectWizard from "@/components/projects/ProjectWizard";
import { Button } from "@/components/ui/button";
import StickyNavbar from "@/components/navigation/StickyNavbar";

export default function ProjectsOverview() {
    const [projects, setProjects] = useState(null);  // null = loading
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [dept, setDept] = useState("all");
    const [wizardOpen, setWizardOpen] = useState(false);

    async function load() {
        try {
            setError(null);
            const res = await fetch("/api/projects", { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { items } = await res.json();
            setProjects(items || []);
        } catch (e) {
            setError(String(e));
            setProjects([]);
        }
    }

    useEffect(() => { load(); }, []);

    const departments = useMemo(() => {
        if (!projects) return ["all"];
        return ["all", ...Array.from(new Set(projects.map(p => p.department).filter(Boolean)))];
    }, [projects]);

    const filtered = useMemo(() => {
        if (!projects) return [];
        return projects.filter(p => {
            const byDept = dept === "all" || p.department === dept;
            const byText = !search || p.name?.toLowerCase().includes(search.toLowerCase());
            return byDept && byText;
        });
    }, [projects, dept, search]);

    async function handleCreate(formData) {
        // создаём проект в Redis
        const res = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error(`Create failed: HTTP ${res.status}`);
        // перезагружаем список
        await load();
        setWizardOpen(false);
    }

    return (
        <div className="min-h-screen">
            <StickyNavbar />
            <div className="pt-16 p-4 space-y-4">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Projects</h1>
                        <p className="text-sm text-zinc-400">Workspace: <strong>IT department</strong></p>
                    </div>
                    <Button onClick={() => setWizardOpen(true)} className="px-4 py-2">+ New Project</Button>
                </header>

                <section className="flex gap-2">
                    <input
                        placeholder="Search projects…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="mm-input w-full"
                    />
                    <select
                        value={dept}
                        onChange={(e) => setDept(e.target.value)}
                        className="mm-select"
                    >
                        {departments.map(d => (
                            <option key={d} value={d}>{d === "all" ? "All departments" : d}</option>
                        ))}
                    </select>
                </section>

                {error && <div className="p-4 mm-glass rounded-xl text-red-300">Failed to load: {error}</div>}
                {projects === null && !error && <div className="p-4 text-zinc-400">Loading projects…</div>}
                {projects && <ProjectList projects={filtered} />}

                <ProjectWizard
                    open={wizardOpen}
                    onClose={() => setWizardOpen(false)}
                    onCreate={handleCreate}
                />
            </div>
        </div>
    );
}

