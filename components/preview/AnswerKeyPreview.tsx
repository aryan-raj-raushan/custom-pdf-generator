'use client';

import React, { useMemo, useRef } from 'react';
import { PREVIEW_COLORS } from '@/lib/previewTheme';
import { MathText } from '@/lib/renderMath';
import { ExamPaper } from '@/types/exam';
import { ColumnCount, PageWatermark } from './A4Preview';
import { useRenderedColumnPagination } from '@/lib/usePagination';

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
    examCode: 10 + delta * 0.8,
    sectionHeader: 10 + delta,
    solutionText: fontSize,
    answerGridNumber: 9 + delta * 0.7,
    answerGridLetter: 9.5 + delta * 0.7,
    footer: Math.max(8, 9 + delta * 0.5),
    runningHeader: Math.max(9, 10 + delta * 0.5),
  };
}

function InlineSolutionRun({
  text,
  className,
  continuationClassName,
  continuationStyle,
}: Readonly<{
  text: string;
  className?: string;
  continuationClassName?: string;
  continuationStyle?: React.CSSProperties;
}>) {
  const [firstLine, ...rest] = text.split('\n');
  return (
    <>
      <span className={className}>
        <MathText text={firstLine} />
      </span>
      {rest.length > 0 && (
        <span className={continuationClassName ?? 'block'} style={continuationStyle}>
          {rest.map((line, index) => (
            <React.Fragment key={`${line}-${index}`}>
              {index > 0 && <br />}
              <MathText text={line} className={className} />
            </React.Fragment>
          ))}
        </span>
      )}
    </>
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

function SolutionBlock({
  row,
  showEn,
  showHi,
  columns,
  fontSize,
}: Readonly<{
  row: FlatAnswerRow;
  showEn: boolean;
  showHi: boolean;
  columns: ColumnCount;
  fontSize: number;
}>) {
  const hasSolution = row.solutionEn || row.solutionHi;
  const actualFontSize = columns === 1 ? fontSize : columns === 3 ? fontSize + 1 : fontSize + 2;

  return (
    <div
      className="break-inside-avoid pb-2.5 leading-snug"
      style={{ fontSize: `${actualFontSize}px` }}
      data-block-id={row.id}
    >
      <div className="flex gap-1.5">
        <span
          className="flex h-6 w-7 shrink-0 items-center justify-center rounded text-[11px] font-bold"
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
            <div className="mt-0.5" style={{ color: PREVIEW_COLORS.tertiaryText }}>
              <span className="font-semibold" style={{ color: PREVIEW_COLORS.quaternaryText }}>
                Solution:{' '}
              </span>
              {showEn && row.solutionEn && <InlineSolutionRun text={row.solutionEn} />}
              {showHi && row.solutionHi && (
                <InlineSolutionRun
                  text={row.solutionHi}
                  className="font-devanagari"
                  continuationClassName="font-devanagari block mt-0.5"
                  continuationStyle={{ fontSize: `${actualFontSize}px` }}
                />
              )}
            </div>
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

export const AnswerKeyPreview = React.forwardRef<HTMLDivElement, AnswerKeyPreviewProps>(
  ({ paper, columns = 2, fontSize = 11, active = true, hideSolutions = false }, ref) => {
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

    const blockIds = useMemo(() => rows.map((row) => row.id), [rows]);
    const byId = useMemo(() => {
      const m = new Map<string, FlatAnswerRow>();
      rows.forEach((row) => m.set(row.id, row));
      return m;
    }, [rows]);

    const rootRef = useRef<HTMLDivElement>(null!);
    const setRootRef = (node: HTMLDivElement | null) => {
      rootRef.current = node as HTMLDivElement;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    const solutionPages = useRenderedColumnPagination(blockIds, rootRef, {
      pageSelector: '[data-content-page="true"]',
      footerSelector: '[data-page-footer="true"]',
      columnSelector: '[data-flow-column="true"]',
      blockAttr: 'data-block-id',
      columns,
      active: active && !hideSolutions,
    });

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
              <h1 className="text-base font-bold uppercase">Answer Key</h1>
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
              data-page-footer="true"
              className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-9 text-[9px]"
              style={{ color: PREVIEW_COLORS.mutedText }}
            >
              <span>Test PDF - Answer Key</span>
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

            {pageIndex > 0 && (
              <div
                className="mb-3 flex items-center justify-between border-b pb-1 text-[10px] font-medium"
                style={{ borderColor: PREVIEW_COLORS.ruleStrong }}
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
                    const row = byId.get(id);
                    if (!row) return null;

                    return (
                      <React.Fragment key={id}>
                        {row.isFirstInSection && row.sectionTitleEn && (
                          <div
                            style={{
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
              ))}
            </div>

            <div
              data-page-footer="true"
              className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-9 text-[9px]"
              style={{ color: PREVIEW_COLORS.mutedText }}
            >
              <span>Test PDF - Answer Key</span>
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
