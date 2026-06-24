import { getServerSession, type Session } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { AppUser } from "@/types/app-user";
import {
    MAX_USERS_PER_OWNER,
    WorkspacePermission,
    getOwnerUsername,
    isReservedSuperadminUsername,
} from "@/lib/access";
import { getWorkspaceUserCounts } from "@/lib/workspace";

function ensureSuperadmin(session: Session | null) {
    return session?.user?.role === "superadmin";
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!ensureSuperadmin(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ownerUsername = getOwnerUsername(session);
    if (!ownerUsername) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const users = await db
        .collection<AppUser>("users")
        .find({ ownerUsername }, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .toArray();
    const counts = await getWorkspaceUserCounts(db, ownerUsername);

    return NextResponse.json({
        users: users.map((user) => ({
            _id: user._id?.toString(),
            username: user.username,
            role: user.role,
            permission: user.permission,
            createdAt: user.createdAt.toISOString(),
        })),
        limits: {
            ...counts,
            maxUsers: MAX_USERS_PER_OWNER,
        },
    });
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!ensureSuperadmin(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ownerUsername = getOwnerUsername(session);
    if (!ownerUsername) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as {
        username?: string;
        password?: string;
        permission?: WorkspacePermission;
    };

    const username = body.username?.trim();
    const password = body.password?.trim();
    const permission = body.permission;

    if (!username || !password || !permission) {
        return NextResponse.json(
            { error: "Username, password, and permission are required" },
            { status: 400 },
        );
    }

    if (isReservedSuperadminUsername(username)) {
        return NextResponse.json(
            { error: "This username is reserved" },
            { status: 409 },
        );
    }

    const db = await getDb();
    const counts = await getWorkspaceUserCounts(db, ownerUsername);
    if (!counts.canAddAny) {
        return NextResponse.json(
            { error: `You can only create up to ${MAX_USERS_PER_OWNER} users.` },
            { status: 409 },
        );
    }
    if (permission === "edit" && !counts.canAddEdit) {
        return NextResponse.json(
            { error: "Only 5 edit users are allowed per workspace." },
            { status: 409 },
        );
    }
    if (permission === "view" && !counts.canAddView) {
        return NextResponse.json(
            { error: "Only 5 view users are allowed per workspace." },
            { status: 409 },
        );
    }

    const existing = await db.collection<AppUser>("users").findOne({ username });
    if (existing) {
        return NextResponse.json(
            { error: "Username already exists" },
            { status: 409 },
        );
    }

    const user: AppUser = {
        username,
        password,
        role: "user",
        permission,
        ownerUsername,
        createdAt: new Date(),
    };

    const result = await db.collection<AppUser>("users").insertOne(user);

    return NextResponse.json(
        {
            _id: result.insertedId.toString(),
            username: user.username,
            role: user.role,
            permission: user.permission,
            createdAt: user.createdAt.toISOString(),
        },
        { status: 201 },
    );
}
