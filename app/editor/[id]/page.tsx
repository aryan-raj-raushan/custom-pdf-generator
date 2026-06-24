import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import CustomPdfCreator from "@/components/layout/CustomPdfCreator";
import { authOptions } from "@/lib/auth";
import { getOwnerUsername } from "@/lib/access";
import { getDb } from "@/lib/mongodb";
import type { PaperDocument } from "@/types/paper-document";

function toObjectId(id: string) {
    try {
        return new ObjectId(id);
    } catch {
        return null;
    }
}

export default async function EditorPage(props: PageProps<"/editor/[id]">) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const ownerUsername = getOwnerUsername(session);
    if (!ownerUsername) redirect("/login");

    const { id } = await props.params;
    const objectId = toObjectId(id);
    if (!objectId) notFound();

    const db = await getDb();
    const doc = await db
        .collection<PaperDocument>("papers")
        .findOne({ _id: objectId, ownerUsername });

    if (!doc) notFound();

    return (
        <CustomPdfCreator
            initialPaper={doc.paper}
            paperId={doc._id?.toString()}
            initialName={doc.name}
            userPermission={session.user.permission}
        />
    );
}