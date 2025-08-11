import { getProjectCached } from "@/server/services/project.fetch";

export default async function ProjectOverviewPage({ params }) {
    const { id } = await params;
    const project = await getProjectCached(id);
    const name = project?.name || id;
    return (
        <div>
            <h1 className="text-xl font-semibold mb-3">Overview — {name}</h1>
            <p className="text-zinc-400">Project ID: <code>{id}</code></p>
        </div>
    );
}


// export default async function ProjectOverviewPage({ params }) {
//     const { id } = await params;
//     return (
//         <div>
//             <h1 className="text-xl font-semibold mb-3">Overview</h1>
//             <p className="text-zinc-400">Project ID: <code>{id}</code></p>
//             <p className="text-zinc-400 mt-2">Overview content goes here…</p>
//         </div>
//     );
// }

// import StickyNavbar from "@/components/navigation/StickyNavbar";
// import Breadcrumbs from "@/components/navigation/Breadcrumbs";
// import ProjectSidebar from "@/components/projects/ProjectSidebar";
//
// export default function ProjectPage({ params }) {
//     const { id } = params;
//
//     return (
//         <div className="min-h-screen">
//             <StickyNavbar />
//
//             {/* breadcrumbs */}
//             {/*<div className="px-4 pt-2 text-sm text-zinc-400">*/}
//             {/*    <span className="hover:text-zinc-200"><a href="/">Workspace</a></span>*/}
//             {/*    <span className="opacity-50"> / </span>*/}
//             {/*    <span className="hover:text-zinc-200"><a href="/projects">Projects</a></span>*/}
//             {/*    <span className="opacity-50"> / </span>*/}
//             {/*    <span className="text-zinc-200">{id}</span>*/}
//             {/*</div>*/}
//
//             <Breadcrumbs items={[
//                 { label: "Workspace", href: "/" },
//                 { label: "Projects", href: "/projects" },
//                 { label: id },
//             ]}/>
//
//             {/* layout with sidebar */}
//             <div className="pt-2 px-4 flex gap-4">
//                 <ProjectSidebar projectId={id} />
//
//                 <main className="flex-1 min-w-0 p-2">
//                     <h1 className="text-xl font-semibold mb-3">Project: {id}</h1>
//                     <p className="text-zinc-400">Overview content goes here…</p>
//                 </main>
//             </div>
//         </div>
//     );
// }


// import StickyNavbar from "@/components/navigation/StickyNavbar";
// import Breadcrumbs from "@/components/navigation/Breadcrumbs";
// import ProjectTabs from "@/components/projects/ProjectTabs";
//
// export default function ProjectPage({ params }) {
//     const { id } = params;
//     return (
//         <div className="min-h-screen">
//             <StickyNavbar />
//             <Breadcrumbs items={[
//                 { label: "Workspace", href: "/" },
//                 { label: "Projects", href: "/projects" },
//                 { label: id },
//             ]}/>
//             <ProjectTabs projectId={id} />
//             <div className="p-4">
//                 <h1 className="text-xl font-semibold mb-3">Project: {id}</h1>
//                 <p className="text-zinc-400">Overview content goes here…</p>
//             </div>
//         </div>
//     );
// }

// import StickyNavbar from "@/components/navigation/StickyNavbar";
// import Breadcrumbs from "@/components/navigation/Breadcrumbs";
// import ProjectTabs from "@/components/projects/ProjectTabs";
//
// export default function ProjectPage({ params }) {
//     const { id } = params;
//     return (
//         <div className="min-h-screen">
//             <StickyNavbar />
//             <Breadcrumbs items={[
//                 { label: "Workspace", href: "/" },
//                 { label: "Projects", href: "/projects" },
//                 { label: id }, // подставишь имя проекта, когда подтянешь данные
//             ]}/>
//             <ProjectTabs projectId={id} />
//
//             {/* content */}
//             <div className="p-4">
//                 <h1 className="text-xl font-semibold mb-3">Project: {id}</h1>
//                 <p className="text-zinc-400">Overview content goes here…</p>
//             </div>
//         </div>
//     );
// }