// components/preview/A4Preview.tsx
'use client';

import React, { useMemo, useRef } from 'react';
import { ExamPaper, Question } from '@/types/exam';
import { PREVIEW_COLORS } from '@/lib/previewTheme';
import { PaperHeader, InstructionsBlock, CoachingPageFooter, HeaderBanner } from './PaperHeader';
import { QuestionBlock } from './QuestionBlock';
import { useRenderedColumnPagination } from '@/lib/usePagination';
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
  highlightCorrectAnswers?: boolean;
}

const COLUMN_MEASURE_WIDTHS: Record<ColumnCount, number> = {
  1: 718,
  2: 349,
  3: 226,
};

const COLUMN_CONTAINER_STYLE: Record<ColumnCount, React.CSSProperties> = {
  1: { display: 'flex', gap: 0 },
  2: { display: 'flex', gap: 20 },
  3: { display: 'flex', gap: 20 },
};

export const A4Preview = React.forwardRef<HTMLDivElement, A4PreviewProps>(
  (
    {
      paper,
      highlightedQuestionId,
      columns = 2,
      fontSize = FONT_SIZE_DEFAULT,
      active = true,
      highlightCorrectAnswers = false,
    },
    ref,
  ) => {
    const rootRef = useRef<HTMLDivElement>(null!);

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

    const blockIds = useMemo(() => flatQuestions.map((f) => f.blockId), [flatQuestions]);

    const byId = useMemo(() => {
      const m = new Map<string, FlatQuestion>();
      flatQuestions.forEach((f) => m.set(f.blockId, f));
      return m;
    }, [flatQuestions]);

    const pages = useRenderedColumnPagination(blockIds, rootRef, {
      pageSelector: '[data-content-page="true"]',
      footerSelector: '[data-page-footer="true"]',
      columnSelector: '[data-flow-column="true"]',
      blockAttr: 'data-question-id',
      columns,
      active,
      resetKey: `${columns}-${fontSize}-${paper.metadata.headerMode ?? 'template'}-${paper.metadata.headerBannerImageUrl ?? ''}-${paper.metadata.headerTemplate ?? 'classic'}-${paper.metadata.language}`,
    });

    return (
      <div ref={setRootRef} className="flex flex-col items-center gap-6">
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
                {paper.metadata.headerMode === 'banner' && paper.metadata.headerBannerImageUrl ? (
                  <HeaderBanner imageUrl={paper.metadata.headerBannerImageUrl} />
                ) : (
                  <>
                    <PaperHeader metadata={paper.metadata} />
                    <InstructionsBlock metadata={paper.metadata} />
                  </>
                )}
              </>
            )}
            {pageIndex > 0 && <RunningHeader metadata={paper.metadata} />}

            <div className="mt-2.5" style={COLUMN_CONTAINER_STYLE[columns]}>
              {pageBlockIds.map((columnIds, columnIndex) => (
                <div
                  key={columnIndex}
                  data-flow-column="true"
                  className="min-w-0"
                  style={{ width: COLUMN_MEASURE_WIDTHS[columns], flex: '0 0 auto' }}
                >
                  {columnIds.map((id) => {
                    const f = byId.get(id);
                    if (!f) return null;

                    return (
                      <React.Fragment key={f.blockId}>
                        {f.isFirstInSection && f.sectionTitleEn && (
                          <div
                            className="mb-2 mt-2 border-b pb-1 text-[11px] font-bold uppercase tracking-wide"
                            style={{ borderColor: PREVIEW_COLORS.ruleMedium }}
                          >
                            {f.sectionTitleEn}
                            {paper.metadata.language !== 'en' && f.sectionTitleHi && (
                              <span className="font-devanagari ml-2 font-normal normal-case">
                                {f.sectionTitleHi}
                              </span>
                            )}
                          </div>
                        )}
                        <QuestionBlock
                          question={f.question}
                          number={f.number}
                          metadata={paper.metadata}
                          isHighlighted={f.blockId === highlightedQuestionId}
                          showFlagIndicator
                          columns={columns}
                          fontSize={fontSize}
                          highlightCorrectOption={highlightCorrectAnswers}
                        />
                      </React.Fragment>
                    );
                  })}
                </div>
              ))}
            </div>
          </Page>
        ))}
      </div>
    );
  },
);

A4Preview.displayName = 'A4Preview';

export function PageWatermark({ metadata }: Readonly<{ metadata: ExamPaper['metadata'] }>) {
  const wm = metadata.watermark;
  if (!wm?.enabled) return null;

  const opacity = wm.opacity ?? 0.12;
  const rotation = wm.rotation ?? (wm.type === 'image' ? -25 : -28);

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
            transform: `rotate(${rotation}deg)`,
          }}
        />
      </div>
    );
  }

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
          transform: `rotate(${rotation}deg)`,
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
        height: 1123,
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
          objectFit: 'contain',
        }}
      />
    </div>
  );
}

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
          <span>Test PDF</span>
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
