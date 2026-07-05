'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardPaste,
  FileSpreadsheet,
  FileText,
  ListChecks,
  Loader2,
  Lock,
  LogOut,
  Save,
} from 'lucide-react';
import { ExamMetadata, ExamPaper, ExamSection, Question } from '@/types/exam';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { MetadataForm } from '@/components/metadata/MetaDataForm';
import { QuestionsPanel } from '@/components/questions/QuestionsPanel';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { ColumnCount } from '@/components/preview/A4Preview';
import { SaveAsPdfButton } from '@/components/layout/SaveAsPdfButton';
import { BulkImportModal } from '@/components/import/BulkImportModal';
import { ImportIssuesPanel, ImportSummaryBadge } from '@/components/import/ImportIssuesPanel';
import { parseBulkImportText } from '@/lib/bulkImportParser';
import ExportPdfDropdown from './ExportPdfDropdown';

export const DEFAULT_INSTRUCTIONS_EN = [
  'This question paper contains multiple choice questions (MCQs), short answer and long answer type questions.',
  'All questions are compulsory unless stated otherwise.',
  'Read each question carefully before answering.',
  'Use of calculator and mobile phone is strictly prohibited in the examination hall.',
  'Rough work must be done only in the space provided.',
];

export const DEFAULT_INSTRUCTIONS_HI = [
  'इस प्रश्न पत्र में बहुविकल्पीय प्रश्न (MCQs), लघु उत्तरीय एवं दीर्घ उत्तरीय प्रश्न सम्मिलित हैं।',
  'जब तक अन्यथा न कहा जाए, सभी प्रश्न अनिवार्य हैं।',
  'उत्तर देने से पूर्व प्रत्येक प्रश्न को ध्यानपूर्वक पढ़ें।',
  'परीक्षा कक्ष में कैलकुलेटर एवं मोबाइल फोन का प्रयोग पूर्णतः वर्जित है।',
  'रफ कार्य केवल दिए गए स्थान पर ही करें।',
];

export type Language = 'en' | 'hi';
export type QuestionType = 'mcq' | 'short' | 'long' | 'assertion_reason';
export type Subject = 'general' | 'mathematics' | 'reasoning' | 'english' | 'hindi' | 'gk';

export function createEmptyMetadata(): ExamMetadata {
  return {
    examTitle: '',
    organisation: '',
    examCode: '',
    date: new Date().toISOString().slice(0, 10),
    duration: '2 Hours',
    maxMarks: 100,
    totalQuestions: 0,
    rollNoLabel: true,
    candidateNameLabel: true,
    setCode: 'A',
    bookletSeries: '',
    generalInstructions: [...DEFAULT_INSTRUCTIONS_EN],
    generalInstructionsHi: [...DEFAULT_INSTRUCTIONS_HI],
    negativeMarking: { enabled: true, value: 0.25 },
    marksPerQuestion: 1,
    language: 'bilingual',
    columns: 2, // default layout
    fontSize: 11,
  };
}

export function createEmptyQuestion(
  type: QuestionType = 'mcq',
  subject: Subject = 'general',
): Question {
  return {
    id: crypto.randomUUID(),
    type,
    subject,
    textEn: '',
    textHi: '',
    hasMath: false,
    options:
      type === 'mcq'
        ? [
            { id: crypto.randomUUID(), textEn: '', textHi: '' },
            { id: crypto.randomUUID(), textEn: '', textHi: '' },
            { id: crypto.randomUUID(), textEn: '', textHi: '' },
            { id: crypto.randomUUID(), textEn: '', textHi: '' },
          ]
        : undefined,
    marks: 1,
    answerSpaceLines: type === 'short' ? 3 : type === 'long' ? 8 : undefined,
  };
}

export function createEmptySection(name = 'Section 1'): ExamSection {
  return {
    id: crypto.randomUUID(),
    titleEn: name,
    titleHi: '',
    questions: [],
  };
}

export type ImportFlagType =
  | 'missing_answer'
  | 'missing_solution'
  | 'image_question'
  | 'image_option'
  | 'ambiguous_options'
  | 'answer_letter_mismatch'
  | 'low_confidence';

const LEFT_TABS = [
  { id: 'metadata', label: 'Exam details', icon: <FileSpreadsheet size={14} /> },
  { id: 'questions', label: 'Questions', icon: <ListChecks size={14} /> },
];

const DEFAULT_PAPER: ExamPaper = {
  metadata: createEmptyMetadata(),
  sections: [createEmptySection('Section A - General Awareness')],
};

interface CustomPdfCreatorProps {
  initialPaper?: ExamPaper;
  paperId?: string;
  initialName?: string;
  userPermission?: 'edit' | 'view';
}

export function CustomPdfCreator({
  initialPaper,
  paperId,
  initialName,
  userPermission,
}: Readonly<CustomPdfCreatorProps>) {
  const canEdit = userPermission !== 'view';
  const router = useRouter();
  const [paper, setPaper] = useState<ExamPaper>(initialPaper ?? DEFAULT_PAPER);
  const [activeTab, setActiveTab] = useState('metadata');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);
  const [jumpToken, setJumpToken] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [reviewState, setReviewState] = useState({
    paperReviewed: false,
    answerKeyReviewed: false,
    bypassed: false,
  });

  const saveMenuRef = useRef<HTMLDivElement>(null);
  const highlightedPreviewRef = useRef<HTMLDivElement>(null!);
  const answerGridOnlyRef = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    if (!saveMenuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) {
        setSaveMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [saveMenuOpen]);

  const previewRef = useRef<HTMLDivElement>(null!);
  const answerKeyRef = useRef<HTMLDivElement>(null!);
  const reviewResetKey = JSON.stringify({
    paper,
    columns: paper.metadata.columns,
    fontSize: paper.metadata.fontSize,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReviewState({
      paperReviewed: false,
      answerKeyReviewed: false,
      bypassed: false,
    });
  }, [reviewResetKey]);

  const totalQuestions = paper.sections.reduce((sum, s) => sum + s.questions.length, 0);
  const totalFlagged = paper.sections.reduce(
    (sum, s) => sum + s.questions.filter((q) => (q.importFlags?.length ?? 0) > 0).length,
    0,
  );

  function handleBulkImport(result: ReturnType<typeof parseBulkImportText>) {
    setPaper((p) => {
      const sections = [...p.sections];
      const targetIndex = sections.length - 1;
      sections[targetIndex] = {
        ...sections[targetIndex],
        questions: [...sections[targetIndex].questions, ...result.questions],
      };
      return { ...p, sections };
    });
    setActiveTab('questions');
  }

  function jumpToQuestion(questionId: string) {
    setHighlightedQuestionId(questionId);
    setJumpToken((t) => t + 1);
    setActiveTab('questions');

    let attempts = 0;
    const tryScroll = () => {
      attempts += 1;
      const node = document.querySelector<HTMLElement>(`[data-question-id="${questionId}"]`);
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (attempts < 20) requestAnimationFrame(tryScroll);
    };
    requestAnimationFrame(tryScroll);

    window.setTimeout(() => {
      setHighlightedQuestionId((cur) => (cur === questionId ? null : cur));
    }, 4000);
  }

  function dismissFlag(questionId: string) {
    setPaper((p) => ({
      ...p,
      sections: p.sections.map((s) => ({
        ...s,
        questions: s.questions.map((q) =>
          q.id === questionId ? { ...q, importFlags: undefined } : q,
        ),
      })),
    }));
  }

  /**
   * Called by PreviewPanel when the user picks a different column count.
   * Writes the choice into paper.metadata.columns so it's included in the
   * next save payload — no extra round-trip needed.
   */
  function handleColumnsChange(columns: ColumnCount) {
    setPaper((p) => ({
      ...p,
      metadata: { ...p.metadata, columns },
    }));
  }

  function handleFontSizeChange(fontSize: number) {
    setPaper((p) => ({
      ...p,
      metadata: { ...p.metadata, fontSize },
    }));
  }

  async function handleSave(status: 'draft' | 'saved') {
    if (!paperId || saveState === 'saving') return;

    setSaveState('saving');
    try {
      const name =
        initialName?.trim() ||
        paper.metadata.examTitle.trim() ||
        paper.metadata.examCode?.trim() ||
        'Untitled paper';

      const res = await fetch(`/api/papers/${paperId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, paper, status }),
      });

      if (!res.ok) throw new Error('Failed to save');

      setSaveState('saved');
      window.setTimeout(() => {
        setSaveState((current) => (current === 'saved' ? 'idle' : current));
      }, 1800);
    } catch {
      setSaveState('error');
    }
  }

  return (
    <div className="flex h-screen w-full flex-col bg-stone-50">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-900 text-white">
            <FileText size={16} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-stone-900">{initialName || 'Test PDF'}</h1>
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-stone-400">
                {totalQuestions} question{totalQuestions === 1 ? '' : 's'} · {paper.sections.length}{' '}
                section
                {paper.sections.length === 1 ? '' : 's'}
              </p>
              {canEdit && <ImportSummaryBadge count={totalFlagged} />}
              {saveState === 'error' ? (
                <span className="text-[11px] font-medium text-red-500">Save failed</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Back — always visible */}
          {paperId ? (
            <Button variant="secondary" onClick={() => router.push('/dashboard')}>
              <ArrowLeft size={15} /> Back
            </Button>
          ) : null}

          {/* Bulk import — edit only */}
          {canEdit ? (
            <Button variant="secondary" onClick={() => setImportModalOpen(true)}>
              <ClipboardPaste size={15} /> Bulk import
            </Button>
          ) : null}

          {/* Export — combined dropdown replaces the two separate buttons */}
          <ExportPdfDropdown
            previewRef={previewRef}
            answerKeyRef={answerKeyRef}
            fileName={paper.metadata.examCode || paper.metadata.examTitle || 'question-paper'}
            highlightedPreviewRef={highlightedPreviewRef}
            answerGridOnlyRef={answerGridOnlyRef}
            disabled={
              !(
                reviewState.bypassed ||
                (reviewState.paperReviewed && reviewState.answerKeyReviewed)
              )
            }
          />

          {/* Save — edit only */}
          {paperId && canEdit ? (
            <div className="relative" ref={saveMenuRef}>
              <Button
                variant="primary"
                onClick={() => setSaveMenuOpen((o) => !o)}
                disabled={
                  saveState === 'saving' ||
                  !(
                    reviewState.bypassed ||
                    (reviewState.paperReviewed && reviewState.answerKeyReviewed)
                  )
                }
              >
                {saveState === 'saving' ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : saveState === 'saved' ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <Save size={15} />
                )}
                {saveState === 'saved' ? 'Saved' : 'Save'}
                <ChevronDown size={14} />
              </Button>
              {saveMenuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setSaveMenuOpen(false);
                      handleSave('draft');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-100"
                  >
                    <Save size={14} />
                    Save as draft
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSaveMenuOpen(false);
                      handleSave('saved');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-stone-900 hover:bg-stone-100"
                  >
                    <CheckCircle2 size={14} />
                    Save as project
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Logout — always visible */}
          {paperId ? (
            <Button variant="secondary" onClick={() => signOut({ callbackUrl: '/login' })}>
              <LogOut size={15} /> Logout
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="flex w-[520px] shrink-0 flex-col border-r border-stone-200 bg-white">
          <div className="border-b border-stone-100 p-3">
            <Tabs tabs={LEFT_TABS} activeId={activeTab} onChange={setActiveTab} />
          </div>

          {!canEdit ? (
            <div className="h-full inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1.5px]">
              <div className="flex flex-col items-center gap-2 rounded-xl border border-stone-200 bg-white px-6 py-5 shadow-sm">
                <Lock size={18} className="text-stone-400" />
                <p className="text-sm font-medium text-stone-700">View-only access</p>
                <p className="text-xs text-stone-400 text-center max-w-[200px]">
                  You can export PDFs but cannot edit this paper.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative flex-1 overflow-y-auto px-4 pt-4">
              {activeTab === 'metadata' ? (
                <MetadataForm
                  metadata={paper.metadata}
                  onChange={(metadata) => setPaper((p) => ({ ...p, metadata }))}
                />
              ) : (
                <>
                  <ImportIssuesPanel
                    sections={paper.sections}
                    onJumpToQuestion={jumpToQuestion}
                    onDismiss={dismissFlag}
                  />
                  <QuestionsPanel
                    sections={paper.sections}
                    metadata={paper.metadata}
                    onChange={(sections) => setPaper((p) => ({ ...p, sections }))}
                    highlightedQuestionId={highlightedQuestionId}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Preview panel — always interactive */}
        <div className="flex-1 overflow-hidden">
          <PreviewPanel
            paper={paper}
            previewRef={previewRef}
            answerKeyRef={answerKeyRef}
            highlightedQuestionId={highlightedQuestionId}
            jumpToken={jumpToken}
            onColumnsChange={handleColumnsChange}
            onFontSizeChange={handleFontSizeChange}
            highlightedPreviewRef={highlightedPreviewRef}
            answerGridOnlyRef={answerGridOnlyRef}
            reviewState={reviewState}
            reviewResetKey={reviewResetKey}
            onConfirmPaperReview={() =>
              setReviewState((current) => ({ ...current, paperReviewed: true }))
            }
            onConfirmAnswerKeyReview={() =>
              setReviewState((current) => ({ ...current, answerKeyReviewed: true }))
            }
            onBypassReview={() =>
              setReviewState((current) => ({
                ...current,
                paperReviewed: true,
                answerKeyReviewed: true,
                bypassed: true,
              }))
            }
          />
        </div>
      </div>

      {canEdit && (
        <BulkImportModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImport={handleBulkImport}
        />
      )}
    </div>
  );
}

export default CustomPdfCreator;
