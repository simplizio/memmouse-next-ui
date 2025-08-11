'use client';

import { FaTachometerAlt, FaDatabase, FaCubes, FaCog } from "react-icons/fa";
// или таблеры: import { TbStack2 } from "react-icons/tb";

const items = [
    { id: "dashboard", label: "Dashboard", icon: FaTachometerAlt },
    { id: "datasets",  label: "Datasets",  icon: FaDatabase },
    { id: "vectors",   label: "Vectors",   icon: FaCubes },
    { id: "settings",  label: "Settings",  icon: FaCog },
];

export default function Sidebar() {
    return (
        <aside
            className="fixed top-16 left-0 bottom-0 w-64 z-40
                 bg-gray-900/70 text-gray-100 backdrop-blur-md
                 border-r border-white/10 overflow-y-auto"
        >
            <nav className="p-3 space-y-1">
                {items.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        // className="w-full text-left px-3 py-2 rounded-md hover:bg-white/10 transition"
                        className="flex
                                    items-center gap-2
                                    w-full
                                    px-4 py-2
                                    bg-white-600
                                    text-white
                                    rounded
                                    hover:bg-white/10 transition"
                    >
                        <Icon className="w-5 h-5 opacity-90" />
                        <span>{label}</span>
                    </button>
                ))}
            </nav>
        </aside>
    );
}
