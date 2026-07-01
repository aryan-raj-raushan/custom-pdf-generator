// components/metadata/MetadataForm.tsx
'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Upload, X, Languages } from 'lucide-react';
import { ExamMetadata } from '@/types/exam';
import { Field, Input, Select, TextArea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { TemplatePicker } from './TemplatePicker';

interface MetadataFormProps {
  metadata: ExamMetadata;
  onChange: (metadata: ExamMetadata) => void;
}

export function MetadataForm({ metadata, onChange }: MetadataFormProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const watermarkImageRef = useRef<HTMLInputElement>(null);
  const coverImageRef = useRef<HTMLInputElement>(null);

  // Tracks which instruction rows have the Hindi field expanded.
  // Initialised lazily per-row: on if hindi text already exists or paper isn't English-only.
  const [hindiRowsOpen, setHindiRowsOpen] = useState<Record<number, boolean>>({});

  function isHindiOpen(index: number) {
    if (index in hindiRowsOpen) return hindiRowsOpen[index];
    const hasText = !!metadata.generalInstructionsHi?.[index]?.trim();
    return hasText || metadata.language !== 'en';
  }

  function setHindiOpen(index: number, open: boolean) {
    setHindiRowsOpen((prev) => ({ ...prev, [index]: open }));
  }

  function handleCoverImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      update('coverPage', {
        enabled: true,
        imageDataUrl: reader.result as string,
      });
    reader.readAsDataURL(file);
  }

  function update<K extends keyof ExamMetadata>(key: K, value: ExamMetadata[K]) {
    onChange({ ...metadata, [key]: value });
  }

  function updateInstruction(index: number, value: string, lang: 'en' | 'hi') {
    const key = lang === 'en' ? 'generalInstructions' : 'generalInstructionsHi';
    const list = [...(metadata[key] ?? [])];
    list[index] = value;
    update(key, list);
  }

  const rowKeysRef = useRef<string[]>([]);

  function getRowKey(index: number) {
    if (!rowKeysRef.current[index]) {
      rowKeysRef.current[index] =
        `row-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`;
    }
    return rowKeysRef.current[index];
  }

  function addInstruction() {
    const nextEn = [...metadata.generalInstructions, ''];
    const nextHi = [...(metadata.generalInstructionsHi ?? []), ''];

    onChange({
      ...metadata,
      generalInstructions: nextEn,
      generalInstructionsHi: nextHi,
    });

    rowKeysRef.current = [
      ...rowKeysRef.current,
      `row-${Date.now()}-${rowKeysRef.current.length}-${Math.random().toString(36).slice(2)}`,
    ];
  }

  // Removes the whole instruction row (English + Hindi together).
  function removeInstruction(index: number) {
    const nextEn = metadata.generalInstructions.filter((_, i) => i !== index);
    const nextHi = (metadata.generalInstructionsHi ?? []).filter((_, i) => i !== index);
    rowKeysRef.current = rowKeysRef.current.filter((_, i) => i !== index);

    // Reindex the open/closed Hindi-toggle map to match the new array positions
    setHindiRowsOpen((prev) => {
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const i = Number(k);
        if (i < index) next[i] = v;
        else if (i > index) next[i - 1] = v;
      });
      return next;
    });

    onChange({
      ...metadata,
      generalInstructions: nextEn,
      generalInstructionsHi: nextHi,
    });
  }

  // Clears just the Hindi text for a row and collapses the field — the
  // English instruction and the row itself are left untouched.
  function clearHindiInstruction(index: number) {
    updateInstruction(index, '', 'hi');
    setHindiOpen(index, false);
  }

  function toggleHindiRow(index: number) {
    const nextOpen = !isHindiOpen(index);
    if (!nextOpen) {
      // Turning the toggle off clears the Hindi text for that row.
      updateInstruction(index, '', 'hi');
    }
    setHindiOpen(index, nextOpen);
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update('logoDataUrl', reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleWatermarkImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      update('watermark', {
        ...metadata.watermark,
        type: 'image',
        imageDataUrl: reader.result as string,
      });
    reader.readAsDataURL(file);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-6 pb-10"
    >
      {/* ── Template ──────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <SectionLabel>Header template</SectionLabel>
        <TemplatePicker metadata={metadata} onChange={onChange} />
      </section>

      {/* ── Identity ──────────────────────────────────── */}
      <section className="flex flex-col gap-4 border-t border-stone-100 pt-5">
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
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-stone-700">Organisation emblem</span>
            <span className="text-xs text-stone-400">PNG/SVG, shown top-left of the header</span>
          </div>
          {metadata.logoDataUrl && (
            <button
              type="button"
              onClick={() => update('logoDataUrl', undefined)}
              className="ml-auto text-stone-400 hover:text-red-500"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <Field label="Organisation / Board name">
          <Input
            value={metadata.organisation}
            onChange={(e) => update('organisation', e.target.value)}
            placeholder="Staff Selection Commission"
          />
        </Field>

        <Field label="Organisation name (Hindi)" hint="शीर्षक हिंदी में">
          <Input
            value={metadata.organisationHi ?? ''}
            onChange={(e) => update('organisationHi', e.target.value)}
            placeholder="कर्मचारी चयन आयोग"
          />
        </Field>

        <Field label="Exam title">
          <Input
            value={metadata.examTitle}
            onChange={(e) => update('examTitle', e.target.value)}
            placeholder="Combined Graduate Level Examination"
          />
        </Field>

        <Field label="Exam title (Hindi)">
          <Input
            value={metadata.examTitleHi ?? ''}
            onChange={(e) => update('examTitleHi', e.target.value)}
            placeholder="संयुक्त स्नातक स्तरीय परीक्षा"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Exam code">
            <Input
              value={metadata.examCode ?? ''}
              onChange={(e) => update('examCode', e.target.value)}
              placeholder="SSC-CGL-2026"
            />
          </Field>
          <Field label="Set / Series">
            <div className="flex gap-2">
              <Input
                value={metadata.setCode ?? ''}
                onChange={(e) => update('setCode', e.target.value)}
                placeholder="A"
                className="w-16"
              />
              <Input
                value={metadata.bookletSeries ?? ''}
                onChange={(e) => update('bookletSeries', e.target.value)}
                placeholder="Booklet series"
              />
            </div>
          </Field>
        </div>
      </section>

      {/* ── Cover page ────────────────────────────────── */}
      <section className="flex flex-col gap-3 border-t border-stone-100 pt-5">
        <div className="flex items-center justify-between">
          <SectionLabel>Cover page</SectionLabel>
          {metadata.coverPage?.imageDataUrl && (
            <Toggle
              label=""
              checked={metadata.coverPage?.enabled ?? false}
              onChange={(v) => update('coverPage', { ...metadata.coverPage!, enabled: v })}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => coverImageRef.current?.click()}
            title="A4 portrait images fit best"
            className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-stone-300 bg-stone-50 text-stone-400 hover:border-stone-400 hover:text-stone-600"
          >
            {metadata.coverPage?.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={metadata.coverPage.imageDataUrl}
                alt="Cover"
                className="h-full w-full object-contain"
              />
            ) : (
              <Upload size={18} />
            )}
          </button>
          <input
            ref={coverImageRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverImageUpload}
          />
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-stone-700">
              {metadata.coverPage?.imageDataUrl ? 'Cover image uploaded' : 'Add a cover page image'}
            </span>
            <span className="text-xs text-stone-400">
              Inserted as page 1 · fit to A4 without cropping or overflow
            </span>
            {metadata.coverPage?.imageDataUrl && (
              <button
                type="button"
                onClick={() => update('coverPage', { enabled: false, imageDataUrl: undefined })}
                className="flex w-fit items-center gap-1 text-[11px] text-stone-400 hover:text-red-500"
              >
                <X size={12} /> Remove
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Schedule & marking ────────────────────────── */}
      <section className="flex flex-col gap-4 border-t border-stone-100 pt-5">
        <SectionLabel>Schedule & marking scheme</SectionLabel>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input
              type="date"
              value={metadata.date}
              onChange={(e) => update('date', e.target.value)}
            />
          </Field>
          <Field label="Duration">
            <Input
              value={metadata.duration}
              onChange={(e) => update('duration', e.target.value)}
              placeholder="2 Hours"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Maximum marks">
            <Input
              type="number"
              value={metadata.maxMarks}
              onChange={(e) => update('maxMarks', Number(e.target.value))}
            />
          </Field>
          <Field label="Marks per question (default)">
            <Input
              type="number"
              step="0.5"
              value={metadata.marksPerQuestion ?? 1}
              onChange={(e) => update('marksPerQuestion', Number(e.target.value))}
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
                update('negativeMarking', {
                  enabled: !(metadata.negativeMarking?.enabled ?? false),
                  value: metadata.negativeMarking?.value ?? 0.25,
                })
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                metadata.negativeMarking?.enabled ? 'bg-stone-900' : 'bg-stone-200'
              }`}
            >
              <motion.span
                layout
                className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
                style={{ left: metadata.negativeMarking?.enabled ? 22 : 4 }}
                transition={{ type: 'spring', duration: 0.25, bounce: 0.2 }}
              />
            </button>
            <span className="text-sm text-stone-600">
              {metadata.negativeMarking?.enabled ? 'Enabled —' : 'Disabled'}
            </span>
            {metadata.negativeMarking?.enabled && (
              <Input
                type="number"
                step="0.25"
                value={metadata.negativeMarking.value}
                onChange={(e) =>
                  update('negativeMarking', {
                    enabled: true,
                    value: Number(e.target.value),
                  })
                }
                className="w-20"
              />
            )}
            {metadata.negativeMarking?.enabled && (
              <span className="text-sm text-stone-500">marks per wrong answer</span>
            )}
          </div>
        </Field>

        <Field label="Paper language">
          <Select
            value={metadata.language}
            onChange={(e) => update('language', e.target.value as ExamMetadata['language'])}
          >
            <option value="bilingual">Bilingual (English + Hindi)</option>
            <option value="en">English only</option>
            <option value="hi">Hindi only (हिंदी)</option>
          </Select>
        </Field>
      </section>

      {/* ── Candidate fields ──────────────────────────── */}
      <section className="flex flex-col gap-3 border-t border-stone-100 pt-5">
        <SectionLabel>Candidate detail boxes</SectionLabel>
        <Toggle
          label="Show Roll Number box"
          checked={metadata.rollNoLabel ?? true}
          onChange={(v) => update('rollNoLabel', v)}
        />
        <Toggle
          label="Show Candidate Name line"
          checked={metadata.candidateNameLabel ?? true}
          onChange={(v) => update('candidateNameLabel', v)}
        />
      </section>

      {/* ── Instructions ──────────────────────────────── */}
      <section className="flex flex-col gap-3 border-t border-stone-100 pt-5">
        <div className="flex items-center justify-between">
          <SectionLabel>General instructions</SectionLabel>
          <div className="flex items-center gap-2">
            <Toggle
              label=""
              checked={metadata.generalInstructionsEnabled ?? true}
              onChange={(v) => update('generalInstructionsEnabled', v)}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={addInstruction}
              disabled={!(metadata.generalInstructionsEnabled ?? true)}
            >
              <Plus size={14} /> Add line
            </Button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {(metadata.generalInstructionsEnabled ?? true) && (
            <motion.div
              key="instructions-body"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3">
                {metadata.generalInstructions.map((instr, i) => {
                  const hindiOpen = isHindiOpen(i);
                  return (
                    <div
                      key={i}
                      className="flex flex-col gap-1.5 rounded-md border border-stone-100 bg-stone-50/60 p-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-2 w-4 shrink-0 text-xs text-stone-400">{i + 1}.</span>
                        <TextArea
                          value={instr}
                          onChange={(e) => updateInstruction(i, e.target.value, 'en')}
                          placeholder="Instruction in English"
                          rows={2}
                          className="flex-1 text-[13px]"
                        />
                        <button
                          type="button"
                          onClick={() => toggleHindiRow(i)}
                          title={hindiOpen ? 'Remove Hindi translation' : 'Add Hindi translation'}
                          className={`mt-2 flex shrink-0 items-center justify-center rounded p-1 transition-colors ${
                            hindiOpen
                              ? 'bg-stone-900 text-white hover:bg-stone-700'
                              : 'text-stone-300 hover:bg-stone-200 hover:text-stone-600'
                          }`}
                        >
                          <Languages size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeInstruction(i)}
                          title="Delete instruction"
                          className="mt-2 shrink-0 text-stone-300 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {hindiOpen && (
                          <motion.div
                            key="hindi-field"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="ml-6 flex items-start gap-2 overflow-hidden"
                          >
                            <TextArea
                              value={metadata.generalInstructionsHi?.[i] ?? ''}
                              onChange={(e) => updateInstruction(i, e.target.value, 'hi')}
                              placeholder="हिंदी में निर्देश"
                              rows={2}
                              className="flex-1 text-[13px]"
                              style={{ fontFamily: 'var(--font-devanagari, inherit)' }}
                            />
                            <button
                              type="button"
                              onClick={() => clearHindiInstruction(i)}
                              title="Clear Hindi text"
                              className="mt-2 shrink-0 text-stone-300 hover:text-red-500"
                            >
                              <X size={14} />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Watermark ─────────────────────────────────── */}
      <section className="flex flex-col gap-3 border-t border-stone-100 pt-5">
        <div className="flex items-center justify-between">
          <SectionLabel>Watermark</SectionLabel>
          <Toggle
            label=""
            checked={metadata.watermark?.enabled ?? false}
            onChange={(v) =>
              update('watermark', {
                type: 'text',
                text: '',
                opacity: 0.12,
                ...metadata.watermark,
                enabled: v,
              })
            }
          />
        </div>

        <AnimatePresence initial={false}>
          {metadata.watermark?.enabled && (
            <motion.div
              key="watermark-settings"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3 rounded-lg border border-stone-100 bg-stone-50/60 p-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => update('watermark', { ...metadata.watermark!, type: 'text' })}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      (metadata.watermark?.type ?? 'text') === 'text'
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    }`}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    onClick={() => update('watermark', { ...metadata.watermark!, type: 'image' })}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      metadata.watermark?.type === 'image'
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    }`}
                  >
                    Image
                  </button>
                </div>

                {(metadata.watermark?.type ?? 'text') === 'text' && (
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-stone-500">
                      Watermark text
                    </label>
                    <Input
                      value={metadata.watermark?.text ?? ''}
                      onChange={(e) =>
                        update('watermark', {
                          ...metadata.watermark!,
                          type: 'text',
                          text: e.target.value,
                        })
                      }
                      placeholder="CONFIDENTIAL · DRAFT · Institute Name"
                      style={{ fontFamily: 'var(--font-devanagari, inherit)' }}
                    />
                    <p className="mt-1 text-[10px] text-stone-400">
                      Hindi / Devanagari text supported — e.g. &quot;प्रारूप&quot;
                    </p>
                  </div>
                )}

                {metadata.watermark?.type === 'image' && (
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-stone-500">
                      Watermark image
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => watermarkImageRef.current?.click()}
                        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-stone-300 bg-white text-stone-400 hover:border-stone-400 hover:text-stone-600"
                      >
                        {metadata.watermark?.imageDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={metadata.watermark.imageDataUrl}
                            alt="Watermark"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Upload size={18} />
                        )}
                      </button>
                      <input
                        ref={watermarkImageRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleWatermarkImageUpload}
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-[12px] font-medium text-stone-700">
                          {metadata.watermark?.imageDataUrl ? 'Image uploaded' : 'Upload image'}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          PNG with transparency works best
                        </span>
                        {metadata.watermark?.imageDataUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              update('watermark', {
                                ...metadata.watermark!,
                                imageDataUrl: undefined,
                              })
                            }
                            className="flex w-fit items-center gap-1 text-[11px] text-stone-400 hover:text-red-500"
                          >
                            <X size={12} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[11px] font-medium text-stone-500">Opacity</label>
                    <span className="text-[11px] font-semibold text-stone-600">
                      {Math.round((metadata.watermark?.opacity ?? 0.12) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-stone-400">Faint</span>
                    <input
                      type="range"
                      min={4}
                      max={30}
                      step={1}
                      value={Math.round((metadata.watermark?.opacity ?? 0.12) * 100)}
                      onChange={(e) =>
                        update('watermark', {
                          ...metadata.watermark!,
                          opacity: Number(e.target.value) / 100,
                        })
                      }
                      className="flex-1 accent-stone-900"
                    />
                    <span className="text-[10px] text-stone-400">Bold</span>
                  </div>
                  <div className="mt-2 flex items-center justify-center rounded-md border border-stone-100 bg-white py-3">
                    <span
                      className="text-[18px] font-black uppercase tracking-widest text-stone-900"
                      style={{
                        opacity: metadata.watermark?.opacity ?? 0.12,
                        fontFamily: 'var(--font-devanagari, inherit)',
                        rotate: '-20deg',
                        display: 'inline-block',
                        transform: 'rotate(-20deg)',
                      }}
                    >
                      {(metadata.watermark?.type ?? 'text') === 'text'
                        ? metadata.watermark?.text || 'Preview'
                        : '[ Image ]'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </motion.div>
  );
}

function SectionLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{children}</h3>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: Readonly<{ label: string; checked: boolean; onChange: (v: boolean) => void }>) {
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
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-stone-900' : 'bg-stone-200'}`}
      >
        <motion.span
          layout
          className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
          style={{ left: checked ? 22 : 4 }}
          transition={{ type: 'spring', duration: 0.25, bounce: 0.2 }}
        />
      </span>
    </button>
  );
}

export default MetadataForm;
