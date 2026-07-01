// components/preview/A4Preview.tsx
'use client';

import React, { useMemo, useRef } from 'react';
import { ExamPaper, Question } from '@/types/exam';
import { PREVIEW_COLORS } from '@/lib/previewTheme';
import { PaperHeader, InstructionsBlock, CoachingPageFooter } from './PaperHeader';
import { QuestionBlock } from './QuestionBlock';
import { useAutoPaginate, useOverflowCorrection } from '@/lib/usePagination';
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
  active?: boolean;
}

function getReservedFirstPage(columns: ColumnCount, fontSize: number): number {
  const base: Record<ColumnCount, number> = { 1: 460, 2: 430, 3: 420 };
  const extra = Math.max(0, fontSize - FONT_SIZE_DEFAULT) * 4;
  return base[columns] + extra;
}

function getReservedOtherPage(columns: ColumnCount): number {
  const base: Record<ColumnCount, number> = { 1: 130, 2: 125, 3: 120 };
  return base[columns];
}

// Coaching footer is ~22px tall — reserve that extra space on every page
const COACHING_FOOTER_HEIGHT = 28;

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
  (
    { paper, highlightedQuestionId, columns = 2, fontSize = FONT_SIZE_DEFAULT, active = true },
    ref,
  ) => {
    const measureRef = useRef<HTMLDivElement>(null!);
    const rootRef = useRef<HTMLDivElement>(null!);

    // Merge the forwarded ref (used by the export pipeline) with a local
    // ref (used internally for the overflow-correction pass) without
    // needing an extra dependency.
    const setRootRef = (node: HTMLDivElement | null) => {
      rootRef.current = node as HTMLDivElement;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    const isCoaching = (paper.metadata.headerTemplate ?? 'classic') === 'coaching';

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

    const byId = useMemo(() => {
      const m = new Map<string, FlatQuestion>();
      flatQuestions.forEach((f) => m.set(f.blockId, f));
      return m;
    }, [flatQuestions]);

    // Add coaching footer height to reserved space so questions don't overlap it
    const reservedFirst =
      getReservedFirstPage(columns, fontSize) + (isCoaching ? COACHING_FOOTER_HEIGHT : 0);
    const reservedOther = getReservedOtherPage(columns) + (isCoaching ? COACHING_FOOTER_HEIGHT : 0);

    const SECTION_HEADER_EXTRA_PX = 34;
    const firstQuestionIsFirst = flatQuestions[0]?.blockId;
    const getExtraHeightBefore = (id: string) => {
      const f = byId.get(id);
      if (!f) return 0;
      if (f.isFirstInSection && id !== firstQuestionIsFirst) {
        return SECTION_HEADER_EXTRA_PX;
      }
      return 0;
    };

    const getForcesNewRow = (id: string) => {
      const f = byId.get(id);
      if (!f) return false;
      return f.isFirstInSection && id !== firstQuestionIsFirst;
    };

    const measuredPages = useAutoPaginate(blockIds, measureRef, {
      reservedFirstPagePx: reservedFirst,
      reservedOtherPagePx: reservedOther,
      columns,
      fontSize,
      active,
      extraHeightBefore: getExtraHeightBefore,
      forcesNewRow: getForcesNewRow,
    });

    // Safety-net pass: after real pages render, fix any question block that
    // still visually overlaps the footer by bumping it to the next page.
    const pages = useOverflowCorrection(measuredPages, rootRef, {
      pageSelector: '[data-content-page="true"]',
      footerSelector: '[data-page-footer="true"]',
      blockAttr: 'data-question-id',
    });

    const gridClass = GRID_CLASS[columns];

    return (
      <div ref={setRootRef} className="flex flex-col items-center gap-6">
        {/* Hidden measurement pass */}
        <div style={{ position: 'relative', overflow: 'hidden', height: 0, width: 0 }}>
          <div
            ref={measureRef}
            aria-hidden
            data-pdf-ignore="true"
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

        {paper.metadata.coverPage?.enabled && paper.metadata.coverPage.imageDataUrl && (
          <CoverPage imageDataUrl={paper.metadata.coverPage.imageDataUrl} />
        )}

        {pages.map((pageBlockIds, pageIndex) => (
          <Page
            key={pageIndex}
            pageNumber={pageIndex + 1}
            totalPages={pages.length}
            metadata={paper.metadata}
            isCoaching={isCoaching}
          >
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
                          style={{ borderColor: PREVIEW_COLORS.ruleMedium }}
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

// ─────────────────────────────────────────────────────────
//  PageWatermark — absolutely centred, rotated, pointer-events
//  none so it never interferes with text selection or export
// ─────────────────────────────────────────────────────────
export function PageWatermark({ metadata }: Readonly<{ metadata: ExamPaper['metadata'] }>) {
  const wm = metadata.watermark;
  if (!wm?.enabled) return null;

  const opacity = wm.opacity ?? 0.12;

  // Image watermark
  if (wm.type === 'image' && wm.imageDataUrl) {
    return (
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={wm.imageDataUrl}
          alt=""
          style={{
            width: 450,
            height: 450,
            objectFit: 'contain',
            opacity,
            transform: 'rotate(-25deg)',
          }}
        />
      </div>
    );
  }

  // Text watermark
  const text = wm.text?.trim();
  if (!text) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-devanagari, var(--font-paper, 'Tinos', serif))",
          fontSize: text.length > 18 ? 40 : text.length > 10 ? 52 : 64,
          fontWeight: 900,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: PREVIEW_COLORS.pageText,
          opacity,
          transform: 'rotate(-28deg)',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          lineHeight: 1,
        }}
      >
        {text}
      </span>
    </div>
  );
}

function CoverPage({ imageDataUrl }: Readonly<{ imageDataUrl: string }>) {
  return (
    <div
      className="pdf-page relative"
      style={{
        width: 794,
        height: 1123, // fixed, not minHeight — must be exactly one A4 page
        backgroundColor: '#ffffff',
        boxShadow: PREVIEW_COLORS.pageShadow,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageDataUrl}
        alt="Cover"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain', // scales down to fit, never crops/overflows; letterboxes on mismatched aspect ratios
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Page wrapper — coaching variant swaps the default footer
//  for CoachingPageFooter and adjusts bottom padding
// ─────────────────────────────────────────────────────────
function Page({
  children,
  pageNumber,
  totalPages,
  metadata,
  isCoaching,
}: Readonly<{
  children: React.ReactNode;
  pageNumber: number;
  totalPages: number;
  metadata: ExamPaper['metadata'];
  isCoaching: boolean;
}>) {
  return (
    <div
      className="pdf-page relative"
      data-content-page="true"
      style={{
        width: 794,
        height: 1123,
        overflow: 'hidden',
        // Extra bottom padding for coaching so content never hides behind the footer bar
        padding: isCoaching ? '34px 38px 52px' : '34px 38px 44px',
        backgroundColor: PREVIEW_COLORS.pageBackground,
        color: PREVIEW_COLORS.pageText,
        boxShadow: PREVIEW_COLORS.pageShadow,
        fontFamily: "var(--font-paper, 'Tinos', 'Times New Roman', serif)",
      }}
    >
      <PageWatermark metadata={metadata} />
      {children}

      {isCoaching ? (
        <CoachingPageFooter metadata={metadata} pageNumber={pageNumber} totalPages={totalPages} />
      ) : (
        <div
          data-page-footer="true"
          className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-9 text-[9px]"
          style={{ color: PREVIEW_COLORS.mutedText }}
        >
          <span>Custom PDF Creator</span>
          <span>
            Page {pageNumber} of {totalPages}
          </span>
        </div>
      )}
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
