// components/preview/PaperHeader.tsx
"use client";

import React from "react";
import { ExamMetadata } from "@/types/exam";

export function PaperHeader({ metadata }: Readonly<{ metadata: ExamMetadata }>) {
  const showHi = metadata.language !== "en";
  const showEn = metadata.language !== "hi";

  return (
    <div className="select-none border-b-2 border-black pb-2">
      {/* Top strip: emblem, org name, set code */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {metadata.logoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={metadata.logoDataUrl} alt="" className="h-12 w-12 object-contain" />
          )}
          <div>
            {showEn && metadata.organisation && (
              <p className="text-[13px] font-bold uppercase leading-tight tracking-wide">{metadata.organisation}</p>
            )}
            {showHi && metadata.organisationHi && (
              <p className="font-devanagari text-[13px] font-bold leading-tight">{metadata.organisationHi}</p>
            )}
          </div>
        </div>
        <div className="text-right text-[10px] leading-tight">
          {metadata.examCode && <p className="font-semibold">{metadata.examCode}</p>}
          {metadata.setCode && (
            <p className="mt-0.5 inline-block rounded border border-black px-1.5 py-0.5 font-bold">
              SET — {metadata.setCode}
            </p>
          )}
        </div>
      </div>

      {/* Exam title */}
      <div className="mt-2 text-center">
        {showEn && metadata.examTitle && <h1 className="text-[15px] font-bold uppercase">{metadata.examTitle}</h1>}
        {showHi && metadata.examTitleHi && <h2 className="font-devanagari text-[14px] font-bold">{metadata.examTitleHi}</h2>}
      </div>

      {/* Meta strip: duration / marks / date */}
      <div className="mt-2 flex items-center justify-between border-y border-black/70 py-1 text-[10.5px] font-medium">
        <span>
          Time: <strong>{metadata.duration}</strong>
        </span>
        <span>
          Date: <strong>{metadata.date ? formatDate(metadata.date) : "—"}</strong>
        </span>
        <span>
          Max. Marks: <strong>{metadata.maxMarks}</strong>
        </span>
      </div>

      {/* Candidate boxes */}
      {(metadata.rollNoLabel || metadata.candidateNameLabel) && (
        <div className="mt-2 flex items-stretch gap-3 text-[10.5px]">
          {metadata.rollNoLabel && (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">Roll No.</span>
              <div className="flex">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span key={i} className="h-5 w-4 border border-black/60" />
                ))}
              </div>
            </div>
          )}
          {metadata.candidateNameLabel && (
            <div className="flex flex-1 items-end gap-1.5">
              <span className="shrink-0 font-semibold">Candidate Name</span>
              <span className="flex-1 border-b border-dotted border-black/60" />
            </div>
          )}
        </div>
      )}

      {/* Negative marking note */}
      {metadata.negativeMarking?.enabled && (
        <p className="mt-1.5 text-center text-[10px] font-medium italic">
          Note: {metadata.negativeMarking.value} marks will be deducted for each wrong answer.
          {showHi && (
            <span className="font-devanagari">
              {" "}
              प्रत्येक गलत उत्तर के लिए {metadata.negativeMarking.value} अंक काटे जाएंगे।
            </span>
          )}
        </p>
      )}
    </div>
  );
}

export function InstructionsBlock({ metadata }: Readonly<{ metadata: ExamMetadata }>) {
  const showHi = metadata.language !== "en";
  const showEn = metadata.language !== "hi";

  if (metadata.generalInstructions.length === 0) return null;

  return (
    <div className="mt-2 border border-black/70 p-2 text-[10px] leading-snug">
      <p className="mb-1 text-center text-[10.5px] font-bold uppercase">
        General Instructions{showHi ? " / सामान्य निर्देश" : ""}
      </p>
      <ol className="list-decimal space-y-0.5 pl-4">
        {metadata.generalInstructions.map((ins, i) => (
          <li key={i}>
            {showEn && <span>{ins}</span>}
            {showHi && metadata.generalInstructionsHi?.[i] && (
              <span className="font-devanagari block text-[9.5px] text-stone-700">
                {metadata.generalInstructionsHi[i]}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}