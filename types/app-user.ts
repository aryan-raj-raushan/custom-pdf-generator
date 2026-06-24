import type { ObjectId } from "mongodb";
import type { WorkspacePermission } from "@/lib/access";

export type AppUserRole = "superadmin" | "user";

export interface AppUser {
    _id?: ObjectId;
    username: string;
    password: string;
    role: "user";
    permission: WorkspacePermission;
    ownerUsername: string;
    createdAt: Date;
}
