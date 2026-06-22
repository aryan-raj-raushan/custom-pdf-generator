// components/metadata/MetadataForm.tsx
"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { ExamMetadata } from "@/types/exam";
import {
  Field, Input, Select, TextArea,
  // inputClass
} from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

interface MetadataFormProps {
  metadata: ExamMetadata;
  onChange: (metadata: ExamMetadata) => void;
}

export function MetadataForm({ metadata, onChange }: MetadataFormProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof ExamMetadata>(key: K, value: ExamMetadata[K]) {
    onChange({ ...metadata, [key]: value });
  }

  function updateInstruction(index: number, value: string, lang: "en" | "hi") {
    const key = lang === "en" ? "generalInstructions" : "generalInstructionsHi";
    const list = [...(metadata[key] ?? [])];
    list[index] = value;
    update(key, list);
  }

  function addInstruction() {
    update("generalInstructions", [...metadata.generalInstructions, ""]);
    update("generalInstructionsHi", [...(metadata.generalInstructionsHi ?? []), ""]);
  }

  function removeInstruction(index: number) {
    update(
      "generalInstructions",
      metadata.generalInstructions.filter((_, i) => i !== index)
    );
    update(
      "generalInstructionsHi",
      (metadata.generalInstructionsHi ?? []).filter((_, i) => i !== index)
    );
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("logoDataUrl", reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-6 pb-10"
    >
      {/* Identity */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Exam identity</SectionLabel>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-stone-300 bg-stone-50 text-stone-400 hover:border-stone-400 hover:text-stone-600"
          >
            {metadata.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={metadata.logoDataUrl} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <Upload size={18} />
            )}
          </button>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-stone-700">Organisation emblem</span>
            <span className="text-xs text-stone-400">PNG/SVG, shown top-left of the header</span>
          </div>
          {metadata.logoDataUrl && (
            <button
              type="button"
              onClick={() => update("logoDataUrl", undefined)}
              className="ml-auto text-stone-400 hover:text-red-500"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <Field label="Organisation / Board name">
          <Input
            value={metadata.organisation}
            onChange={(e) => update("organisation", e.target.value)}
            placeholder="Staff Selection Commission"
          />
        </Field>

        <Field label="Organisation name (Hindi)" hint="शीर्षक हिंदी में">
          <Input
            value={metadata.organisationHi ?? ""}
            onChange={(e) => update("organisationHi", e.target.value)}
            placeholder="कर्मचारी चयन आयोग"
          />
        </Field>

        <Field label="Exam title">
          <Input
            value={metadata.examTitle}
            onChange={(e) => update("examTitle", e.target.value)}
            placeholder="Combined Graduate Level Examination"
          />
        </Field>

        <Field label="Exam title (Hindi)">
          <Input
            value={metadata.examTitleHi ?? ""}
            onChange={(e) => update("examTitleHi", e.target.value)}
            placeholder="संयुक्त स्नातक स्तरीय परीक्षा"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Exam code">
            <Input
              value={metadata.examCode ?? ""}
              onChange={(e) => update("examCode", e.target.value)}
              placeholder="SSC-CGL-2026"
            />
          </Field>
          <Field label="Set / Series">
            <div className="flex gap-2">
              <Input
                value={metadata.setCode ?? ""}
                onChange={(e) => update("setCode", e.target.value)}
                placeholder="A"
                className="w-16"
              />
              <Input
                value={metadata.bookletSeries ?? ""}
                onChange={(e) => update("bookletSeries", e.target.value)}
                placeholder="Booklet series"
              />
            </div>
          </Field>
        </div>
      </section>

      {/* Schedule & marking */}
      <section className="flex flex-col gap-4 border-t border-stone-100 pt-5">
        <SectionLabel>Schedule & marking scheme</SectionLabel>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" value={metadata.date} onChange={(e) => update("date", e.target.value)} />
          </Field>
          <Field label="Duration">
            <Input
              value={metadata.duration}
              onChange={(e) => update("duration", e.target.value)}
              placeholder="2 Hours"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Maximum marks">
            <Input
              type="number"
              value={metadata.maxMarks}
              onChange={(e) => update("maxMarks", Number(e.target.value))}
            />
          </Field>
          <Field label="Marks per question (default)">
            <Input
              type="number"
              step="0.5"
              value={metadata.marksPerQuestion ?? 1}
              onChange={(e) => update("marksPerQuestion", Number(e.target.value))}
            />
          </Field>
        </div>

        <Field label="Negative marking">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={metadata.negativeMarking?.enabled ?? false}
              onClick={() =>
                update("negativeMarking", {
                  enabled: !(metadata.negativeMarking?.enabled ?? false),
                  value: metadata.negativeMarking?.value ?? 0.25,
                })
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${metadata.negativeMarking?.enabled ? "bg-stone-900" : "bg-stone-200"
                }`}
            >
              <motion.span
                layout
                className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
                style={{ left: metadata.negativeMarking?.enabled ? 22 : 4 }}
                transition={{ type: "spring", duration: 0.25, bounce: 0.2 }}
              />
            </button>
            <span className="text-sm text-stone-600">
              {metadata.negativeMarking?.enabled ? "Enabled —" : "Disabled"}
            </span>
            {metadata.negativeMarking?.enabled && (
              <Input
                type="number"
                step="0.25"
                value={metadata.negativeMarking.value}
                onChange={(e) =>
                  update("negativeMarking", {
                    enabled: true,
                    value: Number(e.target.value),
                  })
                }
                className="w-20"
              />
            )}
            {metadata.negativeMarking?.enabled && <span className="text-sm text-stone-500">marks per wrong answer</span>}
          </div>
        </Field>

        <Field label="Paper language">
          <Select value={metadata.language} onChange={(e) => update("language", e.target.value as ExamMetadata["language"])}>
            <option value="bilingual">Bilingual (English + Hindi)</option>
            <option value="en">English only</option>
            <option value="hi">Hindi only (हिंदी)</option>
          </Select>
        </Field>
      </section>

      {/* Candidate fields */}
      <section className="flex flex-col gap-3 border-t border-stone-100 pt-5">
        <SectionLabel>Candidate detail boxes</SectionLabel>
        <Toggle
          label="Show Roll Number box"
          checked={metadata.rollNoLabel ?? true}
          onChange={(v) => update("rollNoLabel", v)}
        />
        <Toggle
          label="Show Candidate Name line"
          checked={metadata.candidateNameLabel ?? true}
          onChange={(v) => update("candidateNameLabel", v)}
        />
      </section>

      {/* Instructions */}
      <section className="flex flex-col gap-3 border-t border-stone-100 pt-5">
        <div className="flex items-center justify-between">
          <SectionLabel>General instructions</SectionLabel>
          <Button size="sm" variant="ghost" onClick={addInstruction}>
            <Plus size={14} /> Add line
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {metadata.generalInstructions.map((instr, i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-md border border-stone-100 bg-stone-50/60 p-2.5">
              <div className="flex items-start gap-2">
                <span className="mt-2 w-4 shrink-0 text-xs text-stone-400">{i + 1}.</span>
                <TextArea
                  value={instr}
                  onChange={(e) => updateInstruction(i, e.target.value, "en")}
                  placeholder="Instruction in English"
                  rows={2}
                  className="flex-1 text-[13px]"
                />
                <button
                  type="button"
                  onClick={() => removeInstruction(i)}
                  className="mt-2 shrink-0 text-stone-300 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {metadata.language !== "en" && (
                <TextArea
                  value={metadata.generalInstructionsHi?.[i] ?? ""}
                  onChange={(e) => updateInstruction(i, e.target.value, "hi")}
                  placeholder="हिंदी में निर्देश"
                  rows={2}
                  className="ml-6 flex-1 text-[13px]"
                  style={{ fontFamily: "var(--font-devanagari, inherit)" }}
                />
              )}
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

function SectionLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return <h3 className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{children}</h3>;
}

function Toggle({ label, checked, onChange }: Readonly<{ label: string; checked: boolean; onChange: (v: boolean) => void }>) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-md py-1 text-left"
    >
      <span className="text-sm text-stone-600">{label}</span>
      <span
        role="switch"
        aria-checked={checked}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-stone-900" : "bg-stone-200"}`}
      >
        <motion.span
          layout
          className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
          style={{ left: checked ? 22 : 4 }}
          transition={{ type: "spring", duration: 0.25, bounce: 0.2 }}
        />
      </span>
    </button>
  );
}

export default MetadataForm;