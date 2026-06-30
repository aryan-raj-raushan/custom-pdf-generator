// types/paper-document.ts
import { ObjectId } from 'mongodb';
import { ExamPaper } from './exam';

export type PaperStatus = 'draft' | 'saved';

export interface PaperDocument {
  _id?: ObjectId;
  ownerUsername: string;
  name: string; // user-given project name e.g. "SSC Mock Test 1"
  status: PaperStatus;
  paper: ExamPaper;
  createdAt: Date;
  updatedAt: Date;
  // Denormalised summary — used for dashboard cards without loading full paper
  meta: {
    examTitle: string;
    organisation: string;
    totalQuestions: number;
    sections: number;
    date: string;
    language: ExamPaper['metadata']['language'];
    columns: 1 | 2 | 3; // layout preference, mirrored from metadata for dashboard
    fontSize: number;
    headerTemplate: 'classic' | 'coaching' | 'minimal';
  };
}

// Serialisable version returned to the client (ObjectId → string)
export interface PaperDocumentClient extends Omit<PaperDocument, '_id'> {
  _id: string;
}
