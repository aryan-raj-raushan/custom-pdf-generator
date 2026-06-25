// components/preview/A4Preview.tsx
'use client';

import React, { useMemo, useRef } from 'react';
import { ExamPaper, Question } from '@/types/exam';
import { PREVIEW_COLORS } from '@/lib/previewTheme';
import { PaperHeader, InstructionsBlock } from './PaperHeader';
import { QuestionBlock } from './QuestionBlock';
import { useAutoPaginate } from '@/lib/usePagination';
import { FONT_SIZE_DEFAULT } from './PreviewPanel';

export type ColumnCount = 1 | 2 | 3;

interface FlatQuestion {
  blockId: string;
  question: Question;
  number: number;
  sectionTitleEn?: string;
  sectionTitleHi?: string;
  isFirstInSection: boolean;
}

interface A4PreviewProps {
  paper: ExamPaper;
  highlightedQuestionId?: string | null;
  columns?: ColumnCount;
  fontSize?: number;
}

// Reserved vertical px budgets — scaled slightly with font size so that
// bigger text doesn't overflow the first-page header area.
function getReservedFirstPage(columns: ColumnCount, fontSize: number): number {
  const base: Record<ColumnCount, number> = { 1: 460, 2: 430, 3: 420 };
  // Each px of font above default adds ~4px to header reserve (instructions wrap more)
  const extra = Math.max(0, fontSize - FONT_SIZE_DEFAULT) * 4;
  return base[columns] + extra;
}

function getReservedOtherPage(columns: ColumnCount): number {
  const base: Record<ColumnCount, number> = { 1: 95, 2: 90, 3: 85 };
  return base[columns];
}

const GRID_CLASS: Record<ColumnCount, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
};

const MEASURE_WIDTHS: Record<ColumnCount, number> = {
  1: 718,
  2: 718,
  3: 718,
};

export const A4Preview = React.forwardRef<HTMLDivElement, A4PreviewProps>(
  ({ paper, highlightedQuestionId, columns = 2, fontSize = FONT_SIZE_DEFAULT }, ref) => {
    const measureRef = useRef<HTMLDivElement>(null!);

    const flatQuestions: FlatQuestion[] = useMemo(() => {
      let n = 0;
      const out: FlatQuestion[] = [];
      paper.sections.forEach((section) => {
        section.questions.forEach((q, qi) => {
          n += 1;
          out.push({
            blockId: q.id,
            question: q,
            number: n,
            sectionTitleEn: qi === 0 ? section.titleEn : undefined,
            sectionTitleHi: qi === 0 ? section.titleHi : undefined,
            isFirstInSection: qi === 0,
          });
        });
      });
      return out;
    }, [paper.sections]);

    const blockIds = flatQuestions.map((f) => f.blockId);

    const pages = useAutoPaginate(blockIds, measureRef, {
      reservedFirstPagePx: getReservedFirstPage(columns, fontSize),
      reservedOtherPagePx: getReservedOtherPage(columns),
      columns,
      fontSize,
    });

    const byId = useMemo(() => {
      const m = new Map<string, FlatQuestion>();
      flatQuestions.forEach((f) => m.set(f.blockId, f));
      return m;
    }, [flatQuestions]);

    const gridClass = GRID_CLASS[columns];

    return (
      <div ref={ref} className="flex flex-col items-center gap-6">
        {/* Hidden measurement pass */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            height: 0,
            width: 0,
          }}
        >
          <div
            ref={measureRef}
            aria-hidden
            className={`pointer-events-none grid ${gridClass} gap-x-5`}
            style={{
              width: MEASURE_WIDTHS[columns],
              position: 'absolute',
              top: 0,
              left: 0,
              visibility: 'hidden',
            }}
          >
            {flatQuestions.map((f) => (
              <div key={f.blockId} data-block-id={f.blockId}>
                <QuestionBlock
                  question={f.question}
                  number={f.number}
                  metadata={paper.metadata}
                  columns={columns}
                  fontSize={fontSize}
                />
              </div>
            ))}
          </div>
        </div>

        {pages.map((pageBlockIds, pageIndex) => (
          <Page key={pageIndex} pageNumber={pageIndex + 1} totalPages={pages.length}>
            {pageIndex === 0 && (
              <>
                <PaperHeader metadata={paper.metadata} />
                <InstructionsBlock metadata={paper.metadata} />
              </>
            )}
            {pageIndex > 0 && <RunningHeader metadata={paper.metadata} />}

            {(() => {
              const groups: {
                titleEn?: string;
                titleHi?: string;
                questions: FlatQuestion[];
              }[] = [];

              pageBlockIds.forEach((id) => {
                const q = byId.get(id);
                if (!q) return;

                if (q.isFirstInSection || groups.length === 0) {
                  groups.push({
                    titleEn: q.sectionTitleEn,
                    titleHi: q.sectionTitleHi,
                    questions: [q],
                  });
                } else {
                  groups[groups.length - 1].questions.push(q);
                }
              });

              return (
                <div className="mt-2.5">
                  {groups.map((group, index) => (
                    <div key={`${group.titleEn}-${index}`} className="mb-3">
                      {group.titleEn && (
                        <div
                          className="mb-2 mt-2 border-b pb-1 text-[11px] font-bold uppercase tracking-wide"
                          style={{
                            borderColor: PREVIEW_COLORS.ruleMedium,
                          }}
                        >
                          {group.titleEn}

                          {paper.metadata.language !== 'en' && group.titleHi && (
                            <span className="font-devanagari ml-2 font-normal normal-case">
                              {group.titleHi}
                            </span>
                          )}
                        </div>
                      )}

                      <div className={`grid ${gridClass} gap-x-5 gap-y-0`}>
                        {group.questions.map((f) => (
                          <QuestionBlock
                            key={f.blockId}
                            question={f.question}
                            number={f.number}
                            metadata={paper.metadata}
                            isHighlighted={f.blockId === highlightedQuestionId}
                            showFlagIndicator
                            columns={columns}
                            fontSize={fontSize}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Page>
        ))}
      </div>
    );
  },
);

A4Preview.displayName = 'A4Preview';

function Page({
  children,
  pageNumber,
  totalPages,
}: Readonly<{
  children: React.ReactNode;
  pageNumber: number;
  totalPages: number;
}>) {
  return (
    <div
      className="pdf-page relative"
      style={{
        width: 794,
        minHeight: 1123,
        padding: '34px 38px 44px',
        backgroundColor: PREVIEW_COLORS.pageBackground,
        color: PREVIEW_COLORS.pageText,
        boxShadow: PREVIEW_COLORS.pageShadow,
        fontFamily: "var(--font-paper, 'Tinos', 'Times New Roman', serif)",
      }}
    >
      {children}
      <div
        className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-9 text-[9px]"
        style={{ color: PREVIEW_COLORS.mutedText }}
      >
        <span>Custom PDF Creator</span>
        <span>
          Page {pageNumber} of {totalPages}
        </span>
      </div>
    </div>
  );
}

function RunningHeader({ metadata }: Readonly<{ metadata: ExamPaper['metadata'] }>) {
  return (
    <div
      className="flex items-center justify-between border-b pb-1 text-[10px] font-medium"
      style={{ borderColor: PREVIEW_COLORS.ruleStrong }}
    >
      <span>{metadata.examTitle}</span>
      <span>{metadata.examCode}</span>
    </div>
  );
}

export default A4Preview;
