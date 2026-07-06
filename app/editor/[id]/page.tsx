import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';
import CustomPdfCreator from '@/components/layout/CustomPdfCreator';
import { authOptions } from '@/lib/auth';
import { getOwnerUsername } from '@/lib/access';
import { getDb } from '@/lib/mongodb';
import type { PaperDocument } from '@/types/paper-document';

function toObjectId(id: string) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export default async function EditorPage(props: PageProps<'/editor/[id]'>) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const ownerUsername = getOwnerUsername(session);
  if (!ownerUsername) redirect('/login');

  const { id } = await props.params;
  const objectId = toObjectId(id);
  if (!objectId) notFound();

  const db = await getDb();
  const doc = await db
    .collection<PaperDocument>('papers')
    .findOne({ _id: objectId, ownerUsername });

  if (!doc) notFound();

  const dbQuestionIds = doc.paper.sections.flatMap((s) => s.questions.map((q) => q.id));
  console.log('[editor-load] server fetch from MongoDB', {
    paperId: doc._id?.toString(),
    sectionCount: doc.paper.sections.length,
    sectionSizes: doc.paper.sections.map((s) => s.questions.length),
    totalQuestions: dbQuestionIds.length,
    uniqueQuestionIds: new Set(dbQuestionIds).size,
  });

  // Papers saved before the duplicate-id-on-import fix can still have the
  // same question/option id repeated across sections (e.g. the same batch
  // imported twice). React keys these lists by id, so a repeat causes
  // reconciliation to collide and re-render in a loop. Re-mint any id
  // that's already been seen so every list stays uniquely keyed.
  const seenIds = new Set<string>();
  const sanitizedPaper: PaperDocument['paper'] = {
    ...doc.paper,
    sections: doc.paper.sections.map((section) => ({
      ...section,
      questions: section.questions.map((question) => {
        const questionId = seenIds.has(question.id) ? crypto.randomUUID() : question.id;
        seenIds.add(questionId);
        return {
          ...question,
          id: questionId,
          options: question.options?.map((option) => {
            const optionId = seenIds.has(option.id) ? crypto.randomUUID() : option.id;
            seenIds.add(optionId);
            return { ...option, id: optionId };
          }),
        };
      }),
    })),
  };

  return (
    <CustomPdfCreator
      initialPaper={sanitizedPaper}
      paperId={doc._id?.toString()}
      initialName={doc.name}
      userPermission={session.user.permission}
    />
  );
}
