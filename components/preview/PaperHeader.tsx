// components/preview/PaperHeader.tsx
'use client';

import React from 'react';
import { PREVIEW_COLORS } from '@/lib/previewTheme';
import { ExamMetadata } from '@/types/exam';

// ─────────────────────────────────────────────────────────
//  Template: "classic"  (SSC / UPSC style — original)
// ─────────────────────────────────────────────────────────
function ClassicHeader({ metadata }: { metadata: ExamMetadata }) {
  const showHi = metadata.language !== 'en';
  const showEn = metadata.language !== 'hi';

  return (
    <div className="select-none border-b-2 pb-2" style={{ borderColor: PREVIEW_COLORS.pageText }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {metadata.logoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={metadata.logoDataUrl} alt="" className="h-12 w-12 object-contain" />
          )}
          <div>
            {showEn && metadata.organisation && (
              <p className="text-[13px] font-bold uppercase leading-tight tracking-wide">
                {metadata.organisation}
              </p>
            )}
            {showHi && metadata.organisationHi && (
              <p className="font-devanagari text-[13px] font-bold leading-tight">
                {metadata.organisationHi}
              </p>
            )}
          </div>
        </div>
        <div className="text-right text-[10px] leading-tight">
          {metadata.examCode && <p className="font-semibold">{metadata.examCode}</p>}
          {metadata.setCode && (
            <p
              className="mt-0.5 inline-block rounded border px-1.5 py-0.5 font-bold"
              style={{ borderColor: PREVIEW_COLORS.pageText }}
            >
              SET — {metadata.setCode}
              {metadata.bookletSeries && ` · ${metadata.bookletSeries}`}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 text-center">
        {showEn && metadata.examTitle && (
          <h1 className="text-[15px] font-bold uppercase">{metadata.examTitle}</h1>
        )}
        {showHi && metadata.examTitleHi && (
          <h2 className="font-devanagari text-[14px] font-bold">{metadata.examTitleHi}</h2>
        )}
      </div>

      <div
        className="mt-2 flex items-center justify-between border-y py-1 text-[10.5px] font-medium"
        style={{ borderColor: PREVIEW_COLORS.ruleBold }}
      >
        <span>
          Time: <strong>{metadata.duration}</strong>
        </span>
        <span>
          Date: <strong>{metadata.date ? formatDate(metadata.date) : '—'}</strong>
        </span>
        <span>
          Max. Marks: <strong>{metadata.maxMarks}</strong>
        </span>
      </div>

      {(metadata.rollNoLabel || metadata.candidateNameLabel) && (
        <CandidateFields metadata={metadata} />
      )}
      {metadata.negativeMarking?.enabled && <NegMarkingNote metadata={metadata} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Template: "coaching"  (Bihar Police / Coaching Booklet)
//  Circle-number badge + bold title box + brand subbar
//  Page footer bar rendered separately via CoachingPageFooter
// ─────────────────────────────────────────────────────────
function CoachingHeader({ metadata }: { metadata: ExamMetadata }) {
  const showHi = metadata.language !== 'en';
  const showEn = metadata.language !== 'hi';

  // Circle badge shows coachingSetNumber if set, else falls back to setCode, else '01'
  const badgeNum = (metadata.coachingSetNumber ?? metadata.setCode ?? '01')
    .toString()
    .padStart(2, '0');

  const brandColor = metadata.footerBrandColor ?? '#1a1a1a';
  const headerBrandText = metadata.footerBrand ?? '';

  return (
    <div className="select-none">
      {/* ── Main title box ─────────────────────────────── */}
      <div
        className="flex items-stretch overflow-hidden border-2"
        style={{ borderColor: PREVIEW_COLORS.pageText }}
      >
        {/* Left: dark block with circle badge */}
        <div
          className="flex shrink-0 flex-col items-center justify-center gap-0"
          style={{ width: 58, backgroundColor: brandColor }}
        >
          <span
            className="flex items-center justify-center rounded-full border-2 text-[15px] font-extrabold"
            style={{
              width: 38,
              height: 38,
              borderColor: PREVIEW_COLORS.pageBackground,
              color: PREVIEW_COLORS.pageBackground,
            }}
          >
            {badgeNum}
          </span>
        </div>

        {/* Right: title + optional header brand subbar */}
        <div className="flex flex-1 flex-col">
          {/* Title row */}
          <div className="flex flex-1 items-center justify-between px-3 py-2">
            <div>
              {showHi && metadata.examTitleHi && (
                <h1 className="font-devanagari text-[16px] font-extrabold leading-tight">
                  {metadata.examTitleHi}
                </h1>
              )}
              {showEn && metadata.examTitle && (
                <p className="text-[12px] font-bold uppercase leading-tight opacity-70">
                  {metadata.examTitle}
                </p>
              )}
            </div>
            {metadata.logoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={metadata.logoDataUrl} alt="" className="h-10 w-10 object-contain" />
            )}
          </div>

          {/* Header brand subbar — sits flush at the bottom of the box */}
          {headerBrandText && (
            <div
              className="flex items-center justify-between px-3 py-0.5 text-[9px] font-semibold"
              style={{ backgroundColor: brandColor, color: '#fff' }}
            >
              <span style={{ fontFamily: 'var(--font-devanagari, inherit)' }}>
                {headerBrandText}
              </span>
              <span className="ml-3 flex shrink-0 items-center gap-2">
                {metadata.bookletSeries && (
                  <span className="tracking-wide">{metadata.bookletSeries}</span>
                )}
                {metadata.examCode && (
                  <span className="font-mono tracking-wide">{metadata.examCode}</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Meta info row ──────────────────────────────── */}
      <div
        className="mt-1.5 flex items-center justify-between border-b pb-1 text-[10px] font-medium"
        style={{ borderColor: PREVIEW_COLORS.ruleBold }}
      >
        <span>
          {showEn && metadata.organisation && (
            <strong className="uppercase">{metadata.organisation}</strong>
          )}
          {showHi && metadata.organisationHi && (
            <span className="font-devanagari ml-1">{metadata.organisationHi}</span>
          )}
          {metadata.bookletSeries && (
            <span className="ml-2 text-[9px] font-semibold uppercase tracking-widest">
              · {metadata.bookletSeries}
            </span>
          )}
        </span>
        <span className="flex items-center gap-3">
          <span>
            समय / Time: <strong>{metadata.duration}</strong>
          </span>
          <span>
            दिनांक / Date: <strong>{metadata.date ? formatDate(metadata.date) : '—'}</strong>
          </span>
          <span>
            पूर्णांक / Marks: <strong>{metadata.maxMarks}</strong>
          </span>
        </span>
      </div>

      {/* Candidate fields only if explicitly re-enabled */}
      {(metadata.rollNoLabel || metadata.candidateNameLabel) && (
        <CandidateFields metadata={metadata} />
      )}
      {metadata.negativeMarking?.enabled && <NegMarkingNote metadata={metadata} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Template: "minimal"  (Clean modern / magazine style)
// ─────────────────────────────────────────────────────────
function MinimalHeader({ metadata }: { metadata: ExamMetadata }) {
  const showHi = metadata.language !== 'en';
  const showEn = metadata.language !== 'hi';

  return (
    <div className="select-none pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {metadata.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={metadata.logoDataUrl} alt="" className="h-10 w-10 object-contain" />
          ) : (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-[9px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: PREVIEW_COLORS.pageText,
                color: PREVIEW_COLORS.pageBackground,
              }}
            >
              {(metadata.organisation || 'ORG').slice(0, 3)}
            </div>
          )}
          <div>
            {showEn && metadata.organisation && (
              <p className="text-[11px] font-semibold uppercase tracking-widest leading-tight">
                {metadata.organisation}
              </p>
            )}
            {showHi && metadata.organisationHi && (
              <p className="font-devanagari text-[11px] font-semibold leading-tight">
                {metadata.organisationHi}
              </p>
            )}
          </div>
        </div>
        <div className="text-right text-[9.5px] leading-snug">
          {metadata.examCode && (
            <p className="font-mono font-semibold tracking-wide">{metadata.examCode}</p>
          )}
          {metadata.setCode && (
            <p
              className="text-[9px] uppercase tracking-widest"
              style={{ color: PREVIEW_COLORS.mutedText }}
            >
              Set {metadata.setCode} {metadata.bookletSeries && `· ${metadata.bookletSeries}`}
            </p>
          )}
        </div>
      </div>

      <div className="my-1.5 h-[2px]" style={{ backgroundColor: PREVIEW_COLORS.pageText }} />

      <div className="text-center">
        {showEn && metadata.examTitle && (
          <h1 className="text-[14px] font-extrabold uppercase tracking-wide leading-tight">
            {metadata.examTitle}
          </h1>
        )}
        {showHi && metadata.examTitleHi && (
          <h2 className="font-devanagari text-[13px] font-bold leading-tight">
            {metadata.examTitleHi}
          </h2>
        )}
      </div>

      <div className="my-1.5 h-px" style={{ backgroundColor: PREVIEW_COLORS.ruleBold }} />

      <div className="flex items-center justify-center gap-5 text-[10px]">
        <span className="flex items-center gap-1">
          <span style={{ color: PREVIEW_COLORS.mutedText }}>⏱</span>
          <strong>{metadata.duration}</strong>
        </span>
        <span className="text-[8px]" style={{ color: PREVIEW_COLORS.mutedText }}>
          |
        </span>
        <span className="flex items-center gap-1">
          <span style={{ color: PREVIEW_COLORS.mutedText }}>📅</span>
          <strong>{metadata.date ? formatDate(metadata.date) : '—'}</strong>
        </span>
        <span className="text-[8px]" style={{ color: PREVIEW_COLORS.mutedText }}>
          |
        </span>
        <span className="flex items-center gap-1">
          <span style={{ color: PREVIEW_COLORS.mutedText }}>✦</span>
          <strong>{metadata.maxMarks} Marks</strong>
        </span>
      </div>

      <div
        className="my-1.5 h-px"
        style={{ backgroundColor: PREVIEW_COLORS.ruleBold, opacity: 0.3 }}
      />

      {(metadata.rollNoLabel || metadata.candidateNameLabel) && (
        <CandidateFields metadata={metadata} />
      )}
      {metadata.negativeMarking?.enabled && <NegMarkingNote metadata={metadata} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  CoachingPageFooter — rendered at the absolute bottom of
//  every Page in A4Preview when template === 'coaching'.
//  It mirrors the header's dark-bar aesthetic.
// ─────────────────────────────────────────────────────────
export function CoachingPageFooter({
  metadata,
  pageNumber,
  totalPages,
}: {
  metadata: ExamMetadata;
  pageNumber: number;
  totalPages: number;
}) {
  const brandColor = metadata.footerBrandColor ?? '#1a1a1a';
  const footerText = metadata.footerBrandText ?? '';

  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-stretch overflow-hidden border-t-2"
      style={{ borderColor: brandColor }}
    >
      {/* Left dark block — mirrors the header circle badge width */}
      <div
        className="flex shrink-0 items-center justify-center text-[9px] font-bold"
        style={{ width: 58, backgroundColor: brandColor, color: '#fff', minHeight: 22 }}
      >
        {pageNumber}
      </div>

      {/* Centre: institute / channel name */}
      <div
        className="flex flex-1 items-center px-3 text-[9px] font-semibold"
        style={{ backgroundColor: brandColor, color: '#fff' }}
      >
        {footerText && (
          <span style={{ fontFamily: 'var(--font-devanagari, inherit)' }}>{footerText}</span>
        )}
        {!footerText && <span className="opacity-40">Custom PDF Creator</span>}
      </div>

      {/* Right: page number */}
      <div
        className="flex shrink-0 items-center justify-center border-l-2 px-3 text-[9px] font-bold"
        style={{
          borderColor: 'rgba(255,255,255,0.25)',
          backgroundColor: brandColor,
          color: '#fff',
          minHeight: 22,
        }}
      >
        {pageNumber}/{totalPages}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Shared sub-components
// ─────────────────────────────────────────────────────────
function CandidateFields({ metadata }: { metadata: ExamMetadata }) {
  return (
    <div className="mt-2 flex items-center gap-3 text-[10.5px]">
      {metadata.rollNoLabel && (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold">Roll No.</span>
          <div className="flex">
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className="h-5 w-4 border"
                style={{ borderColor: PREVIEW_COLORS.ruleStrong }}
              />
            ))}
          </div>
        </div>
      )}
      {metadata.candidateNameLabel && (
        <div className="flex flex-1 items-center gap-1.5">
          <span className="shrink-0 font-semibold">Candidate Name</span>
          <span
            className="flex-1 border-b border-dotted"
            style={{ borderColor: PREVIEW_COLORS.ruleStrong }}
          />
        </div>
      )}
    </div>
  );
}

function NegMarkingNote({ metadata }: { metadata: ExamMetadata }) {
  const showHi = metadata.language !== 'en';
  return (
    <p className="mt-1.5 text-center text-[10px] font-medium italic">
      Note: {metadata.negativeMarking!.value} marks will be deducted for each wrong answer.
      {showHi && (
        <span className="font-devanagari">
          {' '}
          प्रत्येक गलत उत्तर के लिए {metadata.negativeMarking!.value} अंक काटे जाएंगे।
        </span>
      )}
    </p>
  );
}

// ─────────────────────────────────────────────────────────
//  Main router export
// ─────────────────────────────────────────────────────────
export function PaperHeader({ metadata }: Readonly<{ metadata: ExamMetadata }>) {
  const tpl = metadata.headerTemplate ?? 'classic';
  if (tpl === 'coaching') return <CoachingHeader metadata={metadata} />;
  if (tpl === 'minimal') return <MinimalHeader metadata={metadata} />;
  return <ClassicHeader metadata={metadata} />;
}

export function InstructionsBlock({ metadata }: Readonly<{ metadata: ExamMetadata }>) {
  const showHi = metadata.language !== 'en';
  const showEn = metadata.language !== 'hi';

  const enabled = metadata.generalInstructionsEnabled ?? true;
  if (!enabled || metadata.generalInstructions.length === 0) return null;

  return (
    <div
      className="mt-2 border p-2 text-[10px] leading-snug"
      style={{ borderColor: PREVIEW_COLORS.ruleBold }}
    >
      <p className="mb-1 text-center text-[10.5px] font-bold uppercase">
        General Instructions{showHi ? ' / सामान्य निर्देश' : ''}
      </p>
      <ol className="list-decimal space-y-0.5 pl-4">
        {metadata.generalInstructions.map((ins, i) => (
          <li key={i}>
            {showEn && <span>{ins}</span>}
            {showHi && metadata.generalInstructionsHi?.[i] && (
              <span
                className="font-devanagari block text-[9.5px]"
                style={{ color: PREVIEW_COLORS.quaternaryText }}
              >
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
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}
