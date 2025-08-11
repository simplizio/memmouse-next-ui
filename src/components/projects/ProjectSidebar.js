"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSelectedLayoutSegments } from "next/navigation"; // <-- ключевой хук
import {
    LayoutDashboard, Boxes, Share2, ScrollText, Cable, Activity, Settings,
    ChevronLeft, ChevronRight
} from "lucide-react";

export default function ProjectSidebar({ projectId, projectName, items, storageKey = "mm:psidebar" }) {
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        try { const saved = localStorage.getItem(storageKey); if (saved) setCollapsed(saved === "1"); } catch {}
    }, [storageKey]);

    useEffect(() => { try { localStorage.setItem(storageKey, collapsed ? "1" : "0"); } catch {} }, [collapsed, storageKey]);

    const defaultItems = useMemo(() => ([
        { key: "overview",   label: "Overview",   href: (id) => `/projects/${id}`,             icon: LayoutDashboard },
        { key: "namespaces", label: "Namespaces", href: (id) => `/projects/${id}/namespaces`, icon: Boxes },
        { key: "services",   label: "Services",   href: (id) => `/projects/${id}/services`,   icon: Share2 },
        { key: "contracts",  label: "Contracts",  href: (id) => `/projects/${id}/contracts`,  icon: ScrollText },
        { key: "pipelines",  label: "Pipelines",  href: (id) => `/projects/${id}/pipelines`,  icon: Cable },
        { key: "events",     label: "Events",     href: (id) => `/projects/${id}/events`,     icon: Activity, badge: 0 },
        { key: "settings",   label: "Settings",   href: (id) => `/projects/${id}/settings`,   icon: Settings },
    ]), []);

    const navItems = useMemo(() => {
        const list = items?.length ? items : defaultItems;
        return list.map(it => ({ ...it, href: typeof it.href === "function" ? it.href(projectId) : it.href }));
    }, [items, defaultItems, projectId]);

    // 👇 определяем, какой пункт активен, по сегментам внутри `[id]`
    const segments = useSelectedLayoutSegments(); // e.g. [] | ["namespaces"] | ["services", ...]
    const current = segments[0] ?? "overview";

    return (
        <aside className={`sticky top-16 shrink-0 transition-[width] duration-200
                       h-[calc(100vh-64px)] border-r border-white/10
                       bg-[rgba(12,12,14,0.65)] backdrop-blur-xl
                       ${collapsed ? "w-16" : "w-64"}`}>
            <div className="flex items-center justify-between px-2 py-2">
                <div className={`px-2 text-sm opacity-80 ${collapsed ? "opacity-0 pointer-events-none" : ""}`}>
                    <div className="font-semibold">Project</div>
                    <div className="font-semibold truncate">{projectName || "Project"}</div>
                    <div className="truncate text-xs text-zinc-400">{projectId}</div>
                </div>
                <button
                    onClick={() => setCollapsed(v => !v)}
                    className="rounded-xl border border-white/10 p-1 hover:bg-white/10"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    title={collapsed ? "Expand" : "Collapse"}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            </div>

            <nav className="mt-1 px-2 flex flex-col gap-1">
                {navItems.map(({ key, label, href, icon: Icon = LayoutDashboard, badge }) => {
                    const active = (current === "overview" && key === "overview") || (current !== "overview" && key === current);
                    return (
                        <Link
                            key={key}
                            href={href}
                            title={collapsed ? label : undefined}
                            className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm border transition ${
                                active ? "bg-white/15 border-white/20" : "border-white/10 hover:bg-white/10 hover:border-white/15"
                            }`}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className={`${collapsed ? "opacity-0 pointer-events-none" : ""}`}>{label}</span>
                            {!!badge && !collapsed && (
                                <span className="ml-auto text-[10px] rounded-full px-1.5 py-0.5 bg-white/20">{badge}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className={`mt-auto p-2 ${collapsed ? "opacity-0 pointer-events-none" : ""}`}>
                <div className="rounded-2xl border border-white/10 p-3 text-xs opacity-80">
                    Tips: Use the sidebar to navigate project scopes.
                </div>
            </div>
        </aside>
    );
}


// "use client";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { useEffect, useMemo, useState } from "react";
// import {
//     LayoutDashboard, Boxes, Share2, ScrollText, Cable, Activity, Settings,
//     ChevronLeft, ChevronRight
// } from "lucide-react";
//
// /**
//  * Props:
//  * - projectId: string
//  * - items?: Array<{ key, label, href?: string | (id)=>string, icon?: ReactComp, badge?: number }>
//  * - storageKey?: string  (for collapsed state)
//  */
// export default function ProjectSidebar({ projectId, items, storageKey = "mm:psidebar" }) {
//     const pathname = usePathname();
//     const [collapsed, setCollapsed] = useState(false);
//
//     useEffect(() => {
//         try {
//             const saved = localStorage.getItem(storageKey);
//             if (saved) setCollapsed(saved === "1");
//         } catch {}
//     }, [storageKey]);
//
//     useEffect(() => {
//         try { localStorage.setItem(storageKey, collapsed ? "1" : "0"); } catch {}
//     }, [collapsed, storageKey]);
//
//     const defaultItems = useMemo(() => ([
//         { key: "overview",   label: "Overview",   href: (id) => `/projects/${id}`,              icon: LayoutDashboard },
//         { key: "namespaces", label: "Namespaces", href: (id) => `/projects/${id}/namespaces`,  icon: Boxes },
//         { key: "services",   label: "Services",   href: (id) => `/projects/${id}/services`,    icon: Share2 },
//         { key: "contracts",  label: "Contracts",  href: (id) => `/projects/${id}/contracts`,   icon: ScrollText },
//         { key: "pipelines",  label: "Pipelines",  href: (id) => `/projects/${id}/pipelines`,   icon: Cable },
//         { key: "events",     label: "Events",     href: (id) => `/projects/${id}/events`,      icon: Activity, badge: 0 },
//         { key: "settings",   label: "Settings",   href: (id) => `/projects/${id}/settings`,    icon: Settings },
//     ]), []);
//
//     const navItems = useMemo(() => {
//         const list = items && items.length ? items : defaultItems;
//         return list.map(it => ({
//             ...it,
//             href: typeof it.href === "function" ? it.href(projectId) : it.href
//         }));
//     }, [items, defaultItems, projectId]);
//
//     return (
//         <aside
//             className={`sticky top-16 shrink-0 transition-[width] duration-200
//                   h-[calc(100vh-64px)] border-r border-white/10
//                   bg-[rgba(12,12,14,0.65)] backdrop-blur-xl
//                   ${collapsed ? "w-16" : "w-64"}`}
//         >
//             {/* header */}
//             <div className="flex items-center justify-between px-2 py-2">
//                 <div className={`px-2 text-sm opacity-80 ${collapsed ? "opacity-0 pointer-events-none" : ""}`}>
//                     <div className="font-semibold">Project</div>
//                     <div className="truncate text-xs text-zinc-400">{projectId}</div>
//                 </div>
//                 <button
//                     onClick={() => setCollapsed(v => !v)}
//                     aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
//                     className="rounded-xl border border-white/10 p-1 hover:bg-white/10"
//                     title={collapsed ? "Expand" : "Collapse"}
//                 >
//                     {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
//                 </button>
//             </div>
//
//             {/* nav */}
//             <nav className="mt-1 px-2 flex flex-col gap-1">
//                 {navItems.map(({ key, label, href, icon: Icon = LayoutDashboard, badge }) => {
//                     const active = pathname === href || pathname.startsWith(String(href) + "/");
//                     return (
//                         <Link
//                             key={key}
//                             href={href}
//                             title={collapsed ? label : undefined}
//                             className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm
//                           border transition
//                           ${active
//                                 ? "bg-white/15 border-white/20"
//                                 : "border-white/10 hover:bg-white/10 hover:border-white/15"
//                             }`}
//                         >
//                             <Icon className="h-5 w-5 shrink-0" />
//                             <span className={`${collapsed ? "opacity-0 pointer-events-none" : ""}`}>{label}</span>
//                             {!!badge && !collapsed && (
//                                 <span className="ml-auto text-[10px] rounded-full px-1.5 py-0.5 bg-white/20">
//                   {badge}
//                 </span>
//                             )}
//                         </Link>
//                     );
//                 })}
//             </nav>
//
//             {/* footer slot (optional) */}
//             <div className={`mt-auto p-2 ${collapsed ? "opacity-0 pointer-events-none" : ""}`}>
//                 <div className="rounded-2xl border border-white/10 p-3 text-xs opacity-80">
//                     Tips: Use the sidebar to navigate project scopes.
//                 </div>
//             </div>
//         </aside>
//     );
// }
