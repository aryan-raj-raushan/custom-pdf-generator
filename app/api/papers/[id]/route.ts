import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { canEditWorkspace, getOwnerUsername } from "@/lib/access";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { PaperDocument } from "@/types/paper-document";
import { ExamPaper } from "@/types/exam";

function toObjectId(id: string) {
    try {
        return new ObjectId(id);
    } catch {
        return null;
    }
}

function buildMeta(paper: ExamPaper, totalQuestions: number) {
    return {
        examTitle: paper.metadata.examTitle,
        organisation: paper.metadata.organisation,
        totalQuestions,
        sections: paper.sections.length,
        date: paper.metadata.date,
        language: paper.metadata.language,
        columns: (paper.metadata.columns ?? 2) as 1 | 2 | 3,
        fontSize: (paper.metadata.fontSize ?? 11) as number,
    };
}

export async function GET(
    _req: NextRequest,
    ctx: RouteContext<"/api/papers/[id]">,
) {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const ownerUsername = getOwnerUsername(session);
    if (!ownerUsername) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const oid = toObjectId(id);
    if (!oid) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = await getDb();
    const doc = await db
        .collection<PaperDocument>("papers")
        .findOne({ _id: oid, ownerUsername });

    if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ...doc, _id: doc._id!.toString() });
}

export async function PUT(
    req: NextRequest,
    ctx: RouteContext<"/api/papers/[id]">,
) {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
    if (!canEditWorkspace(session)) {
        return NextResponse.json(
            { error: "View-only users cannot update papers" },
            { status: 403 },
        );
    }

    const ownerUsername = getOwnerUsername(session);
    if (!ownerUsername) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const oid = toObjectId(id);
    if (!oid) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = (await req.json()) as {
        name?: string;
        paper?: ExamPaper;
        status?: "draft" | "saved";
    };

    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const $set: Record<string, any> = { updatedAt: new Date() };

    if (body.name !== undefined) $set.name = body.name.trim();
    if (body.status !== undefined) $set.status = body.status;
    if (body.paper !== undefined) {
        $set.paper = body.paper;
        const totalQuestions = body.paper.sections.reduce(
            (sum, s) => sum + s.questions.length,
            0,
        );
        $set.meta = buildMeta(body.paper, totalQuestions);
    }

    const result = await db
        .collection<PaperDocument>("papers")
        .updateOne({ _id: oid, ownerUsername }, { $set });

    if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}

export async function DELETE(
    _req: NextRequest,
    ctx: RouteContext<"/api/papers/[id]">,
) {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
    if (!canEditWorkspace(session)) {
        return NextResponse.json(
            { error: "View-only users cannot delete papers" },
            { status: 403 },
        );
    }

    const ownerUsername = getOwnerUsername(session);
    if (!ownerUsername) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const oid = toObjectId(id);
    if (!oid) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db
        .collection<PaperDocument>("papers")
        .deleteOne({ _id: oid, ownerUsername });

    if (result.deletedCount === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}
