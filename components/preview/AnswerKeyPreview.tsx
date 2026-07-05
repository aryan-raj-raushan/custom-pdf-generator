'use client';

import React, { useMemo, useRef } from 'react';
import { PREVIEW_COLORS } from '@/lib/previewTheme';
import { ExamPaper } from '@/types/exam';
import { ColumnCount, PageWatermark } from './A4Preview';
import { TextRange, useRenderedColumnPagination } from '@/lib/usePagination';
import {
  SPLITTABLE_TEXT_ATTR,
  rootFragmentId,
  renderMonoOrBilingualText,
  resolveDisplayText,
} from '@/lib/textFragment';

interface AnswerKeyPreviewProps {
  paper: ExamPaper;
  columns?: ColumnCount;
  fontSize?: number;
  active?: boolean;
  hideSolutions?: boolean;
}

interface FlatAnswerRow {
  id: string;
  number: number;
  letter?: string;
  optionTextEn?: string;
  solutionEn?: string;
  solutionHi?: string;
  sectionTitleEn?: string;
  isFirstInSection: boolean;
  hasMath: boolean;
}

type AnswerFragmentKind = 'answer' | 'solution';

interface FlatAnswerFragment {
  blockId: string;
  rowId: string;
  row: FlatAnswerRow;
  kind: AnswerFragmentKind;
  showNumber: boolean;
}

function buildAnswerFragments(rows: FlatAnswerRow[]): FlatAnswerFragment[] {
  const out: FlatAnswerFragment[] = [];
  rows.forEach((row) => {
    const hasAnswer = !!row.letter;
    if (hasAnswer) {
      out.push({
        blockId: `${row.id}::answer`,
        rowId: row.id,
        row,
        kind: 'answer',
        showNumber: true,
      });
    }
    // Always emit a 'solution' fragment (even with no solution text, it
    // shows the "No solution provided" placeholder) so every row has at
    // least one fragment and keeps its number visible somewhere.
    out.push({
      blockId: `${row.id}::solution`,
      rowId: row.id,
      row,
      kind: 'solution',
      showNumber: !hasAnswer,
    });
  });
  return out;
}

interface AnswerGridProps {
  rows: FlatAnswerRow[];
  sizes: ReturnType<typeof getAnswerSizes>;
}

const FONT_BASE = 11;
const A4_WIDTH_PX = 794;

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

function getAnswerSizes(fontSize: number) {
  const delta = fontSize - FONT_BASE;

  return {
    pageTitle: 16 + delta,
    examTitle: 12 + delta,
    organisation: 10.5 + delta * 0.7,
    examCode: 10 + delta * 0.8,
    sectionHeader: 10 + delta,
    solutionText: fontSize,
    answerGridNumber: 9 + delta * 0.7,
    answerGridLetter: 9.5 + delta * 0.7,
    blockNumber: 11 + delta * 0.8,
    answerLabel: Math.max(10, fontSize + 0.2),
    noSolution: Math.max(9, 9 + delta * 0.6),
    metaRow: 9.5 + delta * 0.6,
    footer: Math.max(8, 9 + delta * 0.5),
    runningHeader: Math.max(9, 10 + delta * 0.5),
  };
}

function ContinuationBadge({
  number,
  visible,
  sizePx,
}: Readonly<{ number: number; visible: boolean; sizePx: number }>) {
  return (
    <span
      className="flex h-6 w-7 shrink-0 items-center justify-center rounded font-bold"
      style={{
        backgroundColor: PREVIEW_COLORS.subduedSurface,
        fontSize: `${sizePx}px`,
        // Only ever force 'hidden' — never explicitly 'visible' — so this
        // doesn't bleed through the hidden export-preview copies the same
        // way A4Preview's ContinuationNumber used to (see that file).
        ...(visible ? null : { visibility: 'hidden' as const }),
      }}
    >
      {number}
    </span>
  );
}

function AnswerGrid({ rows, sizes }: Readonly<AnswerGridProps>) {
  const mcqRows = rows.filter((r) => r.letter);
  if (mcqRows.length === 0) return null;

  return (
    <div className="mb-5 border p-3" style={{ borderColor: PREVIEW_COLORS.ruleBold }}>
      <p
        style={{
          color: PREVIEW_COLORS.quaternaryText,
          fontSize: `${sizes.sectionHeader}px`,
        }}
        className="mb-2 text-center font-bold uppercase tracking-widest"
      >
        Answer Key
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: '4px 4px',
        }}
      >
        {mcqRows.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-1 rounded px-1 py-0.5"
            style={{ backgroundColor: PREVIEW_COLORS.subduedSurface }}
          >
            <span
              style={{
                color: PREVIEW_COLORS.tertiaryText,
                fontSize: `${sizes.answerGridNumber}px`,
              }}
              className="min-w-[16px] text-right font-medium"
            >
              {r.number}.
            </span>
            <span
              style={{
                color: PREVIEW_COLORS.successText,
                fontSize: `${sizes.answerGridLetter}px`,
              }}
              className="font-bold"
            >
              {r.letter}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders one answer-key fragment (either the "Ans: (letter)" line or the
 * "Solution:" text). Each is its own flowable unit — like A4Preview's
 * question fragments — so a long solution can flow into the next
 * column/page, and its own text can be cut mid-paragraph via `textRange`
 * (book-style reflow) instead of the whole solution jumping down whole.
 */
function AnswerFragmentBlock({
  fragment,
  fragmentId,
  textRange,
  showEn,
  showHi,
  columns,
  fontSize,
  sizes,
}: Readonly<{
  fragment: FlatAnswerFragment;
  fragmentId: string;
  textRange?: TextRange;
  showEn: boolean;
  showHi: boolean;
  columns: ColumnCount;
  fontSize: number;
  sizes: ReturnType<typeof getAnswerSizes>;
}>) {
  const { row } = fragment;
  const actualFontSize = columns === 1 ? fontSize : columns === 3 ? fontSize + 1 : fontSize + 2;
  const isContinuationPiece = !!textRange && textRange.from > 0;
  const hasSolution = !!(row.solutionEn || row.solutionHi);

  const renderAnswer = () => (
    <p style={{ fontSize: `${sizes.answerLabel}px` }}>
      {!isContinuationPiece && <span className="font-semibold">Ans: </span>}
      <span className="font-bold" style={{ color: PREVIEW_COLORS.successText }}>
        {!isContinuationPiece && `(${row.letter}) `}
        {renderMonoOrBilingualText(
          showEn ? row.optionTextEn : undefined,
          undefined,
          row.hasMath,
          textRange,
          (node) => node,
          (node) => node,
        )}
      </span>
    </p>
  );

  const renderSolution = () => {
    if (!hasSolution) {
      return (
        <p
          className="mt-0.5 italic"
          style={{ fontSize: `${sizes.noSolution}px`, color: PREVIEW_COLORS.mutedText }}
        >
          No solution provided
        </p>
      );
    }
    const { enText, hiText } = resolveDisplayText(showEn, showHi, row.solutionEn, row.solutionHi);
    return (
      <div style={{ color: PREVIEW_COLORS.tertiaryText }}>
        {!isContinuationPiece && (
          <span className="font-semibold" style={{ color: PREVIEW_COLORS.quaternaryText }}>
            Solution:{' '}
          </span>
        )}
        {renderMonoOrBilingualText(
          enText,
          hiText,
          row.hasMath,
          textRange,
          (node) => (
            <span style={{ whiteSpace: 'pre-line' }}>{node}</span>
          ),
          (node) => (
            <span
              className="font-devanagari block mt-0.5"
              style={{ whiteSpace: 'pre-line', fontSize: `${actualFontSize}px` }}
            >
              {node}
            </span>
          ),
        )}
      </div>
    );
  };

  return (
    <div
      className="break-inside-avoid leading-snug"
      style={{ fontSize: `${actualFontSize}px` }}
      data-fragment-id={fragmentId}
      data-answer-id={row.id}
    >
      <div className="flex gap-1.5">
        <ContinuationBadge
          number={row.number}
          visible={fragment.showNumber && !isContinuationPiece}
          sizePx={sizes.blockNumber}
        />
        <div className="flex-1">
          {fragment.kind === 'answer' ? renderAnswer() : renderSolution()}
        </div>
      </div>
    </div>
  );
}

export const AnswerKeyPreview = React.forwardRef<HTMLDivElement, AnswerKeyPreviewProps>(
  ({ paper, columns = 2, fontSize = 11, active = true, hideSolutions = false }, ref) => {
    const showHi = paper.metadata.language !== 'en';
    const showEn = paper.metadata.language !== 'hi';
    const sizes = getAnswerSizes(fontSize);
    const footerBaseText = paper.metadata.footerText?.trim() || 'Test PDF';

    const rows: FlatAnswerRow[] = useMemo(() => {
      let n = 0;
      const out: FlatAnswerRow[] = [];
      paper.sections.forEach((section) => {
        section.questions.forEach((q, qi) => {
          n += 1;
          const correctOption = q.options?.find((o) => o.isCorrect);
          const letterIndex = q.options?.findIndex((o) => o.isCorrect) ?? -1;
          out.push({
            id: q.id,
            number: n,
            letter:
              q.correctAnswerLetter ??
              (letterIndex >= 0 ? String.fromCharCode(65 + letterIndex) : undefined),
            optionTextEn: correctOption?.textEn,
            solutionEn: q.solutionEn,
            solutionHi: q.solutionHi,
            sectionTitleEn: qi === 0 ? section.titleEn : undefined,
            isFirstInSection: qi === 0,
            hasMath: !!q.hasMath,
          });
        });
      });
      return out;
    }, [paper.sections]);

    const fragments = useMemo(() => buildAnswerFragments(rows), [rows]);
    const fragmentBlockIds = useMemo(() => fragments.map((f) => f.blockId), [fragments]);
    const fragmentById = useMemo(() => {
      const m = new Map<string, FlatAnswerFragment>();
      fragments.forEach((f) => m.set(f.blockId, f));
      return m;
    }, [fragments]);

    const rootRef = useRef<HTMLDivElement>(null!);
    const setRootRef = (node: HTMLDivElement | null) => {
      rootRef.current = node as HTMLDivElement;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    const { pages: solutionPages, textRanges } = useRenderedColumnPagination(
      fragmentBlockIds,
      rootRef,
      {
        pageSelector: '[data-content-page="true"]',
        footerSelector: '[data-page-footer="true"]',
        columnSelector: '[data-flow-column="true"]',
        blockAttr: 'data-fragment-id',
        columns,
        active: active && !hideSolutions,
        resetKey: `${columns}-${fontSize}-${paper.metadata.language}-${hideSolutions ? 'grid-only' : 'with-solutions'}`,
        // Solutions can run long, so let a solution that doesn't fully fit
        // split mid-paragraph (book-style) instead of moving the whole
        // solution to the next column/page — fills the column properly
        // instead of leaving it mostly empty. (A4Preview intentionally does
        // NOT do this — questions there always move whole.)
        getSplitTextNode: (blockNode) => {
          const el = blockNode.querySelector<HTMLElement>(`[${SPLITTABLE_TEXT_ATTR}]`);
          if (!el || el.childNodes.length !== 1) return null;
          const child = el.firstChild;
          return child && child.nodeType === Node.TEXT_NODE ? (child as Text) : null;
        },
      },
    );

    if (hideSolutions) {
      return (
        <div ref={setRootRef} className="flex flex-col items-center gap-6">
          <div
            className="answer-key-page relative"
            data-content-page="true"
            style={{
              width: A4_WIDTH_PX,
              height: 1123,
              overflow: 'hidden',
              padding: '34px 38px 44px',
              backgroundColor: PREVIEW_COLORS.pageBackground,
              color: PREVIEW_COLORS.pageText,
              boxShadow: PREVIEW_COLORS.pageShadow,
              fontFamily: "var(--font-paper, 'Tinos', 'Times New Roman', serif)",
            }}
          >
            <PageWatermark metadata={paper.metadata} />
            <div
              className="mb-4 border-b-2 pb-2 text-center"
              style={{ borderColor: PREVIEW_COLORS.pageText }}
            >
              <h1 className="font-bold uppercase" style={{ fontSize: `${sizes.pageTitle}px` }}>
                Answer Key
              </h1>
              {showEn && paper.metadata.organisation && (
                <p
                  className="mt-0.5 font-semibold uppercase tracking-wide"
                  style={{
                    color: PREVIEW_COLORS.quaternaryText,
                    fontSize: `${sizes.organisation}px`,
                  }}
                >
                  {paper.metadata.organisation}
                </p>
              )}
              {showHi && paper.metadata.organisationHi && (
                <p
                  className="font-devanagari font-semibold"
                  style={{
                    color: PREVIEW_COLORS.quaternaryText,
                    fontSize: `${sizes.organisation}px`,
                  }}
                >
                  {paper.metadata.organisationHi}
                </p>
              )}
              {showEn && paper.metadata.examTitle && (
                <p style={{ color: PREVIEW_COLORS.tertiaryText, fontSize: `${sizes.examTitle}px` }}>
                  {paper.metadata.examTitle}
                </p>
              )}
              <div
                className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5"
                style={{ color: PREVIEW_COLORS.mutedText, fontSize: `${sizes.metaRow}px` }}
              >
                {paper.metadata.examCode && <span>{paper.metadata.examCode}</span>}
                {(paper.metadata.setCode || paper.metadata.bookletSeries) && (
                  <span>
                    Set {paper.metadata.setCode}
                    {paper.metadata.bookletSeries && ` · ${paper.metadata.bookletSeries}`}
                  </span>
                )}
                {paper.metadata.date && (
                  <span>
                    {new Date(paper.metadata.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
                {paper.metadata.duration && <span>{paper.metadata.duration}</span>}
                <span>Max Marks: {paper.metadata.maxMarks}</span>
              </div>
            </div>

            <AnswerGrid rows={rows} sizes={sizes} />

            <div
              data-page-footer="true"
              className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-9"
              style={{ color: PREVIEW_COLORS.mutedText, fontSize: `${sizes.footer}px` }}
            >
              <span>{footerBaseText} - Answer Key</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div ref={setRootRef} className="flex flex-col items-center gap-6">
        {solutionPages.map((pageColumns, pageIndex) => (
          <div
            key={pageIndex}
            className="answer-key-page relative"
            data-content-page="true"
            style={{
              width: A4_WIDTH_PX,
              height: 1123,
              overflow: 'hidden',
              padding: '34px 38px 44px',
              backgroundColor: PREVIEW_COLORS.pageBackground,
              color: PREVIEW_COLORS.pageText,
              boxShadow: PREVIEW_COLORS.pageShadow,
              fontFamily: "var(--font-paper, 'Tinos', 'Times New Roman', serif)",
            }}
          >
            <PageWatermark metadata={paper.metadata} />
            {pageIndex === 0 && (
              <>
                <div
                  className="mb-4 border-b-2 pb-2 text-center"
                  style={{ borderColor: PREVIEW_COLORS.pageText }}
                >
                  <h1 className="font-bold uppercase" style={{ fontSize: `${sizes.pageTitle}px` }}>
                    Answer Key &amp; Solutions
                  </h1>
                  {showEn && paper.metadata.organisation && (
                    <p
                      className="mt-0.5 font-semibold uppercase tracking-wide"
                      style={{
                        color: PREVIEW_COLORS.quaternaryText,
                        fontSize: `${sizes.organisation}px`,
                      }}
                    >
                      {paper.metadata.organisation}
                    </p>
                  )}
                  {showHi && paper.metadata.organisationHi && (
                    <p
                      className="font-devanagari font-semibold"
                      style={{
                        color: PREVIEW_COLORS.quaternaryText,
                        fontSize: `${sizes.organisation}px`,
                      }}
                    >
                      {paper.metadata.organisationHi}
                    </p>
                  )}
                  {showEn && paper.metadata.examTitle && (
                    <p
                      style={{
                        color: PREVIEW_COLORS.tertiaryText,
                        fontSize: `${sizes.examTitle}px`,
                      }}
                    >
                      {paper.metadata.examTitle}
                    </p>
                  )}
                  {showHi && paper.metadata.examTitleHi && (
                    <p
                      className="font-devanagari"
                      style={{
                        color: PREVIEW_COLORS.tertiaryText,
                        fontSize: `${sizes.examTitle}px`,
                      }}
                    >
                      {paper.metadata.examTitleHi}
                    </p>
                  )}
                  <div
                    className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5"
                    style={{ color: PREVIEW_COLORS.mutedText, fontSize: `${sizes.metaRow}px` }}
                  >
                    {paper.metadata.examCode && <span>{paper.metadata.examCode}</span>}
                    {(paper.metadata.setCode || paper.metadata.bookletSeries) && (
                      <span>
                        Set {paper.metadata.setCode}
                        {paper.metadata.bookletSeries && ` · ${paper.metadata.bookletSeries}`}
                      </span>
                    )}
                    {paper.metadata.date && (
                      <span>
                        {new Date(paper.metadata.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                    {paper.metadata.duration && <span>{paper.metadata.duration}</span>}
                    <span>Max Marks: {paper.metadata.maxMarks}</span>
                  </div>
                </div>

                <AnswerGrid rows={rows} sizes={sizes} />

                <div
                  className="mb-3 border-b pb-1 font-bold uppercase tracking-widest"
                  style={{
                    borderColor: PREVIEW_COLORS.ruleStrong,
                    color: PREVIEW_COLORS.quaternaryText,
                    fontSize: `${sizes.sectionHeader}px`,
                  }}
                >
                  Solutions
                </div>
              </>
            )}

            {pageIndex > 0 && (
              <div
                className="mb-3 flex items-center justify-between border-b pb-1 font-medium"
                style={{
                  borderColor: PREVIEW_COLORS.ruleStrong,
                  fontSize: `${sizes.runningHeader}px`,
                }}
              >
                <span>Solutions - {paper.metadata.examTitle}</span>
                <span>{paper.metadata.examCode}</span>
              </div>
            )}

            <div style={COLUMN_CONTAINER_STYLE[columns]}>
              {pageColumns.map((columnIds, columnIndex) => (
                <div
                  key={columnIndex}
                  data-flow-column="true"
                  className="min-w-0"
                  style={{ width: COLUMN_MEASURE_WIDTHS[columns], flex: '0 0 auto' }}
                >
                  {columnIds.map((id) => {
                    const textRange = textRanges.get(id);
                    const fragment = fragmentById.get(id) ?? fragmentById.get(rootFragmentId(id));
                    if (!fragment) return null;
                    const { row } = fragment;
                    // A continuation piece never repeats the section header
                    // that already ran before this row's first fragment.
                    const isFirstPiece = !textRange || textRange.from === 0;

                    return (
                      <React.Fragment key={id}>
                        {isFirstPiece &&
                          fragment.showNumber &&
                          row.isFirstInSection &&
                          row.sectionTitleEn && (
                            <div
                              style={{
                                borderBottom: `1px solid ${PREVIEW_COLORS.ruleSoft}`,
                                color: PREVIEW_COLORS.quaternaryText,
                                marginTop: '6px',
                                marginBottom: '6px',
                                paddingBottom: '2px',
                                fontSize: `${sizes.sectionHeader}px`,
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}
                            >
                              {row.sectionTitleEn}
                            </div>
                          )}
                        <AnswerFragmentBlock
                          fragment={fragment}
                          fragmentId={id}
                          textRange={textRange}
                          showEn={showEn}
                          showHi={showHi}
                          columns={columns}
                          fontSize={fontSize}
                          sizes={sizes}
                        />
                      </React.Fragment>
                    );
                  })}
                </div>
              ))}
            </div>

            <div
              data-page-footer="true"
              className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-9"
              style={{ color: PREVIEW_COLORS.mutedText, fontSize: `${sizes.footer}px` }}
            >
              <span>{footerBaseText} - Answer Key</span>
              <span>
                Page {pageIndex + 1} of {solutionPages.length}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  },
);

AnswerKeyPreview.displayName = 'AnswerKeyPreview';

export default AnswerKeyPreview;
