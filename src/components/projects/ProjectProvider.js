"use client";
import { createContext, useContext } from "react";

const ProjectContext = createContext(null);

export function ProjectProvider({ value, children }) {
    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
    return useContext(ProjectContext); // { id, name }
}
