import type { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: DefaultSession["user"] & {
            id: string;
            role: "superadmin" | "user";
            username: string;
            ownerUsername: string;
            permission: "edit" | "view";
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        role?: "superadmin" | "user";
        username?: string;
        ownerUsername?: string;
        permission?: "edit" | "view";
    }
}
