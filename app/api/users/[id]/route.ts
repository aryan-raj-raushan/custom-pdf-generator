import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getOwnerUsername } from "@/lib/access";
import { getDb } from "@/lib/mongodb";
import type { AppUser } from "@/types/app-user";

function toObjectId(id: string) {
    try {
        return new ObjectId(id);
    } catch {
        return null;
    }
}

export async function DELETE(
    _req: Request,
    ctx: RouteContext<"/api/users/[id]">,
) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "superadmin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ownerUsername = getOwnerUsername(session);
    if (!ownerUsername) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const objectId = toObjectId(id);
    if (!objectId) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db
        .collection<AppUser>("users")
        .deleteOne({ _id: objectId, ownerUsername });

    if (result.deletedCount === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}
