// components/preview/PreviewPanel.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  KeyRound,
  Columns2,
  Minus,
  Plus,
  Type,
} from "lucide-react";
import { ExamPaper } from "@/types/exam";
import { A4Preview, ColumnCount } from "./A4Preview";
import { AnswerKeyPreview } from "./AnswerKeyPreview";

interface PreviewPanelProps {
  paper: ExamPaper;
  previewRef: React.RefObject<HTMLDivElement>;
  answerKeyRef: React.RefObject<HTMLDivElement>;
  highlightedQuestionId?: string | null;
  jumpToken?: number;
  /** Called when the user changes the column selector */
  onColumnsChange?: (columns: ColumnCount) => void;
  /** Called when the user changes font size */
  onFontSizeChange?: (fontSize: number) => void;
}

const ZOOM_STEPS = [0.5, 0.6, 0.75, 0.85, 1];

const COLUMN_OPTIONS: { value: ColumnCount; label: string; title: string }[] = [
  { value: 1, label: "1", title: "Single column" },
  { value: 2, label: "2", title: "Two columns" },
  { value: 3, label: "3", title: "Three columns" },
];

export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 16;
export const FONT_SIZE_DEFAULT = 11;

export function PreviewPanel({
  paper,
  previewRef,
  answerKeyRef,
  highlightedQuestionId,
  jumpToken,
  onColumnsChange,
  onFontSizeChange,
}: Readonly<PreviewPanelProps>) {
  const [zoomIndex, setZoomIndex] = useState(2); // default 0.75
  const [mode, setMode] = useState<"paper" | "answerKey">("paper");

  const [columns, setColumns] = useState<ColumnCount>(
    (paper.metadata.columns ?? 2) as ColumnCount,
  );

  const [fontSize, setFontSize] = useState<number>(
    paper.metadata.fontSize ?? FONT_SIZE_DEFAULT,
  );

  // Sync if a different paper is loaded
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColumns((paper.metadata.columns ?? 2) as ColumnCount);
  }, [paper.metadata.columns]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFontSize(paper.metadata.fontSize ?? FONT_SIZE_DEFAULT);
  }, [paper.metadata.fontSize]);

  const zoom = ZOOM_STEPS[zoomIndex];

  function handleColumnsChange(value: ColumnCount) {
    setColumns(value);
    onColumnsChange?.(value);
  }

  function handleFontSizeChange(value: number) {
    const clamped = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, value));
    setFontSize(clamped);
    onFontSizeChange?.(clamped);
  }

  function handleFontSizeInput(e: React.ChangeEvent<HTMLInputElement>) {
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed)) handleFontSizeChange(parsed);
  }

  useEffect(() => {
    if (!highlightedQuestionId || jumpToken === undefined) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode("paper");

    let attempts = 0;
    const tryScroll = () => {
      attempts += 1;
      const node = previewRef.current?.querySelector<HTMLElement>(
        `[data-question-id="${highlightedQuestionId}"]`,
      );
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
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-2.5">
        {/* Left: mode switcher */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("paper")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${mode === "paper"
                ? "bg-stone-900 text-white"
                : "text-stone-500 hover:bg-stone-100"
              }`}
          >
            <FileText size={13} /> Question paper
          </button>
          <button
            type="button"
            onClick={() => setMode("answerKey")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${mode === "answerKey"
                ? "bg-stone-900 text-white"
                : "text-stone-500 hover:bg-stone-100"
              }`}
          >
            <KeyRound size={13} /> Answer key
          </button>
        </div>

        {/* Centre: column selector + font size */}
        <div className="flex items-center gap-4">
          {/* Column selector */}
          <div className="flex items-center gap-1.5">
            <Columns2 size={13} className="text-stone-400" />
            <span className="text-[11px] text-stone-400">Columns</span>
            <div className="flex items-center overflow-hidden rounded-md border border-stone-200">
              {COLUMN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.title}
                  onClick={() => handleColumnsChange(opt.value)}
                  className={`flex h-7 w-8 items-center justify-center text-xs font-medium transition-colors ${columns === opt.value
                      ? "bg-stone-900 text-white"
                      : "bg-white text-stone-500 hover:bg-stone-50"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font size control */}
          <div className="flex items-center gap-1.5">
            <Type size={13} className="text-stone-400" />
            <span className="text-[11px] text-stone-400">Font</span>
            <div className="flex items-center overflow-hidden rounded-md border border-stone-200">
              <button
                type="button"
                title="Decrease font size"
                onClick={() => handleFontSizeChange(fontSize - 1)}
                disabled={fontSize <= FONT_SIZE_MIN}
                className="flex h-7 w-7 items-center justify-center bg-white text-stone-500 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus size={11} />
              </button>
              <input
                type="number"
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                value={fontSize}
                onChange={handleFontSizeInput}
                className="h-7 w-9 border-x border-stone-200 bg-white text-center text-xs text-stone-700 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                title="Increase font size"
                onClick={() => handleFontSizeChange(fontSize + 1)}
                disabled={fontSize >= FONT_SIZE_MAX}
                className="flex h-7 w-7 items-center justify-center bg-white text-stone-500 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={11} />
              </button>
            </div>
            <span className="text-[10px] text-stone-400">px</span>
          </div>
        </div>

        {/* Right: zoom controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <ZoomOut size={14} />
          </button>
          <span className="w-10 text-center text-xs text-stone-500">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() =>
              setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
            }
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

      {/* Preview area */}
      <div className="flex-1 overflow-auto px-8 py-8">
        {/* Both previews stay mounted so refs are always valid for PDF export */}
        <div style={{ display: mode === "paper" ? "block" : "none" }}>
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out",
            }}
          >
            <A4Preview
              ref={previewRef}
              paper={paper}
              highlightedQuestionId={highlightedQuestionId}
              columns={columns}
              fontSize={fontSize}
            />
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
            <AnswerKeyPreview
              ref={answerKeyRef}
              paper={paper}
              columns={columns}
              fontSize={fontSize}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreviewPanel;