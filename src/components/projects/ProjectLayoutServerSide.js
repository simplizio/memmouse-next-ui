import StickyNavbar from "@/components/navigation/StickyNavbar";
import Breadcrumbs from "@/components/navigation/Breadcrumbs";
import ProjectSidebar from "@/components/projects/ProjectSidebar";
import { getProjectCached } from "@/server/services/project.fetch";
import { ProjectProvider } from "@/components/projects/ProjectProvider";

export default async function ProjectLayoutServerSide({ children, params }) {
    const { id } = params;
    const project = await getProjectCached(id);
    const name = project?.name || id;

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
