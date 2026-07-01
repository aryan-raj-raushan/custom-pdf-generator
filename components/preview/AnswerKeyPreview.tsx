'use client';

import React, { useMemo, useRef } from 'react';
import { PREVIEW_COLORS } from '@/lib/previewTheme';
import { MathText } from '@/lib/renderMath';
import { ExamPaper } from '@/types/exam';
import { ColumnCount, PageWatermark } from './A4Preview';
import { useAutoPaginate, useOverflowCorrection } from '@/lib/usePagination';

interface AnswerKeyPreviewProps {
  paper: ExamPaper;
  columns?: ColumnCount;
  fontSize?: number;
  active?: boolean;
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
}

interface AnswerGridProps {
  rows: FlatAnswerRow[];
  sizes: ReturnType<typeof getAnswerSizes>;
}

const FONT_BASE = 11;

function getAnswerSizes(fontSize: number) {
  const delta = fontSize - FONT_BASE;

  return {
    pageTitle: 16 + delta,
    examTitle: 12 + delta,
    examCode: 10 + delta * 0.8,
    sectionHeader: 10 + delta,
    solutionText: fontSize,
    answerGridNumber: 9 + delta * 0.7,
    answerGridLetter: 9.5 + delta * 0.7,
    footer: Math.max(8, 9 + delta * 0.5),
    runningHeader: Math.max(9, 10 + delta * 0.5),
  };
}

const A4_WIDTH_PX = 794;

// Inline grid styles — avoids Tailwind purging dynamic col-span/grid-cols classes
const GRID_STYLE: Record<ColumnCount, React.CSSProperties> = {
  1: { display: 'grid', gridTemplateColumns: '1fr' },
  2: { display: 'grid', gridTemplateColumns: '1fr 1fr' },
  3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' },
};

const COL_SPAN_ALL: React.CSSProperties = { gridColumn: '1 / -1' };

// ─── Compact Answer Grid ──────────────────────────────────────────────────────
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
      {/* Always 10-column dense grid — just number + letter */}
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

// ─── Solution Block ───────────────────────────────────────────────────────────
interface SolutionBlockProps {
  row: FlatAnswerRow;
  showEn: boolean;
  showHi: boolean;
  columns: ColumnCount;
  fontSize: number;
}

function SolutionBlock({ row, showEn, showHi, columns, fontSize }: Readonly<SolutionBlockProps>) {
  const hasSolution = row.solutionEn || row.solutionHi;
  const actualFontSize = columns === 1 ? fontSize : columns === 3 ? fontSize + 1 : fontSize + 2;

  return (
    <div
      className="break-inside-avoid pb-2.5 leading-snug"
      style={{
        fontSize: `${actualFontSize}px`,
      }}
      data-block-id={row.id}
    >
      <div className="flex gap-1.5">
        <span
          className="flex h-5 w-6 shrink-0 items-center justify-center rounded text-[9px] font-bold"
          style={{ backgroundColor: PREVIEW_COLORS.subduedSurface }}
        >
          {row.number}
        </span>
        <div className="flex-1">
          {row.letter && (
            <p>
              <span className="font-semibold">Ans: </span>
              <span className="font-bold" style={{ color: PREVIEW_COLORS.successText }}>
                ({row.letter}){row.optionTextEn ? ` ${row.optionTextEn}` : ''}
              </span>
            </p>
          )}
          {hasSolution ? (
            <p className="mt-0.5" style={{ color: PREVIEW_COLORS.tertiaryText }}>
              <span className="font-semibold" style={{ color: PREVIEW_COLORS.quaternaryText }}>
                Solution:{' '}
              </span>
              {showEn && row.solutionEn && <MathText text={row.solutionEn} />}
              {showHi && row.solutionHi && (
                <span
                  style={{
                    fontSize: `${actualFontSize}px`,
                  }}
                  className="font-devanagari mt-0.5 block text-[9.5px]"
                >
                  <MathText text={row.solutionHi} />
                </span>
              )}
            </p>
          ) : (
            <p
              className="mt-0.5 italic"
              style={{ fontSize: '9px', color: PREVIEW_COLORS.mutedText }}
            >
              No solution provided
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Reserved heights ─────────────────────────────────────────────────────────
const SOLUTIONS_RESERVED_FIRST: Record<ColumnCount, number> = {
  1: 440,
  2: 420,
  3: 410,
};
const SOLUTIONS_RESERVED_OTHER: Record<ColumnCount, number> = {
  1: 125,
  2: 120,
  3: 115,
};

// ─── Main export ──────────────────────────────────────────────────────────────
export const AnswerKeyPreview = React.forwardRef<HTMLDivElement, AnswerKeyPreviewProps>(
  ({ paper, columns = 2, fontSize = 11, active = true }, ref) => {
    const showHi = paper.metadata.language !== 'en';
    const showEn = paper.metadata.language !== 'hi';

    const sizes = getAnswerSizes(fontSize);

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
          });
        });
      });
      return out;
    }, [paper.sections]);

    const blockIds = rows.map((r) => r.id);
    const byId = useMemo(() => {
      const m = new Map<string, FlatAnswerRow>();
      rows.forEach((r) => m.set(r.id, r));
      return m;
    }, [rows]);

    const measureRef = useRef<HTMLDivElement>(null!);
    const rootRef = useRef<HTMLDivElement>(null!);

    const setRootRef = (node: HTMLDivElement | null) => {
      rootRef.current = node as HTMLDivElement;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    const SECTION_HEADER_EXTRA_PX = 26;
    const firstRowId = rows[0]?.id;
    const getExtraHeightBefore = (id: string) => {
      const row = byId.get(id);
      if (!row) return 0;
      if (row.isFirstInSection && row.sectionTitleEn && id !== firstRowId) {
        return SECTION_HEADER_EXTRA_PX;
      }
      return 0;
    };

    const getForcesNewRow = (id: string) => {
      const row = byId.get(id);
      if (!row) return false;
      return row.isFirstInSection && !!row.sectionTitleEn && id !== firstRowId;
    };

    const measuredPages = useAutoPaginate(blockIds, measureRef, {
      reservedFirstPagePx: SOLUTIONS_RESERVED_FIRST[columns],
      reservedOtherPagePx: SOLUTIONS_RESERVED_OTHER[columns],
      columns,
      fontSize,
      active,
      extraHeightBefore: getExtraHeightBefore,
      forcesNewRow: getForcesNewRow,
    });

    // Safety-net pass: after real pages render, fix any solution block that
    // still visually overlaps the footer by bumping it to the next page.
    const solutionPages = useOverflowCorrection(measuredPages, rootRef, {
      pageSelector: '[data-content-page="true"]',
      footerSelector: '[data-page-footer="true"]',
      blockAttr: 'data-block-id',
    });

    return (
      <div ref={setRootRef} className="flex flex-col items-center gap-6">
        {/*
          Measurement container: position:fixed + top:-9999px so it's truly
          off-screen and not clipped by any ancestor's overflow:hidden or
          zero-width box. This ensures getBoundingClientRect() returns real
          heights for each solution block.
        */}
        <div
          aria-hidden
          data-pdf-ignore="true"
          style={{
            position: 'fixed',
            top: '-9999px',
            left: '-9999px',
            visibility: 'hidden',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <div
            ref={measureRef}
            style={{
              ...GRID_STYLE[columns],
              gap: '0 20px',
              width: 718,
            }}
          >
            {rows.map((row) => (
              <div key={row.id} data-block-id={row.id}>
                <SolutionBlock
                  row={row}
                  showEn={showEn}
                  showHi={showHi}
                  columns={columns}
                  fontSize={fontSize}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Pages */}
        {solutionPages.map((pageBlockIds, pageIndex) => (
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
            {/* ── Page 1: doc header + answer grid + solutions heading ── */}
            {pageIndex === 0 && (
              <>
                <div
                  className="mb-4 border-b-2 pb-2 text-center"
                  style={{ borderColor: PREVIEW_COLORS.pageText }}
                >
                  <h1 className="text-base font-bold uppercase">Answer Key &amp; Solutions</h1>
                  {showEn && paper.metadata.organisation && (
                    <p
                      className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide"
                      style={{ color: PREVIEW_COLORS.quaternaryText }}
                    >
                      {paper.metadata.organisation}
                    </p>
                  )}
                  {showHi && paper.metadata.organisationHi && (
                    <p
                      className="font-devanagari text-[10.5px] font-semibold"
                      style={{ color: PREVIEW_COLORS.quaternaryText }}
                    >
                      {paper.metadata.organisationHi}
                    </p>
                  )}
                  {showEn && paper.metadata.examTitle && (
                    <p className="text-[12px]" style={{ color: PREVIEW_COLORS.tertiaryText }}>
                      {paper.metadata.examTitle}
                    </p>
                  )}
                  {showHi && paper.metadata.examTitleHi && (
                    <p
                      className="font-devanagari text-[12px]"
                      style={{ color: PREVIEW_COLORS.tertiaryText }}
                    >
                      {paper.metadata.examTitleHi}
                    </p>
                  )}

                  {/* Identifying strip: code · set/series · date · duration · marks */}
                  <div
                    className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[9.5px]"
                    style={{ color: PREVIEW_COLORS.mutedText }}
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
                  className="mb-3 border-b pb-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    borderColor: PREVIEW_COLORS.ruleStrong,
                    color: PREVIEW_COLORS.quaternaryText,
                  }}
                >
                  Solutions
                </div>
              </>
            )}

            {/* ── Running header pages 2+ ── */}
            {pageIndex > 0 && (
              <div
                className="mb-3 flex items-center justify-between border-b pb-1 text-[10px] font-medium"
                style={{ borderColor: PREVIEW_COLORS.ruleStrong }}
              >
                <span>Solutions — {paper.metadata.examTitle}</span>
                <span>{paper.metadata.examCode}</span>
              </div>
            )}

            {/* ── Solutions grid ── */}
            <div style={{ ...GRID_STYLE[columns], gap: '0 20px' }}>
              {pageBlockIds.map((id) => {
                const row = byId.get(id);
                if (!row) return null;
                return (
                  <React.Fragment key={id}>
                    {row.isFirstInSection && row.sectionTitleEn && (
                      <div
                        style={{
                          ...COL_SPAN_ALL,
                          borderBottom: `1px solid ${PREVIEW_COLORS.ruleSoft}`,
                          color: PREVIEW_COLORS.quaternaryText,
                          marginTop: '6px',
                          marginBottom: '6px',
                          paddingBottom: '2px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {row.sectionTitleEn}
                      </div>
                    )}
                    <SolutionBlock
                      row={row}
                      showEn={showEn}
                      showHi={showHi}
                      columns={columns}
                      fontSize={fontSize}
                    />
                  </React.Fragment>
                );
              })}
            </div>

            {/* Page footer */}
            <div
              data-page-footer="true"
              className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-9 text-[9px]"
              style={{ color: PREVIEW_COLORS.mutedText }}
            >
              <span>Custom PDF Creator — Answer Key</span>
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
