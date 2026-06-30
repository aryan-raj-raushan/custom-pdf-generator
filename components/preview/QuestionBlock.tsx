// components/preview/QuestionBlock.tsx
'use client';

import React from 'react';
import { Question, ExamMetadata } from '@/types/exam';
import { PREVIEW_COLORS } from '@/lib/previewTheme';
import { MathText } from '@/lib/renderMath';
import { ColumnCount } from './A4Preview';
import { FONT_SIZE_DEFAULT } from './PreviewPanel';

interface QuestionBlockProps {
  question: Question;
  number: number;
  metadata: ExamMetadata;
  isHighlighted?: boolean;
  showFlagIndicator?: boolean;
  columns?: ColumnCount;
  fontSize?: number;
}

/**
 * Derive the actual rendered font size in px for a given column count and
 * user-chosen base font size.
 *
 * The original hardcoded values were:
 *   1-col: 12px question / 11.5px option
 *   2-col: 11px question / 10.5px option   ← these are the "default" (fontSize=11)
 *   3-col: 10px question / 9.5px option
 *
 * We keep the column-based reduction (-1px per extra column) and then shift
 * the whole scale up/down relative to the default (11px) base.
 */
function deriveTextSizes(
  columns: ColumnCount,
  fontSize: number,
): { question: number; option: number } {
  const delta = fontSize - FONT_SIZE_DEFAULT; // how many px above/below default
  const colOffset: Record<ColumnCount, number> = { 1: 1, 2: 0, 3: -1 };
  const base = fontSize + colOffset[columns];
  return {
    question: base + delta * 0, // base already has delta folded in via `fontSize`
    option: base - 0.5, // options always 0.5px smaller than question text
  };
}

export const QuestionBlock = React.forwardRef<HTMLDivElement, QuestionBlockProps>(
  (
    {
      question,
      number,
      metadata,
      isHighlighted,
      showFlagIndicator,
      columns = 2,
      fontSize = FONT_SIZE_DEFAULT,
    },
    ref,
  ) => {
    const showHi = metadata.language !== 'en';
    const showEn = metadata.language !== 'hi';
    const marks = question.marks ?? metadata.marksPerQuestion ?? 1;
    const hasFlags = (question.importFlags?.length ?? 0) > 0;

    const { question: qSize, option: oSize } = deriveTextSizes(columns, fontSize);

    // In 3-col mode, options go single-column to avoid being unreadable
    const optionGrid =
      columns === 3 ? 'grid-cols-1' : columns === 1 ? 'grid-cols-2 gap-x-4' : 'grid-cols-2 gap-x-2';

    return (
      <div
        ref={ref}
        data-question-id={question.id}
        className="break-inside-avoid pb-2.5 leading-snug transition-colors"
        style={{
          fontSize: `${qSize}px`,
          ...(isHighlighted
            ? {
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                outline: '2px solid rgba(245, 158, 11, 0.6)',
                outlineOffset: '2px',
              }
            : undefined),
        }}
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
              <div style={{ whiteSpace: 'pre-line' }}>
                {question.hasMath ? <MathText text={question.textEn} /> : question.textEn}
                <span className="ml-1 font-medium" style={{ color: PREVIEW_COLORS.secondaryText }}>
                  [{marks}]
                </span>
              </div>
            )}
            {showHi && question.textHi && (
              <div
                className="font-devanagari"
                style={{ whiteSpace: 'pre-line', color: PREVIEW_COLORS.quaternaryText }}
              >
                {question.hasMath ? <MathText text={question.textHi} /> : question.textHi}
              </div>
            )}

            {question.type === 'assertion_reason' && (
              <div className="mt-1 flex flex-col gap-0.5">
                {(question.assertionEn || question.assertionHi) && (
                  <p>
                    <span className="font-semibold">Assertion (A): </span>
                    {showEn &&
                      question.assertionEn &&
                      (question.hasMath ? (
                        <MathText text={question.assertionEn} />
                      ) : (
                        question.assertionEn
                      ))}
                    {showHi && question.assertionHi && (
                      <span
                        className="font-devanagari block"
                        style={{ color: PREVIEW_COLORS.quaternaryText }}
                      >
                        {question.hasMath ? (
                          <MathText text={question.assertionHi} />
                        ) : (
                          question.assertionHi
                        )}
                      </span>
                    )}
                  </p>
                )}
                {(question.reasonEn || question.reasonHi) && (
                  <p>
                    <span className="font-semibold">Reason (R): </span>
                    {showEn &&
                      question.reasonEn &&
                      (question.hasMath ? (
                        <MathText text={question.reasonEn} />
                      ) : (
                        question.reasonEn
                      ))}
                    {showHi && question.reasonHi && (
                      <span
                        className="font-devanagari block"
                        style={{ color: PREVIEW_COLORS.quaternaryText }}
                      >
                        {question.hasMath ? (
                          <MathText text={question.reasonHi} />
                        ) : (
                          question.reasonHi
                        )}
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}

            {question.imageDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={question.imageDataUrl} alt="" className="my-1 max-h-24 object-contain" />
            )}

            {(question.type === 'mcq' || question.type === 'assertion_reason') &&
              question.options && (
                <div className={`mt-1 grid ${optionGrid} gap-y-0.5`}>
                  {question.options.map((opt, i) => (
                    <div key={opt.id} className="flex gap-1">
                      <span className="font-semibold" style={{ fontSize: `${oSize}px` }}>
                        ({String.fromCharCode(97 + i)})
                      </span>
                      <div style={{ fontSize: `${oSize}px` }}>
                        {showEn && (
                          <span>
                            {question.hasMath ? <MathText text={opt.textEn} /> : opt.textEn}
                          </span>
                        )}
                        {showHi && opt.textHi && (
                          <span
                            className="font-devanagari block"
                            style={{
                              color: PREVIEW_COLORS.tertiaryText,
                              fontSize: `${oSize - 0.5}px`,
                            }}
                          >
                            {question.hasMath ? <MathText text={opt.textHi} /> : opt.textHi}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {(question.type === 'short' || question.type === 'long') && (
              <div className="mt-1.5 flex flex-col gap-2.5">
                {Array.from({
                  length: question.answerSpaceLines ?? 3,
                }).map((_, i) => (
                  <span
                    key={i}
                    className="block border-b border-dotted"
                    style={{ borderColor: PREVIEW_COLORS.ruleSoft }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

QuestionBlock.displayName = 'QuestionBlock';

export default QuestionBlock;
