import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
    MAX_PROJECTS_PER_OWNER,
    canEditWorkspace,
    getOwnerUsername,
} from "@/lib/access";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { ExamPaper } from "@/types/exam";
import type { PaperDocument, PaperStatus } from "@/types/paper-document";
import { getWorkspaceProjectCount } from "@/lib/workspace";

function buildMeta(paper: ExamPaper) {
    const totalQuestions = paper.sections.reduce(
        (sum, section) => sum + section.questions.length,
        0,
    );

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

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
    if (!canEditWorkspace(session)) {
        return NextResponse.json(
            { error: "View-only users cannot create papers" },
            { status: 403 },
        );
    }

    const ownerUsername = getOwnerUsername(session);
    if (!ownerUsername) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = (await req.json()) as {
        name?: string;
        paper?: ExamPaper;
        status?: PaperStatus;
    };

    const name = body.name?.trim();
    if (!name || !body.paper) {
        return NextResponse.json(
            { error: "Name and paper are required" },
            { status: 400 },
        );
    }

    const db = await getDb();
    const projectCount = await getWorkspaceProjectCount(db, ownerUsername);
    if (projectCount >= MAX_PROJECTS_PER_OWNER) {
        return NextResponse.json(
            {
                error: `You can only create up to ${MAX_PROJECTS_PER_OWNER} projects.`,
            },
            { status: 409 },
        );
    }

    const now = new Date();
    const doc: PaperDocument = {
        ownerUsername,
        name,
        paper: body.paper,
        status: body.status ?? "draft",
        createdAt: now,
        updatedAt: now,
        meta: buildMeta(body.paper),
    };

    const result = await db.collection<PaperDocument>("papers").insertOne(doc);

    return NextResponse.json(
        { _id: result.insertedId.toString() },
        { status: 201 },
    );
}
