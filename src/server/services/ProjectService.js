import { ProjectRepo } from "../repos/ProjectRepo.js";
import { ulid } from "ulidx";

export const ProjectService = {
    async create(input) {
        const p = { id: ulid(), updatedAt: Date.now(), ...input };
        return ProjectRepo.create(p);
    },
};