// components/layout/CustomPdfCreator.tsx
"use client";

import React, { useRef, useState } from "react";
import { FileText, ListChecks, FileSpreadsheet, ClipboardPaste } from "lucide-react";
import { ExamMetadata, ExamPaper, ExamSection, Question } from "@/types/exam";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { MetadataForm } from "@/components/metadata/MetaDataForm";
import { QuestionsPanel } from "@/components/questions/QuestionsPanel";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { SaveAsPdfButton } from "@/components/layout/SaveAsPdfButton";
import { BulkImportModal } from "@/components/import/BulkImportModal";
import { ImportIssuesPanel, ImportSummaryBadge } from "@/components/import/ImportIssuesPanel";
import { parseBulkImportText } from "@/lib/bulkImportParser";

export const DEFAULT_INSTRUCTIONS_EN = [
  "This question paper contains multiple choice questions (MCQs), short answer and long answer type questions.",
  "All questions are compulsory unless stated otherwise.",
  "Read each question carefully before answering.",
  "Use of calculator and mobile phone is strictly prohibited in the examination hall.",
  "Rough work must be done only in the space provided.",
];

export const DEFAULT_INSTRUCTIONS_HI = [
  "इस प्रश्न पत्र में बहुविकल्पीय प्रश्न (MCQs), लघु उत्तरीय एवं दीर्घ उत्तरीय प्रश्न सम्मिलित हैं।",
  "जब तक अन्यथा न कहा जाए, सभी प्रश्न अनिवार्य हैं।",
  "उत्तर देने से पूर्व प्रत्येक प्रश्न को ध्यानपूर्वक पढ़ें।",
  "परीक्षा कक्ष में कैलकुलेटर एवं मोबाइल फोन का प्रयोग पूर्णतः वर्जित है।",
  "रफ कार्य केवल दिए गए स्थान पर ही करें।",
];

export type Language = "en" | "hi";

export type QuestionType = "mcq" | "short" | "long";

export type Subject =
  | "general"
  | "mathematics"
  | "reasoning"
  | "english"
  | "hindi"
  | "gk";
export function createEmptyMetadata(): ExamMetadata {
  return {
    examTitle: "",
    organisation: "",
    examCode: "",
    date: new Date().toISOString().slice(0, 10),
    duration: "2 Hours",
    maxMarks: 100,
    totalQuestions: 0,
    rollNoLabel: true,
    candidateNameLabel: true,
    setCode: "A",
    bookletSeries: "",
    generalInstructions: [...DEFAULT_INSTRUCTIONS_EN],
    generalInstructionsHi: [...DEFAULT_INSTRUCTIONS_HI],
    negativeMarking: { enabled: true, value: 0.25 },
    marksPerQuestion: 1,
    language: "bilingual",
  };
}

export function createEmptyQuestion(
  type: QuestionType = "mcq",
  subject: Subject = "general",
): Question {
  return {
    id: crypto.randomUUID(),
    type,
    subject,
    textEn: "",
    textHi: "",
    hasMath: false,
    options:
      type === "mcq"
        ? [
          { id: crypto.randomUUID(), textEn: "", textHi: "" },
          { id: crypto.randomUUID(), textEn: "", textHi: "" },
          { id: crypto.randomUUID(), textEn: "", textHi: "" },
          { id: crypto.randomUUID(), textEn: "", textHi: "" },
        ]
        : undefined,
    marks: 1,
    answerSpaceLines:
      type === "short" ? 3 : type === "long" ? 8 : undefined,
  };
}

export function createEmptySection(name = "Section 1"): ExamSection {
  return {
    id: crypto.randomUUID(),
    titleEn: name,
    titleHi: "",
    questions: [],
  };
}

export type ImportFlagType =
  | "missing_answer" // no "Answer: X" line found for an MCQ
  | "missing_solution" // no "Solution: ..." block found
  | "image_question" // question text references/implies an image, none attached
  | "image_option" // an option references/implies an image, none attached
  | "ambiguous_options" // fewer than 2 options parsed, or option lettering broke
  | "answer_letter_mismatch" // "Answer: X" letter doesn't match any parsed option
  | "low_confidence";

const LEFT_TABS = [
  { id: "metadata", label: "Exam details", icon: <FileSpreadsheet size={14} /> },
  { id: "questions", label: "Questions", icon: <ListChecks size={14} /> },
];

export function CustomPdfCreator() {
  const [paper, setPaper] = useState<ExamPaper>(() => ({
    metadata: createEmptyMetadata(),
    sections: [createEmptySection("Section A — General Awareness")],
  }));
  const [activeTab, setActiveTab] = useState("metadata");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);
  const [jumpToken, setJumpToken] = useState(0);

  const previewRef = useRef<HTMLDivElement>(null!);
  const answerKeyRef = useRef<HTMLDivElement>(null!);

  const totalQuestions = paper.sections.reduce((sum, s) => sum + s.questions.length, 0);
  const totalFlagged = paper.sections.reduce(
    (sum, s) => sum + s.questions.filter((q) => (q.importFlags?.length ?? 0) > 0).length,
    0
  );

  function handleBulkImport(result: ReturnType<typeof parseBulkImportText>) {
    setPaper((p) => {
      const sections = [...p.sections];
      // Imported questions land in the currently active section (last
      // section if none obviously "active" in this simple model), so the
      // user's section/subject organisation stays predictable.
      const targetIndex = sections.length - 1;
      sections[targetIndex] = {
        ...sections[targetIndex],
        questions: [...sections[targetIndex].questions, ...result.questions],
      };
      return { ...p, sections };
    });
    setActiveTab("questions");
  }

  function jumpToQuestion(questionId: string) {
    setHighlightedQuestionId(questionId);
    setJumpToken((t) => t + 1);
    setActiveTab("questions");

    // Scroll the left-hand editor list to the question card too, once it's
    // in the DOM (section auto-expand happens in QuestionsPanel's effect).
    let attempts = 0;
    const tryScroll = () => {
      attempts += 1;
      const node = document.querySelector<HTMLElement>(`[data-question-id="${questionId}"]`);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (attempts < 20) requestAnimationFrame(tryScroll);
    };
    requestAnimationFrame(tryScroll);

    // Clear the highlight after a few seconds so it reads as a momentary
    // pointer rather than a permanent state.
    window.setTimeout(() => setHighlightedQuestionId((cur) => (cur === questionId ? null : cur)), 4000);
  }

  function dismissFlag(questionId: string) {
    setPaper((p) => ({
      ...p,
      sections: p.sections.map((s) => ({
        ...s,
        questions: s.questions.map((q) => (q.id === questionId ? { ...q, importFlags: undefined } : q)),
      })),
    }));
  }

  return (
    <div className="flex h-screen w-full flex-col bg-stone-50">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-900 text-white">
            <FileText size={16} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-stone-900">Custom PDF Creator</h1>
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-stone-400">
                {totalQuestions} question{totalQuestions === 1 ? "" : "s"} · {paper.sections.length} section
                {paper.sections.length === 1 ? "" : "s"}
              </p>
              <ImportSummaryBadge count={totalFlagged} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setImportModalOpen(true)}>
            <ClipboardPaste size={15} /> Bulk import
          </Button>
          <SaveAsPdfButton
            previewRef={answerKeyRef}
            fileName={`${paper.metadata.examCode || paper.metadata.examTitle || "question-paper"}-answer-key`}
            pageClassName="answer-key-page"
            label="Save answer key"
            variant="secondary"
          />
          <SaveAsPdfButton
            previewRef={previewRef}
            fileName={paper.metadata.examCode || paper.metadata.examTitle || "question-paper"}
            pageClassName="pdf-page"
            label="Save as PDF"
            variant="primary"
          />
        </div>
      </header>

      {/* Body: left editor / right preview */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-[520px] shrink-0 flex-col border-r border-stone-200 bg-white">
          <div className="border-b border-stone-100 p-3">
            <Tabs tabs={LEFT_TABS} activeId={activeTab} onChange={setActiveTab} />
          </div>
          <div className="flex-1 overflow-y-auto px-4 pt-4">
            {activeTab === "metadata" ? (
              <MetadataForm metadata={paper.metadata} onChange={(metadata) => setPaper((p) => ({ ...p, metadata }))} />
            ) : (
              <>
                <ImportIssuesPanel sections={paper.sections} onJumpToQuestion={jumpToQuestion} onDismiss={dismissFlag} />
                <QuestionsPanel
                  sections={paper.sections}
                  metadata={paper.metadata}
                  onChange={(sections) => setPaper((p) => ({ ...p, sections }))}
                  highlightedQuestionId={highlightedQuestionId}
                />
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <PreviewPanel
            paper={paper}
            previewRef={previewRef}
            answerKeyRef={answerKeyRef}
            highlightedQuestionId={highlightedQuestionId}
            jumpToken={jumpToken}
          />
        </div>
      </div>

      <BulkImportModal open={importModalOpen} onClose={() => setImportModalOpen(false)} onImport={handleBulkImport} />
    </div>
  );
}

export default CustomPdfCreator;