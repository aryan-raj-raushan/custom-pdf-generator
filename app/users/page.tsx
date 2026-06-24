import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { getOwnerUsername } from "@/lib/access";
import { getWorkspaceUserCounts } from "@/lib/workspace";
import type { AppUser } from "@/types/app-user";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");
    if (session.user.role !== "superadmin") redirect("/dashboard");

    const ownerUsername = getOwnerUsername(session);
    if (!ownerUsername) redirect("/login");

    const db = await getDb();
    const users = await db
        .collection<AppUser>("users")
        .find({ ownerUsername }, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .toArray();

    const counts = await getWorkspaceUserCounts(db, ownerUsername);

    const initialUsers = users.map((user) => ({
        _id: user._id!.toString(),
        username: user.username,
        role: user.role,
        permission: user.permission,
        createdAt: user.createdAt.toISOString(),
    }));

    return (
        <UsersClient
            initialUsers={initialUsers}
            limits={{
                totalUsers: counts.totalUsers,
                editUsers: counts.editUsers,
                viewUsers: counts.viewUsers,
                canAddAny: counts.canAddAny,
                canAddEdit: counts.canAddEdit,
                canAddView: counts.canAddView,
            }}
        />
    );
}