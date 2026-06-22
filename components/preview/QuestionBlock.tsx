// components/preview/QuestionBlock.tsx
"use client";

import React from "react";
import { Question, ExamMetadata } from "@/types/exam";
import { PREVIEW_COLORS } from "@/lib/previewTheme";
import { MathText } from "@/lib/renderMath";

interface QuestionBlockProps {
  question: Question;
  number: number;
  metadata: ExamMetadata;
  isHighlighted?: boolean;
  showFlagIndicator?: boolean;
}

export const QuestionBlock = React.forwardRef<HTMLDivElement, QuestionBlockProps>(
  ({ question, number, metadata, isHighlighted, showFlagIndicator }, ref) => {
    const showHi = metadata.language !== "en";
    const showEn = metadata.language !== "hi";
    const marks = question.marks ?? metadata.marksPerQuestion ?? 1;
    const hasFlags = (question.importFlags?.length ?? 0) > 0;

    return (
      <div
        ref={ref}
        data-question-id={question.id}
        className="break-inside-avoid pb-2.5 text-[11px] leading-snug transition-colors"
        style={
          isHighlighted
            ? { backgroundColor: "rgba(245, 158, 11, 0.12)", outline: "2px solid rgba(245, 158, 11, 0.6)", outlineOffset: "2px" }
            : undefined
        }
      >
        <div className="flex gap-1.5">
          <span className="shrink-0 font-bold">
            {number}.
            {showFlagIndicator && hasFlags && (
              <span
                title="This question was imported with unresolved issues"
                className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full align-super"
                style={{ backgroundColor: PREVIEW_COLORS.warningFill }}
              />
            )}
          </span>
          <div className="flex-1">
            {showEn && question.textEn && (
              <p>
                {question.hasMath ? <MathText text={question.textEn} /> : question.textEn}
                <span className="ml-1 font-medium" style={{ color: PREVIEW_COLORS.secondaryText }}>
                  [{marks}]
                </span>
              </p>
            )}
            {showHi && question.textHi && (
              <p className="font-devanagari" style={{ color: PREVIEW_COLORS.quaternaryText }}>
                {question.hasMath ? <MathText text={question.textHi} /> : question.textHi}
              </p>
            )}

            {question.imageDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={question.imageDataUrl} alt="" className="my-1 max-h-24 object-contain" />
            )}

            {question.type === "mcq" && question.options && (
              <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
                {question.options.map((opt, i) => (
                  <div key={opt.id} className="flex gap-1">
                    <span className="font-semibold">({String.fromCharCode(97 + i)})</span>
                    <div>
                      {showEn && (
                        <span>{question.hasMath ? <MathText text={opt.textEn} /> : opt.textEn}</span>
                      )}
                      {showHi && opt.textHi && (
                        <span
                          className="font-devanagari block text-[10px]"
                          style={{ color: PREVIEW_COLORS.tertiaryText }}
                        >
                          {question.hasMath ? <MathText text={opt.textHi} /> : opt.textHi}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(question.type === "short" || question.type === "long") && (
              <div className="mt-1.5 flex flex-col gap-2.5">
                {Array.from({ length: question.answerSpaceLines ?? 3 }).map((_, i) => (
                  <span key={i} className="block border-b border-dotted" style={{ borderColor: PREVIEW_COLORS.ruleSoft }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

QuestionBlock.displayName = "QuestionBlock";

export default QuestionBlock;
