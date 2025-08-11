"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
    { href: (id) => `/projects/${id}`, label: "Overview" },
    { href: (id) => `/projects/${id}/namespaces`, label: "Namespaces" },
    { href: (id) => `/projects/${id}/services`, label: "Services" },
    { href: (id) => `/projects/${id}/contracts`, label: "Contracts" },
    { href: (id) => `/projects/${id}/pipelines`, label: "Pipelines" },
    { href: (id) => `/projects/${id}/events`, label: "Events" },
    { href: (id) => `/projects/${id}/settings`, label: "Settings" },
];

export default function ProjectTabs({ projectId }) {
    const pathname = usePathname();
    return (
        <div className="px-4 border-b border-white/10">
            <div className="flex gap-2 overflow-x-auto py-2">
                {tabs.map(t => {
                    const href = t.href(projectId);
                    const active = pathname === href || pathname.startsWith(href + "/");
                    return (
                        <Link key={t.label} href={href}
                              className={`px-3 py-1.5 rounded-xl border transition whitespace-nowrap ${
                                  active ? "border-white/20 bg-white/15" : "border-white/10 hover:bg-white/10"
                              }`}
                        >
                            {t.label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}