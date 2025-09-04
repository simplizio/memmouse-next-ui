import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import StickyNavbar from "@/components/navigation/StickyNavbar";
import ProjectSidebar from "@/components/projects/ProjectSidebar";
import { ProjectProvider } from "@/components/projects/ProjectProvider";
import {useBreadcrumbsStore} from "@/store/BreadcrumbStore";
import Breadcrumbs from "@/components/navigation/Breadcrumbs";

export default function ProjectLayoutClientSide({ children }) {
    const { id } = useParams();                // доступно только в клиентском компоненте
    const [name, setName] = useState(id);

    const { clear } = useBreadcrumbsStore();

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                // если нет этого роута, просто останется id
                const r = await fetch(`/api/projects/${id}`, { cache: "no-store" });
                if (alive && r.ok) {
                    const project = await r.json();
                    setName(project?.name || id);
                    useBreadcrumbsStore.getState().announce({ role: "projects" });
                    useBreadcrumbsStore.getState().announce({ role: "project", projectId: id, projectName: project?.name });
                }
            } catch {
                /* no-op; оставим id */
            }
        })();
        return () => { alive = false; clear(); };
    }, [id, name]);

    return (
        <div className="min-h-screen">
            <StickyNavbar />
            <Breadcrumbs/>
            <ProjectProvider value={{ id, name }}>
                <div className="pt-2 px-4 flex gap-4">
                    <ProjectSidebar projectId={id} projectName={name} />
                    <main className="flex-1 min-w-0 p-2">{children}</main>
                </div>
            </ProjectProvider>
        </div>
    );
}