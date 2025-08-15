"use client";
import ProjectCard from "@/components/projects/ProjectCard";

export default function ProjectList({ projects, onOpen }) {
    if (!projects?.length) {
        return (
            <div className="p-6 text-zinc-400">No projects yet. Create the first one.</div>
        );
    }
    return (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((p) => (
                <ProjectCard key={p.id} project={p} onOpen={() => onOpen?.(p)} />
            ))}
        </div>
    );
}
