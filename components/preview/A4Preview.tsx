// components/preview/A4Preview.tsx
"use client";

import React, { useMemo, useRef } from "react";
import { ExamPaper, Question } from "@/types/exam";
import { PREVIEW_COLORS } from "@/lib/previewTheme";
import { PaperHeader, InstructionsBlock } from "./PaperHeader";
import { QuestionBlock } from "./QuestionBlock";
import { useAutoPaginate } from "@/lib/usePagination";

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
}

// Reserved vertical px budget (at 96dpi, A4 height ≈ 1123px) for chrome on
// each page. Page 1 carries the full header + instructions; later pages
// just carry the running header.
const RESERVED_FIRST_PAGE = 430;
const RESERVED_OTHER_PAGE = 90;

export const A4Preview = React.forwardRef<HTMLDivElement, A4PreviewProps>(({ paper, highlightedQuestionId }, ref) => {
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
    reservedFirstPagePx: RESERVED_FIRST_PAGE,
    reservedOtherPagePx: RESERVED_OTHER_PAGE,
  });

  const byId = useMemo(() => {
    const m = new Map<string, FlatQuestion>();
    flatQuestions.forEach((f) => m.set(f.blockId, f));
    return m;
  }, [flatQuestions]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-6">
      {/* Hidden measurement pass: render every question block off-screen, at
          the same column width as the real two-column layout, so heights
          are accurate before we decide pagination. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none fixed left-[-9999px] top-0 grid grid-cols-2 gap-x-5"
        style={{ width: 718 }}
      >
        {flatQuestions.map((f) => (
          <div key={f.blockId} data-block-id={f.blockId}>
            <QuestionBlock question={f.question} number={f.number} metadata={paper.metadata} />
          </div>
        ))}
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

          <div className="mt-2.5 grid grid-cols-2 gap-x-5 gap-y-0">
            {pageBlockIds.map((id) => {
              const f = byId.get(id);
              if (!f) return null;
              return (
                <React.Fragment key={id}>
                  {f.isFirstInSection && f.sectionTitleEn && (
                    <div
                      className="col-span-2 -mb-1 mt-1 border-b pb-0.5 text-[11px] font-bold uppercase tracking-wide"
                      style={{ borderColor: PREVIEW_COLORS.ruleMedium }}
                    >
                      {f.sectionTitleEn}
                      {paper.metadata.language !== "en" && f.sectionTitleHi && (
                        <span className="font-devanagari ml-2 font-normal normal-case">{f.sectionTitleHi}</span>
                      )}
                    </div>
                  )}
                  <QuestionBlock
                    question={f.question}
                    number={f.number}
                    metadata={paper.metadata}
                    isHighlighted={f.blockId === highlightedQuestionId}
                    showFlagIndicator
                  />
                </React.Fragment>
              );
            })}
          </div>
        </Page>
      ))}
    </div>
  );
});

A4Preview.displayName = "A4Preview";

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
        padding: "34px 38px 44px",
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

function RunningHeader({ metadata }: Readonly<{ metadata: ExamPaper["metadata"] }>) {
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
