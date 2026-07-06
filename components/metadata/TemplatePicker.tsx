// components/metadata/TemplatePicker.tsx
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { ExamMetadata } from '@/types/exam';
import { FontSizeStepper } from '@/components/ui/FontSizeStepper';

export type HeaderTemplate = 'classic' | 'coaching' | 'minimal';

interface TemplateOption {
  id: HeaderTemplate;
  label: string;
  hint: string;
  preview: React.ReactNode;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'classic',
    label: 'Classic',
    hint: 'SSC · UPSC · Board exams',
    preview: <ClassicPreview />,
  },
  {
    id: 'coaching',
    label: 'Coaching Booklet',
    hint: 'Bihar Police · Practice sets',
    preview: <CoachingPreview />,
  },
  {
    id: 'minimal',
    label: 'Minimal',
    hint: 'JEE · NEET · Modern look',
    preview: <MinimalPreview />,
  },
];

interface TemplatePickerProps {
  metadata: ExamMetadata;
  onChange: (metadata: ExamMetadata) => void;
}

export function TemplatePicker({ metadata, onChange }: TemplatePickerProps) {
  const current = metadata.headerTemplate ?? 'classic';

  function updateFooterFontSize(value: number) {
    const next = Math.min(28, Math.max(8, Number(value) || 8));
    onChange({
      ...metadata,
      headerFontSizes: {
        ...metadata.headerFontSizes,
        footer: next,
      },
    });
  }

  function select(tpl: HeaderTemplate) {
    // When switching TO coaching: auto-disable candidate fields & negative marking
    // (coaching sets are practice booklets — those fields aren't relevant)
    if (tpl === 'coaching') {
      onChange({
        ...metadata,
        headerTemplate: tpl,
        rollNoLabel: false,
        candidateNameLabel: false,
        negativeMarking: {
          enabled: false,
          value: metadata.negativeMarking?.value ?? 0.25,
        },
      });
      return;
    }
    onChange({ ...metadata, headerTemplate: tpl });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {TEMPLATES.map((tpl) => {
          const active = current === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => select(tpl.id)}
              className={`relative flex flex-col overflow-hidden rounded-lg border-2 transition-all ${
                active ? 'border-stone-900 shadow-sm' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              {/* Mini preview */}
              <div className="bg-white p-2 pointer-events-none select-none">{tpl.preview}</div>

              {/* Label */}
              <div
                className={`flex items-center justify-between px-2 py-1.5 ${
                  active ? 'bg-stone-900' : 'bg-stone-50'
                }`}
              >
                <div className="text-left">
                  <p
                    className={`text-[11px] font-semibold leading-none ${
                      active ? 'text-white' : 'text-stone-700'
                    }`}
                  >
                    {tpl.label}
                  </p>
                  <p
                    className={`mt-0.5 text-[9px] leading-none ${
                      active ? 'text-stone-300' : 'text-stone-400'
                    }`}
                  >
                    {tpl.hint}
                  </p>
                </div>
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-white"
                  >
                    <Check size={10} className="text-stone-900" />
                  </motion.span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Coaching-only expanded settings */}
      <AnimatePresence initial={false}>
        {current === 'coaching' && (
          <motion.div
            key="coaching-settings"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 rounded-lg border border-stone-100 bg-stone-50/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                Coaching booklet settings
              </p>

              {/* Set number in circle */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-stone-500">
                  Set number <span className="text-stone-400">(shown in circle badge)</span>
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={metadata.coachingSetNumber ?? metadata.setCode ?? '01'}
                  onChange={(e) => onChange({ ...metadata, coachingSetNumber: e.target.value })}
                  placeholder="01"
                  className="w-20 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-center text-[13px] font-bold text-stone-700 placeholder:text-stone-300 focus:border-stone-400 focus:outline-none"
                />
              </div>

              {/* Header branding bar */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-stone-500">
                  Header brand bar text{' '}
                  <span className="text-stone-400">(shown inside the title box)</span>
                </label>
                <input
                  type="text"
                  value={metadata.footerBrand ?? ''}
                  onChange={(e) => onChange({ ...metadata, footerBrand: e.target.value })}
                  placeholder="Your Brand | बिहार पुलिस मॉडल प्रैक्टिस सेट"
                  className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] text-stone-700 placeholder:text-stone-300 focus:border-stone-400 focus:outline-none"
                  style={{ fontFamily: 'var(--font-devanagari, inherit)' }}
                />
              </div>

              {/* Page footer text */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-stone-500">
                  Page footer text{' '}
                  <span className="text-stone-400">(dark bar at bottom of every page)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={metadata.footerBrandText ?? ''}
                    onChange={(e) => onChange({ ...metadata, footerBrandText: e.target.value })}
                    placeholder="@YourBrand | YouTube · Telegram · Instagram"
                    className="flex-1 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] text-stone-700 placeholder:text-stone-300 focus:border-stone-400 focus:outline-none"
                    style={{ fontFamily: 'var(--font-devanagari, inherit)' }}
                  />
                  <FontSizeStepper
                    value={metadata.headerFontSizes?.footer ?? 12}
                    onChange={updateFooterFontSize}
                  />
                </div>
              </div>

              {/* Brand colour */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-stone-500">
                  Brand colour
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={metadata.footerBrandColor ?? '#1a1a1a'}
                    onChange={(e) => onChange({ ...metadata, footerBrandColor: e.target.value })}
                    className="h-8 w-10 cursor-pointer rounded border border-stone-200 bg-white p-0.5"
                  />
                  <span className="text-[11px] text-stone-500">
                    {metadata.footerBrandColor ?? '#1a1a1a'}
                  </span>
                  <span className="text-[10px] text-stone-400">
                    — used for header badge &amp; page footer bar
                  </span>
                </div>
              </div>

              {/* Reminder note */}
              <p className="rounded-md bg-amber-50 px-2.5 py-2 text-[10.5px] text-amber-700">
                Roll No. box, Candidate Name line, and Negative marking have been disabled —
                they&apos;re not needed for coaching practice sets. Re-enable them below if needed.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tiny SVG previews (purely decorative) ───────────────

function ClassicPreview() {
  return (
    <svg viewBox="0 0 120 52" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <rect x="4" y="4" width="44" height="3.5" rx="1" fill="#1c1c1c" opacity="0.8" />
      <rect x="4" y="9" width="30" height="2.5" rx="1" fill="#1c1c1c" opacity="0.4" />
      <rect x="90" y="4" width="26" height="3" rx="1" fill="#1c1c1c" opacity="0.5" />
      <rect
        x="88"
        y="9"
        width="28"
        height="5"
        rx="1.5"
        fill="none"
        stroke="#1c1c1c"
        strokeWidth="0.8"
        opacity="0.5"
      />
      <rect x="22" y="19" width="76" height="4" rx="1" fill="#1c1c1c" opacity="0.75" />
      <rect x="32" y="25" width="56" height="3" rx="1" fill="#1c1c1c" opacity="0.45" />
      <rect x="4" y="31" width="112" height="0.8" fill="#1c1c1c" opacity="0.2" />
      <rect x="4" y="33" width="112" height="5" rx="0" fill="#f0f0f0" />
      <rect
        x="4"
        y="33"
        width="112"
        height="5"
        rx="0"
        fill="none"
        stroke="#1c1c1c"
        strokeWidth="0.5"
        opacity="0.2"
      />
      <rect x="10" y="35" width="20" height="1.5" rx="0.5" fill="#1c1c1c" opacity="0.4" />
      <rect x="50" y="35" width="20" height="1.5" rx="0.5" fill="#1c1c1c" opacity="0.4" />
      <rect x="90" y="35" width="22" height="1.5" rx="0.5" fill="#1c1c1c" opacity="0.4" />
      {Array.from({ length: 10 }).map((_, i) => (
        <rect
          key={i}
          x={4 + i * 5}
          y="43"
          width="4"
          height="5"
          rx="0"
          fill="none"
          stroke="#1c1c1c"
          strokeWidth="0.5"
          opacity="0.4"
        />
      ))}
      <rect x="58" y="44" width="58" height="1.5" rx="0.5" fill="#1c1c1c" opacity="0.15" />
    </svg>
  );
}

function CoachingPreview() {
  return (
    <svg viewBox="0 0 120 58" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Outer border box */}
      <rect
        x="4"
        y="3"
        width="112"
        height="22"
        rx="0"
        fill="none"
        stroke="#1c1c1c"
        strokeWidth="1.2"
      />
      {/* Circle badge block */}
      <rect x="4" y="3" width="16" height="22" rx="0" fill="#1c1c1c" />
      <circle cx="12" cy="14" r="6" fill="none" stroke="white" strokeWidth="1" />
      <text x="12" y="17.5" textAnchor="middle" fontSize="5" fontWeight="bold" fill="white">
        02
      </text>
      {/* Title inside box */}
      <rect x="24" y="8" width="72" height="4.5" rx="1" fill="#1c1c1c" opacity="0.8" />
      <rect x="28" y="14.5" width="52" height="3" rx="1" fill="#1c1c1c" opacity="0.4" />
      {/* Header brand subbar inside box */}
      <rect x="20" y="21" width="96" height="4" rx="0" fill="#1a1a1a" opacity="0.75" />
      <rect x="24" y="22.5" width="40" height="1.5" rx="0.5" fill="white" opacity="0.55" />
      {/* Meta row */}
      <rect x="4" y="28" width="112" height="0.6" fill="#1c1c1c" opacity="0.25" />
      <rect x="6" y="30" width="25" height="2" rx="0.5" fill="#1c1c1c" opacity="0.35" />
      <rect x="45" y="30" width="25" height="2" rx="0.5" fill="#1c1c1c" opacity="0.35" />
      <rect x="84" y="30" width="28" height="2" rx="0.5" fill="#1c1c1c" opacity="0.35" />
      {/* Page footer bar at bottom */}
      <rect x="4" y="51" width="112" height="5" rx="0" fill="#1c1c1c" opacity="0.85" />
      <rect x="8" y="52.5" width="38" height="1.5" rx="0.5" fill="white" opacity="0.6" />
      <rect x="90" y="52.5" width="22" height="1.5" rx="0.5" fill="white" opacity="0.4" />
    </svg>
  );
}

function MinimalPreview() {
  return (
    <svg viewBox="0 0 120 52" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <rect x="4" y="4" width="10" height="10" rx="1" fill="#1c1c1c" />
      <text x="9" y="12" textAnchor="middle" fontSize="4" fontWeight="bold" fill="white">
        ORG
      </text>
      <rect x="17" y="5" width="40" height="2.5" rx="0.8" fill="#1c1c1c" opacity="0.7" />
      <rect x="17" y="9.5" width="28" height="2" rx="0.8" fill="#1c1c1c" opacity="0.35" />
      <rect x="90" y="5" width="26" height="2" rx="0.5" fill="#1c1c1c" opacity="0.5" />
      <rect x="94" y="9" width="22" height="1.5" rx="0.5" fill="#1c1c1c" opacity="0.25" />
      <rect x="4" y="17" width="112" height="1.5" rx="0" fill="#1c1c1c" />
      <rect x="18" y="21.5" width="84" height="4" rx="1" fill="#1c1c1c" opacity="0.8" />
      <rect x="28" y="27.5" width="64" height="3" rx="1" fill="#1c1c1c" opacity="0.4" />
      <rect x="4" y="33.5" width="112" height="0.6" fill="#1c1c1c" opacity="0.2" />
      <rect
        x="16"
        y="36"
        width="22"
        height="3"
        rx="1.5"
        fill="#f0f0f0"
        stroke="#ccc"
        strokeWidth="0.4"
      />
      <rect
        x="49"
        y="36"
        width="22"
        height="3"
        rx="1.5"
        fill="#f0f0f0"
        stroke="#ccc"
        strokeWidth="0.4"
      />
      <rect
        x="82"
        y="36"
        width="22"
        height="3"
        rx="1.5"
        fill="#f0f0f0"
        stroke="#ccc"
        strokeWidth="0.4"
      />
      <rect x="18" y="37" width="18" height="1.5" rx="0.5" fill="#1c1c1c" opacity="0.4" />
      <rect x="51" y="37" width="18" height="1.5" rx="0.5" fill="#1c1c1c" opacity="0.4" />
      <rect x="84" y="37" width="18" height="1.5" rx="0.5" fill="#1c1c1c" opacity="0.4" />
      <rect x="4" y="42" width="112" height="0.5" fill="#1c1c1c" opacity="0.15" />
      {Array.from({ length: 10 }).map((_, i) => (
        <rect
          key={i}
          x={4 + i * 5}
          y="45"
          width="4"
          height="4"
          rx="0"
          fill="none"
          stroke="#1c1c1c"
          strokeWidth="0.5"
          opacity="0.35"
        />
      ))}
    </svg>
  );
}
