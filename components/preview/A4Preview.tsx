// components/preview/A4Preview.tsx
'use client';

import React, { useMemo, useRef } from 'react';
import { ExamMetadata, ExamPaper, Question, QuestionOption } from '@/types/exam';
import { PREVIEW_COLORS } from '@/lib/previewTheme';
import { PaperHeader, InstructionsBlock, CoachingPageFooter, HeaderBanner } from './PaperHeader';
import { TextRange, useRenderedColumnPagination } from '@/lib/usePagination';
import { FONT_SIZE_DEFAULT } from './PreviewPanel';
import { rootFragmentId, renderMonoOrBilingualText, resolveDisplayText } from '@/lib/textFragment';

export type ColumnCount = 1 | 2 | 3;

type QuestionFragmentKind = 'prompt' | 'assertion' | 'reason' | 'image' | 'option' | 'answer-line';

interface FlatQuestionFragment {
  blockId: string;
  questionId: string;
  question: Question;
  number: number;
  sectionTitleEn?: string;
  sectionTitleHi?: string;
  isFirstInSection: boolean;
  kind: QuestionFragmentKind;
  option?: QuestionOption;
  optionIndex?: number;
  answerLineIndex?: number;
  showNumber: boolean;
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

function deriveTextSizes(
  columns: ColumnCount,
  fontSize: number,
): { question: number; option: number } {
  const colOffset: Record<ColumnCount, number> = { 1: 1, 2: 0, 3: -1 };
  const base = fontSize + colOffset[columns];
  return {
    question: base,
    option: base - 0.5,
  };
}

function buildQuestionFragments(paper: ExamPaper): FlatQuestionFragment[] {
  let n = 0;
  const out: FlatQuestionFragment[] = [];

  const allIds = paper.sections.flatMap((s) => s.questions.map((q) => q.id));
  console.log('[editor-load] A4Preview.buildQuestionFragments', {
    sectionCount: paper.sections.length,
    sectionSizes: paper.sections.map((s) => s.questions.length),
    totalQuestions: allIds.length,
    uniqueQuestionIds: new Set(allIds).size,
  });

  paper.sections.forEach((section) => {
    section.questions.forEach((question, questionIndex) => {
      n += 1;
      const isFirstInSection = questionIndex === 0;
      const sectionTitleEn = isFirstInSection ? section.titleEn : undefined;
      const sectionTitleHi = isFirstInSection ? section.titleHi : undefined;
      const base = {
        questionId: question.id,
        question,
        number: n,
        sectionTitleEn,
        sectionTitleHi,
        isFirstInSection,
      };

      out.push({
        ...base,
        blockId: `${question.id}::prompt`,
        kind: 'prompt',
        showNumber: true,
      });

      if (question.type === 'assertion_reason' && (question.assertionEn || question.assertionHi)) {
        out.push({
          ...base,
          blockId: `${question.id}::assertion`,
          kind: 'assertion',
          showNumber: false,
        });
      }

      if (question.type === 'assertion_reason' && (question.reasonEn || question.reasonHi)) {
        out.push({
          ...base,
          blockId: `${question.id}::reason`,
          kind: 'reason',
          showNumber: false,
        });
      }

      if (question.imageDataUrl) {
        out.push({
          ...base,
          blockId: `${question.id}::image`,
          kind: 'image',
          showNumber: false,
        });
      }

      if ((question.type === 'mcq' || question.type === 'assertion_reason') && question.options) {
        question.options.forEach((option, optionIndex) => {
          out.push({
            ...base,
            blockId: `${question.id}::option-${option.id}`,
            kind: 'option',
            option,
            optionIndex,
            showNumber: false,
          });
        });
      }

      if (question.type === 'short' || question.type === 'long') {
        const lines = question.answerSpaceLines ?? (question.type === 'short' ? 3 : 8);
        for (let i = 0; i < lines; i += 1) {
          out.push({
            ...base,
            blockId: `${question.id}::answer-line-${i}`,
            kind: 'answer-line',
            answerLineIndex: i,
            showNumber: false,
          });
        }
      }
    });
  });

  return out;
}

function ContinuationNumber({
  number,
  visible,
  showFlagIndicator,
  hasFlags,
}: Readonly<{
  number: number;
  visible: boolean;
  showFlagIndicator?: boolean;
  hasFlags?: boolean;
}>) {
  return (
    <span
      className="shrink-0 font-bold"
      // Only ever force 'hidden' here, never 'visible' — an explicit
      // visibility:visible on a descendant overrides an ancestor's
      // visibility:hidden, which let this number bleed through the
      // hidden export-preview copies mounted by PreviewPanel. Leaving
      // the property unset when visible lets it inherit normally.
      style={{
        ...(visible ? null : { visibility: 'hidden' as const }),
        minWidth: `${String(number).length + 1}ch`,
      }}
    >
      {number}.
      {visible && showFlagIndicator && hasFlags && (
        <span
          title="This question was imported with unresolved issues"
          className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full align-super"
          style={{ backgroundColor: PREVIEW_COLORS.warningFill }}
        />
      )}
    </span>
  );
}

function QuestionFragmentBlock({
  fragment,
  fragmentId,
  textRange,
  metadata,
  columns,
  fontSize,
  isHighlighted,
  highlightCorrectOption,
}: Readonly<{
  fragment: FlatQuestionFragment;
  fragmentId: string;
  textRange?: TextRange;
  metadata: ExamMetadata;
  columns: ColumnCount;
  fontSize: number;
  isHighlighted: boolean;
  highlightCorrectOption: boolean;
}>) {
  const { question, number } = fragment;
  const showHi = metadata.language !== 'en';
  const showEn = metadata.language !== 'hi';
  const marks = question.marks ?? metadata.marksPerQuestion ?? 1;
  const hasFlags = (question.importFlags?.length ?? 0) > 0;
  const { question: qSize, option: oSize } = deriveTextSizes(columns, fontSize);
  // Only the very first piece of a split paragraph keeps the real question
  // number/marks/section header/option-letter — later pieces are
  // continuations (ContinuationNumber already reserves the same indent).
  const isContinuationPiece = !!textRange && textRange.from > 0;

  // Options render two-per-line (a & b, then c & d) except in 3-column mode,
  // where a single column is already narrow enough that pairing them up
  // would make each option unreadably cramped.
  const isPairedOption = fragment.kind === 'option' && columns !== 3;

  const wrapperStyle: React.CSSProperties = {
    fontSize: `${fragment.kind === 'option' ? oSize : qSize}px`,
    ...(isPairedOption
      ? {
          display: 'inline-block',
          verticalAlign: 'top',
          width: '50%',
          boxSizing: 'border-box',
          paddingRight: columns === 1 ? '16px' : '8px',
        }
      : undefined),
    ...(isHighlighted
      ? {
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          outline: '2px solid rgba(245, 158, 11, 0.6)',
          outlineOffset: '2px',
        }
      : undefined),
  };

  const renderPromptText = () => {
    const { enText, hiText } = resolveDisplayText(showEn, showHi, question.textEn, question.textHi);

    return renderMonoOrBilingualText(
      enText,
      hiText,
      !!question.hasMath,
      textRange,
      (node) => (
        <div style={{ whiteSpace: 'pre-line' }}>
          {node}
          {!isContinuationPiece && (
            <span className="ml-1 font-medium" style={{ color: PREVIEW_COLORS.secondaryText }}>
              [{marks}]
            </span>
          )}
        </div>
      ),
      (node) => (
        <div
          className="font-devanagari"
          style={{ whiteSpace: 'pre-line', color: PREVIEW_COLORS.quaternaryText }}
        >
          {node}
        </div>
      ),
    );
  };

  const renderAssertionReason = (kind: 'assertion' | 'reason') => {
    const label = kind === 'assertion' ? 'Assertion (A): ' : 'Reason (R): ';
    const { enText, hiText } = resolveDisplayText(
      showEn,
      showHi,
      kind === 'assertion' ? question.assertionEn : question.reasonEn,
      kind === 'assertion' ? question.assertionHi : question.reasonHi,
    );

    return (
      <p>
        {!isContinuationPiece && <span className="font-semibold">{label}</span>}
        {renderMonoOrBilingualText(
          enText,
          hiText,
          !!question.hasMath,
          textRange,
          (node) => node,
          (node) => (
            <span
              className="font-devanagari block"
              style={{ color: PREVIEW_COLORS.quaternaryText }}
            >
              {node}
            </span>
          ),
        )}
      </p>
    );
  };

  const renderOption = () => {
    const option = fragment.option;
    if (!option || fragment.optionIndex === undefined) return null;
    const letterForIndex = String.fromCharCode(97 + fragment.optionIndex);
    const matchesCorrectLetter = question.correctAnswerLetter?.toLowerCase() === letterForIndex;
    const isAnswer = highlightCorrectOption && (option.isCorrect || matchesCorrectLetter);
    const { enText, hiText } = resolveDisplayText(showEn, showHi, option.textEn, option.textHi);

    return (
      <div
        className="flex gap-1 rounded px-1"
        style={
          isAnswer
            ? {
                backgroundColor: 'rgba(34, 197, 94, 0.14)',
                outline: `2px solid ${PREVIEW_COLORS.successText}`,
                outlineOffset: '2px',
                paddingTop: '0.0625rem',
                paddingBottom: '0.0625rem',
              }
            : undefined
        }
      >
        <span
          className="font-semibold"
          style={{
            fontSize: `${oSize}px`,
            color: isAnswer ? PREVIEW_COLORS.successText : undefined,
            ...(isContinuationPiece ? { visibility: 'hidden' as const } : null),
          }}
        >
          ({letterForIndex})
        </span>
        <div style={{ fontSize: `${oSize}px` }}>
          {renderMonoOrBilingualText(
            enText,
            hiText,
            !!question.hasMath,
            textRange,
            (node) => (
              <span
                style={
                  isAnswer ? { fontWeight: 700, color: PREVIEW_COLORS.successText } : undefined
                }
              >
                {node}
              </span>
            ),
            (node) => (
              <span
                className="font-devanagari block"
                style={{
                  color: isAnswer ? PREVIEW_COLORS.successText : PREVIEW_COLORS.tertiaryText,
                  fontSize: `${oSize - 0.5}px`,
                }}
              >
                {node}
              </span>
            ),
          )}
          {!isContinuationPiece && option.imageDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={option.imageDataUrl} alt="" className="mt-1 max-h-20 object-contain" />
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (fragment.kind) {
      case 'prompt':
        return renderPromptText();
      case 'assertion':
        return renderAssertionReason('assertion');
      case 'reason':
        return renderAssertionReason('reason');
      case 'image':
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={question.imageDataUrl} alt="" className="my-1 max-h-24 object-contain" />
        );
      case 'option':
        return renderOption();
      case 'answer-line':
        return (
          <span
            className="mt-1 block border-b border-dotted"
            style={{ borderColor: PREVIEW_COLORS.ruleSoft }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      data-question-id={question.id}
      data-fragment-id={fragmentId}
      className="pb-1.5 leading-snug transition-colors"
      style={wrapperStyle}
    >
      <div className="flex gap-1.5">
        <ContinuationNumber
          number={number}
          visible={fragment.showNumber && !isContinuationPiece}
          showFlagIndicator={fragment.kind === 'prompt'}
          hasFlags={hasFlags}
        />
        <div className="min-w-0 flex-1">{renderContent()}</div>
      </div>
    </div>
  );
}

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

    const fragments = useMemo(() => buildQuestionFragments(paper), [paper]);

    const blockIds = useMemo(() => fragments.map((fragment) => fragment.blockId), [fragments]);

    const byId = useMemo(() => {
      const map = new Map<string, FlatQuestionFragment>();
      fragments.forEach((fragment) => map.set(fragment.blockId, fragment));
      return map;
    }, [fragments]);

    const { pages, textRanges } = useRenderedColumnPagination(blockIds, rootRef, {
      pageSelector: '[data-content-page="true"]',
      footerSelector: '[data-page-footer="true"]',
      columnSelector: '[data-flow-column="true"]',
      blockAttr: 'data-fragment-id',
      columns,
      active,
      resetKey: `${columns}-${fontSize}-${paper.metadata.headerMode ?? 'template'}-${paper.metadata.headerBannerImageUrl ?? ''}-${paper.metadata.headerTemplate ?? 'classic'}-${paper.metadata.language}`,
      // Mid-paragraph splitting (getSplitTextNode) is intentionally not
      // wired up here — it kept producing edge cases where a fragment's
      // rendered text came out empty. A fragment that doesn't fit now
      // always moves whole to the next column/page instead: slower to
      // reflow, but it can never render blank.
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
                    const textRange = textRanges.get(id);
                    const fragment = byId.get(id) ?? byId.get(rootFragmentId(id));
                    if (!fragment) return null;
                    // A continuation piece never repeats the section header
                    // that already ran before the first piece.
                    const isFirstPiece = !textRange || textRange.from === 0;

                    return (
                      <React.Fragment key={id}>
                        {isFirstPiece &&
                          fragment.isFirstInSection &&
                          fragment.kind === 'prompt' &&
                          fragment.sectionTitleEn && (
                            <div
                              className="mb-2 mt-2 border-b pb-1 text-[11px] font-bold uppercase tracking-wide"
                              style={{ borderColor: PREVIEW_COLORS.ruleMedium }}
                            >
                              {fragment.sectionTitleEn}
                              {paper.metadata.language !== 'en' && fragment.sectionTitleHi && (
                                <span className="font-devanagari ml-2 font-normal normal-case">
                                  {fragment.sectionTitleHi}
                                </span>
                              )}
                            </div>
                          )}
                        <QuestionFragmentBlock
                          fragment={fragment}
                          fragmentId={id}
                          textRange={textRange}
                          metadata={paper.metadata}
                          columns={columns}
                          fontSize={fontSize}
                          isHighlighted={fragment.questionId === highlightedQuestionId}
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
  const footerText = metadata.footerText?.trim() || 'Test PDF';
  const footerFontSize = metadata.headerFontSizes?.footer ?? 12;

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
          className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-9"
          style={{ color: PREVIEW_COLORS.mutedText, fontSize: `${footerFontSize}px` }}
        >
          <span>{footerText}</span>
          <span>
            Page {pageNumber} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}

function RunningHeader({ metadata }: Readonly<{ metadata: ExamPaper['metadata'] }>) {
  const headerFontSize = Math.max(9, (metadata.headerFontSizes?.meta ?? 12.5) - 2.5);

  return (
    <div
      className="flex items-center justify-between border-b pb-1 font-medium"
      style={{ borderColor: PREVIEW_COLORS.ruleStrong, fontSize: `${headerFontSize}px` }}
    >
      <span>{metadata.examTitle}</span>
      <span>{metadata.examCode}</span>
    </div>
  );
}

export default A4Preview;
