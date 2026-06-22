// components/preview/PreviewPanel.tsx
"use client";

import React, { useEffect, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, FileText, KeyRound } from "lucide-react";
import { ExamPaper } from "@/types/exam";
import { A4Preview } from "./A4Preview";
import { AnswerKeyPreview } from "./AnswerKeyPreview";

interface PreviewPanelProps {
  paper: ExamPaper;
  previewRef: React.RefObject<HTMLDivElement>;
  answerKeyRef: React.RefObject<HTMLDivElement>;
  highlightedQuestionId?: string | null;
  /** Bumped by the parent every time a jump-to-question is requested, so we can react even if the id is unchanged from last time */
  jumpToken?: number;
}

const ZOOM_STEPS = [0.5, 0.6, 0.75, 0.85, 1];

export function PreviewPanel({ paper, previewRef, answerKeyRef, highlightedQuestionId, jumpToken }: PreviewPanelProps) {
  const [zoomIndex, setZoomIndex] = useState(2); // default 0.75
  const [mode, setMode] = useState<"paper" | "answerKey">("paper");
  const zoom = ZOOM_STEPS[zoomIndex];

  // When a jump is requested, switch to the paper view (questions live
  // there, not the answer key) and scroll the target question into view
  // once it's rendered. Pagination is async (measured via rAF), so we poll
  // briefly rather than assuming the node exists on the next tick.
  useEffect(() => {
    if (!highlightedQuestionId || jumpToken === undefined) return;
    setMode("paper");

    let attempts = 0;
    const tryScroll = () => {
      attempts += 1;
      const node = previewRef.current?.querySelector<HTMLElement>(`[data-question-id="${highlightedQuestionId}"]`);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (attempts < 20) requestAnimationFrame(tryScroll);
    };
    requestAnimationFrame(tryScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToken]);

  return (
    <div className="flex h-full flex-col bg-stone-100">
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("paper")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${mode === "paper" ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-100"
              }`}
          >
            <FileText size={13} /> Question paper
          </button>
          <button
            type="button"
            onClick={() => setMode("answerKey")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${mode === "answerKey" ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-100"
              }`}
          >
            <KeyRound size={13} /> Answer key
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <ZoomOut size={14} />
          </button>
          <span className="w-10 text-center text-xs text-stone-500">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoomIndex(ZOOM_STEPS.length - 1)}
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            title="Reset zoom"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-8">
        {/* Both previews stay mounted (display:none when inactive) so their
            refs remain valid for PDF export regardless of which tab is
            currently visible — switching tabs shouldn't block exporting
            the other document. */}
        <div style={{ display: mode === "paper" ? "block" : "none" }}>
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out",
            }}
          >
            <A4Preview ref={previewRef} paper={paper} highlightedQuestionId={highlightedQuestionId} />
          </div>
        </div>
        <div style={{ display: mode === "answerKey" ? "block" : "none" }}>
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out",
            }}
          >
            <AnswerKeyPreview ref={answerKeyRef} paper={paper} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreviewPanel;