// components/layout/ExportProgressOverlay.tsx
'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { ExportProgress } from '@/lib/exportPdf';

interface ExportProgressOverlayProps {
  progress: ExportProgress | null;
}

const PHASE_LABEL: Record<ExportProgress['phase'], string> = {
  preparing: 'Preparing…',
  rendering: 'Rendering pages…',
  building: 'Building PDF…',
  done: 'Done',
};

function formatSeconds(ms: number | null): string | null {
  if (ms === null) return null;
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

/**
 * Full-screen-ish blocking overlay shown while a PDF export is in progress.
 * Pass the ExportProgress object straight through from the onProgress
 * callback passed to exportPreviewToPdf / exportCombinedPreviewToPdf.
 * Render nothing (or unmount) when progress is null.
 */
export function ExportProgressOverlay({ progress }: Readonly<ExportProgressOverlayProps>) {
  if (!progress || progress.phase === 'done') return null;

  const { phase, pagesDone, pagesTotal, estimatedRemainingMs } = progress;
  const pct =
    pagesTotal > 0 ? Math.min(100, Math.round((pagesDone / pagesTotal) * 100)) : phase === 'building' ? 100 : 0;
  const remainingLabel = formatSeconds(estimatedRemainingMs);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-[2px]">
      <div className="flex w-72 flex-col items-center gap-4 rounded-2xl border border-stone-200 bg-white px-6 py-6 shadow-xl">
        <Loader2 size={22} className="animate-spin text-stone-700" />

        <div className="flex w-full flex-col items-center gap-1.5">
          <p className="text-sm font-medium text-stone-800">{PHASE_LABEL[phase]}</p>
          {phase === 'rendering' && pagesTotal > 0 ? (
            <p className="text-xs text-stone-400">
              Page {pagesDone} of {pagesTotal}
              {remainingLabel ? ` · ~${remainingLabel} left` : ''}
            </p>
          ) : null}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-stone-900 transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default ExportProgressOverlay;