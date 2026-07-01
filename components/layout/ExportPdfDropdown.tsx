'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileStack, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { exportPreviewToPdf, exportCombinedPreviewToPdf, ExportProgress } from '@/lib/exportPdf';
import { ExportProgressOverlay } from './ExportProgressOverlay';

interface ExportPdfDropdownProps {
  previewRef: React.RefObject<HTMLDivElement>;
  answerKeyRef: React.RefObject<HTMLDivElement>;
  fileName: string;
}

type ExportKind = 'combined' | 'paper' | 'answerKey';

export function ExportPdfDropdown({
  previewRef,
  answerKeyRef,
  fileName,
}: Readonly<ExportPdfDropdownProps>) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  async function runExport(kind: ExportKind) {
    setOpen(false);
    if (exporting) return;
    setExporting(kind);
    setProgress({
      phase: 'preparing',
      pagesDone: 0,
      pagesTotal: 0,
      elapsedMs: 0,
      estimatedRemainingMs: null,
    });
    try {
      if (kind === 'combined') {
        if (!previewRef.current || !answerKeyRef.current) return;
        await exportCombinedPreviewToPdf(previewRef.current, answerKeyRef.current, {
          fileName: `${fileName}-with-answer-key`,
          onProgress: setProgress,
        });
      } else if (kind === 'paper') {
        if (!previewRef.current) return;
        await exportPreviewToPdf(previewRef.current, {
          fileName,
          pageClassName: 'pdf-page',
          onProgress: setProgress,
        });
      } else {
        if (!answerKeyRef.current) return;
        await exportPreviewToPdf(answerKeyRef.current, {
          fileName: `${fileName}-answer-key`,
          pageClassName: 'answer-key-page',
          onProgress: setProgress,
        });
      }
    } catch (err) {
      console.error('PDF export failed', err);
    } finally {
      setExporting(null);
      setProgress(null);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button variant="secondary" onClick={() => setOpen((o) => !o)} disabled={exporting !== null}>
        {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        Export PDF
        <ChevronDown size={14} />
      </Button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-60 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => runExport('combined')}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-stone-900 hover:bg-stone-100"
          >
            <FileStack size={14} />
            <span>
              Export PDF + answer key
              <span className="block text-[11px] font-normal text-stone-400">
                Single file, question paper then answers
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => runExport('paper')}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-100"
          >
            <Download size={14} />
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => runExport('answerKey')}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-100"
          >
            <KeyRound size={14} />
            Export answer key
          </button>
        </div>
      ) : null}

      <ExportProgressOverlay progress={progress} />
    </div>
  );
}

export default ExportPdfDropdown;