import type { Db } from "mongodb";
import {
    MAX_EDIT_USERS_PER_OWNER,
    MAX_PROJECTS_PER_OWNER,
    MAX_USERS_PER_OWNER,
    MAX_VIEW_USERS_PER_OWNER,
} from "@/lib/access";
import type { AppUser } from "@/types/app-user";
import type { PaperDocument } from "@/types/paper-document";

export async function getWorkspaceProjectCount(db: Db, ownerUsername: string) {
    return db.collection<PaperDocument>("papers").countDocuments({ ownerUsername });
}

export async function getWorkspaceUserCounts(db: Db, ownerUsername: string) {
    const users = await db
        .collection<AppUser>("users")
        .find({ ownerUsername }, { projection: { permission: 1 } })
        .toArray();

    const editUsers = users.filter((user) => user.permission === "edit").length;
    const viewUsers = users.filter((user) => user.permission === "view").length;

    return {
        totalUsers: users.length,
        editUsers,
        viewUsers,
        canAddAny: users.length < MAX_USERS_PER_OWNER,
        canAddEdit: editUsers < MAX_EDIT_USERS_PER_OWNER,
        canAddView: viewUsers < MAX_VIEW_USERS_PER_OWNER,
    };
}

export function getProjectLimitMessage(projectCount: number) {
    return projectCount >= MAX_PROJECTS_PER_OWNER
        ? `This workspace has reached the ${MAX_PROJECTS_PER_OWNER}-project limit.`
        : `You can create up to ${MAX_PROJECTS_PER_OWNER} projects in this workspace.`;
}
