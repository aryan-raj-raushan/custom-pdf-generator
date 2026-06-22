// components/preview/AnswerKeyPreview.tsx
"use client";

import React, { useMemo } from "react";
import { ExamPaper } from "@/types/exam";
import { MathText } from "@/lib/renderMath";

interface AnswerKeyPreviewProps {
  paper: ExamPaper;
}

interface FlatAnswerRow {
  number: number;
  letter?: string;
  optionText?: string;
  solutionEn?: string;
  solutionHi?: string;
  sectionTitleEn?: string;
  isFirstInSection: boolean;
}

const A4_WIDTH_PX = 794;

export const AnswerKeyPreview = React.forwardRef<HTMLDivElement, AnswerKeyPreviewProps>(({ paper }, ref) => {
  const showHi = paper.metadata.language !== "en";
  const showEn = paper.metadata.language !== "hi";

  const rows: FlatAnswerRow[] = useMemo(() => {
    let n = 0;
    const out: FlatAnswerRow[] = [];
    paper.sections.forEach((section) => {
      section.questions.forEach((q, qi) => {
        n += 1;
        const correctOption = q.options?.find((o) => o.isCorrect);
        const letterIndex = q.options?.findIndex((o) => o.isCorrect) ?? -1;
        out.push({
          number: n,
          letter: q.correctAnswerLetter ?? (letterIndex >= 0 ? String.fromCharCode(65 + letterIndex) : undefined),
          optionText: correctOption ? correctOption.textEn || correctOption.textHi : undefined,
          solutionEn: q.solutionEn,
          solutionHi: q.solutionHi,
          sectionTitleEn: qi === 0 ? section.titleEn : undefined,
          isFirstInSection: qi === 0,
        });
      });
    });
    return out;
  }, [paper.sections]);

  // Simple single-column flow for the answer key — split into A4 pages by a
  // generous fixed row budget rather than exact measurement, since answer
  // key rows are short and uniform compared to full question blocks.
  const ROWS_PER_PAGE_FIRST = 14;
  const ROWS_PER_PAGE_OTHER = 17;

  const pages: FlatAnswerRow[][] = useMemo(() => {
    const result: FlatAnswerRow[][] = [];
    let i = 0;
    let first = true;
    while (i < rows.length) {
      const size = first ? ROWS_PER_PAGE_FIRST : ROWS_PER_PAGE_OTHER;
      result.push(rows.slice(i, i + size));
      i += size;
      first = false;
    }
    if (result.length === 0) result.push([]);
    return result;
  }, [rows]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-6">
      {pages.map((pageRows, pageIndex) => (
        <div
          key={pageIndex}
          className="answer-key-page relative bg-white text-black shadow-md"
          style={{
            width: A4_WIDTH_PX,
            minHeight: 1123,
            padding: "34px 38px 44px",
            fontFamily: "var(--font-paper, 'Tinos', 'Times New Roman', serif)",
          }}
        >
          {pageIndex === 0 && (
            <div className="mb-4 border-b-2 border-black pb-2 text-center">
              <h1 className="text-base font-bold uppercase">Answer Key & Solutions</h1>
              {showEn && paper.metadata.examTitle && <p className="text-[12px] text-stone-600">{paper.metadata.examTitle}</p>}
              {showHi && paper.metadata.examTitleHi && (
                <p className="font-devanagari text-[12px] text-stone-600">{paper.metadata.examTitleHi}</p>
              )}
              {paper.metadata.examCode && <p className="text-[10px] text-stone-400">{paper.metadata.examCode}</p>}
            </div>
          )}
          {pageIndex > 0 && (
            <div className="mb-3 flex items-center justify-between border-b border-black/60 pb-1 text-[10px] font-medium">
              <span>Answer Key & Solutions — {paper.metadata.examTitle}</span>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {pageRows.map((row) => (
              <div key={row.number} className="break-inside-avoid">
                {row.isFirstInSection && row.sectionTitleEn && (
                  <div className="mb-1 mt-1.5 border-b border-black/40 pb-0.5 text-[10.5px] font-bold uppercase tracking-wide text-stone-700">
                    {row.sectionTitleEn}
                  </div>
                )}
                <div className="flex gap-2 text-[11px] leading-snug">
                  <span className="flex h-5 w-6 shrink-0 items-center justify-center rounded bg-stone-100 text-[10px] font-bold">
                    {row.number}
                  </span>
                  <div className="flex-1">
                    <p>
                      <span className="font-semibold">Answer: </span>
                      {row.letter ? (
                        <span className="font-bold text-emerald-700">
                          ({row.letter}){row.optionText ? ` ${row.optionText}` : ""}
                        </span>
                      ) : (
                        <span className="italic text-stone-400">Not specified</span>
                      )}
                    </p>
                    {(row.solutionEn || row.solutionHi) && (
                      <p className="mt-0.5 text-stone-600">
                        <span className="font-semibold text-stone-700">Solution: </span>
                        {row.solutionEn && <MathText text={row.solutionEn} />}
                        {row.solutionHi && (
                          <span className="font-devanagari block text-[10px]">
                            <MathText text={row.solutionHi} />
                          </span>
                        )}
                      </p>
                    )}
                    {!row.solutionEn && !row.solutionHi && (
                      <p className="mt-0.5 text-[10px] italic text-stone-400">No solution provided</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-9 text-[9px] text-stone-400">
            <span>Custom PDF Creator — Answer Key</span>
            <span>
              Page {pageIndex + 1} of {pages.length}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});

AnswerKeyPreview.displayName = "AnswerKeyPreview";

export default AnswerKeyPreview;