// components/preview/PaperHeader.tsx
'use client';

import React from 'react';
import { PREVIEW_COLORS } from '@/lib/previewTheme';
import { ExamMetadata } from '@/types/exam';

const FONT_BASE = 11;

function getHeaderSizes(metadata: ExamMetadata) {
  const overrides = metadata.headerFontSizes ?? {};
  return {
    org: overrides.organisation ?? 15,
    orgCompact: Math.max(10, (overrides.organisation ?? 15) - 4),
    examTitle: overrides.title ?? 18,
    examTitleHi: Math.max(15, (overrides.title ?? 18) - 1),
    meta: overrides.meta ?? 12.5,
    metaCompact: Math.max(9, (overrides.meta ?? 12.5) - 2.5),
    candidate: Math.max(10, (overrides.meta ?? 12.5) - 1),
    note: Math.max(9, (overrides.meta ?? 12.5) - 2.5),
    instructionTitle: Math.max(11.5, (overrides.instructions ?? 11.5) + 1),
    instructionBody: overrides.instructions ?? 11.5,
    footer: overrides.footer ?? 12,
    coachingBadge: Math.max(14, (overrides.meta ?? 12.5) + 3),
    coachingTitleHi: Math.max(16, overrides.title ?? 18),
    coachingTitleEn: Math.max(12, (overrides.title ?? 18) - 4),
    coachingBar: Math.max(9, (overrides.meta ?? 12.5) - 2.5),
  };
}

// ─────────────────────────────────────────────────────────
//  Template: "classic"  (SSC / UPSC style — original)
// ─────────────────────────────────────────────────────────
function ClassicHeader({ metadata, fontSize }: { metadata: ExamMetadata; fontSize: number }) {
  const showHi = metadata.language !== 'en';
  const showEn = metadata.language !== 'hi';
  const sizes = getHeaderSizes(metadata);

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
              <p
                className="font-bold uppercase leading-tight tracking-wide"
                style={{ fontSize: `${sizes.org}px` }}
              >
                {metadata.organisation}
              </p>
            )}
            {showHi && metadata.organisationHi && (
              <p
                className="font-devanagari font-bold leading-tight"
                style={{ fontSize: `${sizes.org}px` }}
              >
                {metadata.organisationHi}
              </p>
            )}
          </div>
        </div>
        <div className="text-right leading-tight" style={{ fontSize: `${sizes.metaCompact}px` }}>
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
          <h1 className="font-bold uppercase" style={{ fontSize: `${sizes.examTitle}px` }}>
            {metadata.examTitle}
          </h1>
        )}
        {showHi && metadata.examTitleHi && (
          <h2 className="font-devanagari font-bold" style={{ fontSize: `${sizes.examTitleHi}px` }}>
            {metadata.examTitleHi}
          </h2>
        )}
      </div>

      <div
        className="mt-2 flex items-center justify-between border-y py-1 font-medium"
        style={{ borderColor: PREVIEW_COLORS.ruleBold, fontSize: `${sizes.meta}px` }}
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
        <CandidateFields metadata={metadata} fontSize={fontSize} />
      )}
      {metadata.negativeMarking?.enabled && (
        <NegMarkingNote metadata={metadata} fontSize={fontSize} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Template: "coaching"  (Bihar Police / Coaching Booklet)
//  Circle-number badge + bold title box + brand subbar
//  Page footer bar rendered separately via CoachingPageFooter
// ─────────────────────────────────────────────────────────
function CoachingHeader({ metadata, fontSize }: { metadata: ExamMetadata; fontSize: number }) {
  const showHi = metadata.language !== 'en';
  const showEn = metadata.language !== 'hi';
  const sizes = getHeaderSizes(metadata);

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
            className="flex items-center justify-center rounded-full border-2 font-extrabold"
            style={{
              width: 38,
              height: 38,
              borderColor: PREVIEW_COLORS.pageBackground,
              color: PREVIEW_COLORS.pageBackground,
              fontSize: `${sizes.coachingBadge}px`,
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
                <h1
                  className="font-devanagari font-extrabold leading-tight"
                  style={{ fontSize: `${sizes.coachingTitleHi}px` }}
                >
                  {metadata.examTitleHi}
                </h1>
              )}
              {showEn && metadata.examTitle && (
                <p
                  className="font-bold uppercase leading-tight opacity-70"
                  style={{ fontSize: `${sizes.coachingTitleEn}px` }}
                >
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
              className="flex items-center justify-between px-3 py-0.5 font-semibold"
              style={{
                backgroundColor: brandColor,
                color: '#fff',
                fontSize: `${sizes.coachingBar}px`,
              }}
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
        className="mt-1.5 flex items-center justify-between border-b pb-1 font-medium"
        style={{ borderColor: PREVIEW_COLORS.ruleBold, fontSize: `${sizes.meta}px` }}
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
        <CandidateFields metadata={metadata} fontSize={fontSize} />
      )}
      {metadata.negativeMarking?.enabled && (
        <NegMarkingNote metadata={metadata} fontSize={fontSize} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Template: "minimal"  (Clean modern / magazine style)
// ─────────────────────────────────────────────────────────
function MinimalHeader({ metadata, fontSize }: { metadata: ExamMetadata; fontSize: number }) {
  const showHi = metadata.language !== 'en';
  const showEn = metadata.language !== 'hi';
  const sizes = getHeaderSizes(metadata);

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
              <p
                className="font-semibold uppercase tracking-widest leading-tight"
                style={{ fontSize: `${sizes.orgCompact}px` }}
              >
                {metadata.organisation}
              </p>
            )}
            {showHi && metadata.organisationHi && (
              <p
                className="font-devanagari font-semibold leading-tight"
                style={{ fontSize: `${sizes.orgCompact}px` }}
              >
                {metadata.organisationHi}
              </p>
            )}
          </div>
        </div>
        <div className="text-right leading-snug" style={{ fontSize: `${sizes.metaCompact}px` }}>
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
          <h1
            className="font-extrabold uppercase tracking-wide leading-tight"
            style={{ fontSize: `${sizes.examTitleHi}px` }}
          >
            {metadata.examTitle}
          </h1>
        )}
        {showHi && metadata.examTitleHi && (
          <h2
            className="font-devanagari font-bold leading-tight"
            style={{ fontSize: `${sizes.org}px` }}
          >
            {metadata.examTitleHi}
          </h2>
        )}
      </div>

      <div className="my-1.5 h-px" style={{ backgroundColor: PREVIEW_COLORS.ruleBold }} />

      <div
        className="flex items-center justify-center gap-5"
        style={{ fontSize: `${sizes.meta}px` }}
      >
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
        <CandidateFields metadata={metadata} fontSize={fontSize} />
      )}
      {metadata.negativeMarking?.enabled && (
        <NegMarkingNote metadata={metadata} fontSize={fontSize} />
      )}
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
  fontSize = FONT_BASE,
}: {
  metadata: ExamMetadata;
  pageNumber: number;
  totalPages: number;
  fontSize?: number;
}) {
  const brandColor = metadata.footerBrandColor ?? '#1a1a1a';
  const footerText = metadata.footerBrandText ?? '';
  const sizes = getHeaderSizes(metadata);

  return (
    <div
      data-page-footer="true"
      className="absolute bottom-0 left-0 right-0 flex items-stretch overflow-hidden border-t-2"
      style={{ borderColor: brandColor }}
    >
      {/* Left dark block — mirrors the header circle badge width */}
      <div
        className="flex shrink-0 items-center justify-center font-bold"
        style={{
          width: 58,
          backgroundColor: brandColor,
          color: '#fff',
          minHeight: 22,
          fontSize: `${sizes.footer}px`,
        }}
      >
        {pageNumber}
      </div>

      {/* Centre: institute / channel name */}
      <div
        className="flex flex-1 items-center px-3 font-semibold"
        style={{
          backgroundColor: brandColor,
          color: '#fff',
          fontSize: `${sizes.footer}px`,
        }}
      >
        {footerText && (
          <span style={{ fontFamily: 'var(--font-devanagari, inherit)' }}>{footerText}</span>
        )}
        {!footerText && <span className="opacity-40">Test PDF</span>}
      </div>

      {/* Right: page number */}
      <div
        className="flex shrink-0 items-center justify-center border-l-2 px-3 font-bold"
        style={{
          borderColor: 'rgba(255,255,255,0.25)',
          backgroundColor: brandColor,
          color: '#fff',
          minHeight: 22,
          fontSize: `${sizes.footer}px`,
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
function CandidateFields({
  metadata,
  fontSize = FONT_BASE,
}: {
  metadata: ExamMetadata;
  fontSize?: number;
}) {
  const sizes = getHeaderSizes(metadata);
  return (
    <div className="mt-2 flex items-center gap-3" style={{ fontSize: `${sizes.candidate}px` }}>
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

function NegMarkingNote({
  metadata,
  fontSize = FONT_BASE,
}: {
  metadata: ExamMetadata;
  fontSize?: number;
}) {
  const showHi = metadata.language !== 'en';
  const sizes = getHeaderSizes(metadata);
  return (
    <p className="mt-1.5 text-center font-medium italic" style={{ fontSize: `${sizes.note}px` }}>
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
export function PaperHeader({
  metadata,
  fontSize = FONT_BASE,
}: Readonly<{ metadata: ExamMetadata; fontSize?: number }>) {
  const tpl = metadata.headerTemplate ?? 'classic';
  if (tpl === 'coaching') return <CoachingHeader metadata={metadata} fontSize={fontSize} />;
  if (tpl === 'minimal') return <MinimalHeader metadata={metadata} fontSize={fontSize} />;
  return <ClassicHeader metadata={metadata} fontSize={fontSize} />;
}

export function InstructionsBlock({
  metadata,
  fontSize = FONT_BASE,
}: Readonly<{ metadata: ExamMetadata; fontSize?: number }>) {
  const showHi = metadata.language !== 'en';
  const showEn = metadata.language !== 'hi';
  const sizes = getHeaderSizes(metadata);

  const enabled = metadata.generalInstructionsEnabled ?? true;
  if (!enabled || metadata.generalInstructions.length === 0) return null;

  return (
    <div
      className="mt-2 border p-2 leading-snug"
      style={{ borderColor: PREVIEW_COLORS.ruleBold, fontSize: `${sizes.instructionBody}px` }}
    >
      <p
        className="mb-1 text-center font-bold uppercase"
        style={{ fontSize: `${sizes.instructionTitle}px` }}
      >
        General Instructions{showHi ? ' / सामान्य निर्देश' : ''}
      </p>
      <ol className="list-decimal space-y-0.5 pl-4">
        {metadata.generalInstructions.map((ins, i) => (
          <li key={i}>
            {showEn && <span style={{ fontSize: `${sizes.instructionBody}px` }}>{ins}</span>}
            {showHi && metadata.generalInstructionsHi?.[i] && (
              <span
                className="font-devanagari block"
                style={{
                  color: PREVIEW_COLORS.quaternaryText,
                  fontSize: `${sizes.instructionBody}px`,
                }}
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

// ─────────────────────────────────────────────────────────
//  HeaderBanner — replaces the entire template header +
//  instructions block with a single full-width image.
// ─────────────────────────────────────────────────────────
export function HeaderBanner({ imageUrl }: Readonly<{ imageUrl: string }>) {
  return (
    <div
      className="mb-2 w-full select-none overflow-hidden"
      style={{ height: 393, maxHeight: 393 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Exam header"
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
      />
    </div>
  );
}
