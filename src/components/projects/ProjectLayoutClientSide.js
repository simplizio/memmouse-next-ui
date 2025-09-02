import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import StickyNavbar from "@/components/navigation/StickyNavbar";
import Breadcrumbs from "@/components/navigation/Breadcrumbs";
import ProjectSidebar from "@/components/projects/ProjectSidebar";
import { ProjectProvider } from "@/components/projects/ProjectProvider";

export default function ProjectLayoutClientSide({ children }) {
    const { id } = useParams();                // доступно только в клиентском компоненте
    const [name, setName] = useState(id);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                // если нет этого роута, просто останется id
                const r = await fetch(`/api/projects/${id}`, { cache: "no-store" });
                if (alive && r.ok) {
                    const j = await r.json();
                    setName(j?.name || id);
                }
            } catch {
                /* no-op; оставим id */
            }
        })();
        return () => { alive = false; };
    }, [id]);

    return (
        <div className="min-h-screen">
            <StickyNavbar />
            <Breadcrumbs
                items={[
                    { label: "Workspace", href: "/" },
                    { label: "Projects", href: "/projects" },
                    { label: name },
                ]}
            />
            <ProjectProvider value={{ id, name }}>
                <div className="pt-2 px-4 flex gap-4">
                    <ProjectSidebar projectId={id} projectName={name} />
                    <main className="flex-1 min-w-0 p-2">{children}</main>
                </div>
            </ProjectProvider>
        </div>
    );
}