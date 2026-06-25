// components/import/ImportIssuesPanel.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronUp, ImageIcon, ListChecks, X } from 'lucide-react';
import { ExamSection } from '@/types/exam';
import { FLAG_LABELS } from '@/lib/bulkImportParser';
import { ImportFlagType } from '../layout/CustomPdfCreator';

interface FlaggedEntry {
  questionId: string;
  sectionId: string;
  sourceIndex?: number;
  displayNumber: number; // position in the overall paper, for the user-facing label
  flagTypes: ImportFlagType[];
  preview: string;
}

interface ImportIssuesPanelProps {
  sections: ExamSection[];
  onJumpToQuestion: (questionId: string) => void;
  onDismiss: (questionId: string) => void;
}

const ICONS: Partial<Record<ImportFlagType, React.ReactNode>> = {
  image_question: <ImageIcon size={12} />,
  image_option: <ImageIcon size={12} />,
};

export function ImportIssuesPanel({
  sections,
  onJumpToQuestion,
  onDismiss,
}: Readonly<ImportIssuesPanelProps>) {
  const [collapsed, setCollapsed] = useState(false);

  const entries: FlaggedEntry[] = [];
  let runningNumber = 0;
  sections.forEach((section) => {
    section.questions.forEach((q) => {
      runningNumber += 1;
      if (q.importFlags && q.importFlags.length > 0) {
        entries.push({
          questionId: q.id,
          sectionId: section.id,
          sourceIndex: q.importSourceIndex,
          displayNumber: runningNumber,
          flagTypes: q.importFlags.map((f) => f.type),
          preview: (q.textEn || q.textHi || '(empty question)').slice(0, 60),
        });
      }
    });
  });

  if (entries.length === 0) return null;

  const imageIssues = entries.filter(
    (e) => e.flagTypes.includes('image_question') || e.flagTypes.includes('image_option'),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-10 mb-4 overflow-hidden rounded-lg border border-amber-200 bg-amber-50"
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <AlertTriangle size={15} className="shrink-0 text-amber-500" />
        <div className="flex-1">
          <p className="text-[13px] font-medium text-amber-800">
            {entries.length} imported question{entries.length === 1 ? '' : 's'} need attention
          </p>
          {imageIssues.length > 0 && (
            <p className="text-[11px] text-amber-600">
              {imageIssues.length} of these are missing an image — click to jump and attach one
            </p>
          )}
        </div>
        {collapsed ? (
          <ChevronDown size={14} className="text-amber-500" />
        ) : (
          <ChevronUp size={14} className="text-amber-500" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="max-h-64 space-y-1 overflow-y-auto border-t border-amber-200/70 p-2">
              {entries.map((entry) => (
                <div
                  key={entry.questionId}
                  className="group flex items-center gap-2 rounded-md bg-white/70 px-2 py-1.5 text-xs hover:bg-white"
                >
                  <button
                    type="button"
                    onClick={() => onJumpToQuestion(entry.questionId)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-100 text-[10px] font-semibold text-amber-700">
                      {entry.displayNumber}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-stone-700">{entry.preview}</span>
                    <span className="flex shrink-0 gap-1">
                      {entry.flagTypes.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700"
                        >
                          {ICONS[t]}
                          {FLAG_LABELS[t]}
                        </span>
                      ))}
                      {entry.flagTypes.length > 2 && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                          +{entry.flagTypes.length - 2}
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismiss(entry.questionId)}
                    title="Dismiss — I've reviewed this one"
                    className="shrink-0 text-stone-300 opacity-0 hover:text-stone-600 group-hover:opacity-100"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ImportSummaryBadge({ count }: Readonly<{ count: number }>) {
  if (count === 0) return null;
  return (
    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
      <ListChecks size={11} />
      {count} need{count === 1 ? 's' : ''} review
    </span>
  );
}

export default ImportIssuesPanel;
