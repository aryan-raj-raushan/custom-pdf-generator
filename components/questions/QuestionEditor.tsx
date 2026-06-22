// components/questions/QuestionEditor.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { GripVertical, ImagePlus, Plus, Sigma, Trash2, X } from "lucide-react";
import { Question, QuestionOption } from "@/types/exam";
import { TextArea, Select, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { QuestionType, Subject } from "../layout/CustomPdfCreator";

interface QuestionEditorProps {
  question: Question;
  index: number;
  showHindi: boolean;
  onChange: (q: Question) => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isHighlighted?: boolean;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "MCQ",
  short: "Short answer",
  long: "Long answer",
};

const SUBJECT_LABELS: Record<Subject, string> = {
  general: "General",
  mathematics: "Mathematics",
  reasoning: "Reasoning",
  english: "English",
  hindi: "Hindi",
  gk: "GK / Current Affairs",
};

export function QuestionEditor({
  question,
  index,
  showHindi,
  onChange,
  onDelete,
  dragHandleProps,
  isHighlighted,
}: Readonly<QuestionEditorProps>) {
  function update<K extends keyof Question>(key: K, value: Question[K]) {
    onChange({ ...question, [key]: value });
  }

  function changeType(type: QuestionType) {
    if (type === "mcq" && !question.options) {
      onChange({
        ...question,
        type,
        options: [0, 1, 2, 3].map(() => ({ id: crypto.randomUUID(), textEn: "", textHi: "" })),
        answerSpaceLines: undefined,
      });
    } else if (type !== "mcq") {
      onChange({
        ...question,
        type,
        answerSpaceLines: type === "long" ? 8 : 3,
      });
    } else {
      update("type", type);
    }
  }

  function updateOption(id: string, patch: Partial<QuestionOption>) {
    update(
      "options",
      (question.options ?? []).map((o) => (o.id === id ? { ...o, ...patch } : o))
    );
  }

  function addOption() {
    update("options", [...(question.options ?? []), { id: crypto.randomUUID(), textEn: "", textHi: "" }]);
  }

  function removeOption(id: string) {
    update("options", (question.options ?? []).filter((o) => o.id !== id));
  }

  function setCorrect(id: string) {
    update(
      "options",
      (question.options ?? []).map((o) => ({ ...o, isCorrect: o.id === id }))
    );
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("imageDataUrl", reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <motion.div
      layout
      data-question-id={question.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        boxShadow: isHighlighted
          ? "0 0 0 3px rgba(245, 158, 11, 0.5)"
          : "0 0 0 0px rgba(245, 158, 11, 0)",
      }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="group rounded-lg border border-stone-200 bg-white"
    >
      {question.importFlags && question.importFlags.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-amber-100 bg-amber-50/60 px-3 py-1.5">
          {question.importFlags.map((f, fi) => (
            <span
              key={fi}
              title={f.message}
              className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700"
            >
              {f.type === "missing_answer" && "Missing answer"}
              {f.type === "missing_solution" && "Missing solution"}
              {f.type === "image_question" && "Needs question image"}
              {f.type === "image_option" && "Needs option image"}
              {f.type === "ambiguous_options" && "Unclear options"}
              {f.type === "answer_letter_mismatch" && "Answer mismatch"}
              {f.type === "low_confidence" && "Couldn't parse cleanly"}
            </span>
          ))}
        </div>
      )}

      {/* Card header */}
      <div className="flex items-center gap-2 border-b border-stone-100 px-3 py-2">
        <div {...dragHandleProps} className="cursor-grab text-stone-300 hover:text-stone-500 active:cursor-grabbing">
          <GripVertical size={15} />
        </div>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-stone-100 text-[11px] font-semibold text-stone-500">
          {index + 1}
        </span>

        <Select
          value={question.type}
          onChange={(e) => changeType(e.target.value as QuestionType)}
          className="!w-auto !py-1 !text-xs"
        >
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </Select>

        <Select
          value={question.subject}
          onChange={(e) => update("subject", e.target.value as Subject)}
          className="!w-auto !py-1 !text-xs"
        >
          {Object.entries(SUBJECT_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </Select>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => update("hasMath", !question.hasMath)}
            title="Toggle math input mode ($...$ wraps LaTeX)"
            className={`flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors ${question.hasMath ? "bg-stone-900 text-white" : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              }`}
          >
            <Sigma size={13} />
          </button>

          <label
            title="Attach diagram / image"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            <ImagePlus size={14} />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>

          <Input
            type="number"
            step="0.5"
            value={question.marks ?? 1}
            onChange={(e) => update("marks", Number(e.target.value))}
            className="!w-14 !py-1 !text-center !text-xs"
            title="Marks"
          />

          <button
            type="button"
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-md text-stone-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-3">
        {question.hasMath && (
          <p className="text-[11px] text-stone-400">
            Wrap formulas in <code className="rounded bg-stone-100 px-1 py-0.5">$...$</code>, e.g.{" "}
            <code className="rounded bg-stone-100 px-1 py-0.5">$x^2 + 5x = 0$</code>
          </p>
        )}

        <TextArea
          value={question.textEn}
          onChange={(e) => update("textEn", e.target.value)}
          placeholder="Question text (English)"
          rows={2}
        />
        {showHindi && (
          <TextArea
            value={question.textHi ?? ""}
            onChange={(e) => update("textHi", e.target.value)}
            placeholder="प्रश्न (हिंदी में)"
            rows={2}
            style={{ fontFamily: "var(--font-devanagari, inherit)" }}
          />
        )}

        {question.imageDataUrl && (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={question.imageDataUrl} alt="Question diagram" className="max-h-32 rounded-md border border-stone-200" />
            <button
              type="button"
              onClick={() => update("imageDataUrl", undefined)}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-white"
            >
              <X size={11} />
            </button>
          </div>
        )}

        {question.type === "mcq" && (
          <div className="mt-1 flex flex-col gap-2">
            {(question.options ?? []).map((opt, i) => (
              <div key={opt.id} className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => setCorrect(opt.id)}
                  title="Mark as correct answer"
                  className={`mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors ${opt.isCorrect
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-stone-300 text-stone-400 hover:border-stone-400"
                    }`}
                >
                  {String.fromCharCode(65 + i)}
                </button>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Input
                    value={opt.textEn}
                    onChange={(e) => updateOption(opt.id, { textEn: e.target.value })}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="!py-1.5 !text-sm"
                  />
                  {showHindi && (
                    <Input
                      value={opt.textHi ?? ""}
                      onChange={(e) => updateOption(opt.id, { textHi: e.target.value })}
                      placeholder={`विकल्प ${String.fromCharCode(65 + i)}`}
                      className="!py-1.5 !text-sm"
                      style={{ fontFamily: "var(--font-devanagari, inherit)" }}
                    />
                  )}
                </div>
                {(question.options?.length ?? 0) > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(opt.id)}
                    className="mt-1.5 text-stone-300 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {(question.options?.length ?? 0) < 6 && (
              <Button size="sm" variant="ghost" onClick={addOption} className="w-fit">
                <Plus size={13} /> Add option
              </Button>
            )}
          </div>
        )}

        {(question.type === "short" || question.type === "long") && (
          <Field
            label="Answer space"
            value={question.answerSpaceLines ?? (question.type === "long" ? 8 : 3)}
            onChange={(v) => update("answerSpaceLines", v)}
          />
        )}
      </div>
    </motion.div>
  );
}

function Field({ label, value, onChange }: Readonly<{ label: string; value: number; onChange: (v: number) => void }>) {
  return (
    <div className="flex items-center gap-2 text-xs text-stone-500">
      <span>{label}:</span>
      <Input
        type="number"
        min={1}
        max={20}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="!w-16 !py-1 !text-xs"
      />
      <span>ruled lines</span>
    </div>
  );
}

export default QuestionEditor;