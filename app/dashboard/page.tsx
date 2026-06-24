// app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { getOwnerUsername, MAX_PROJECTS_PER_OWNER } from "@/lib/access";
import { getWorkspaceProjectCount } from "@/lib/workspace";
import { PaperDocument } from "@/types/paper-document";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const ownerUsername = getOwnerUsername(session);
  if (!ownerUsername) redirect("/login");

  const db = await getDb();

  // Scope to ownerUsername so superadmin doesn't see other workspaces' papers
  const docs = await db
    .collection<PaperDocument>("papers")
    .find({ ownerUsername }, { projection: { paper: 0 } })
    .sort({ updatedAt: -1 })
    .toArray();

  const papers = docs.map((d) => ({
    ...d,
    _id: d._id!.toString(),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  const projectCount = await getWorkspaceProjectCount(db, ownerUsername);
  console.log(session);

  return (
    <DashboardClient
      initialPapers={papers}
      userRole={session.user.role}
      userPermission={session.user.permission}
      projectCount={projectCount}
      maxProjects={MAX_PROJECTS_PER_OWNER}
    />
  );
}