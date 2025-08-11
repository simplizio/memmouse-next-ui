import { cache } from "react";
import { ProjectRepo } from "@/server/repos/ProjectRepo.js";

export const getProjectCached = cache(async (id) => {
    return await ProjectRepo.get(id); // { id, name, ... } or null
});
