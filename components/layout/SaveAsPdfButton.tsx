// components/layout/SaveAsPdfButton.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Loader2 } from 'lucide-react';
import { exportPreviewToPdf } from '@/lib/exportPdf';
import { Button } from '@/components/ui/Button';

interface SaveAsPdfButtonProps {
  previewRef: React.RefObject<HTMLDivElement>;
  fileName: string;
  /** CSS class identifying each A4 page node — "pdf-page" for the question paper, "answer-key-page" for the answer key */
  pageClassName?: string;
  label?: string;
  variant?: 'primary' | 'secondary';
}

export function SaveAsPdfButton({
  previewRef,
  fileName,
  pageClassName = 'pdf-page',
  label = 'Save as PDF',
  variant = 'primary',
}: Readonly<SaveAsPdfButtonProps>) {
  const [status, setStatus] = useState<'idle' | 'exporting' | 'done'>('idle');
  const [progress, setProgress] = useState(0);

  async function handleSave() {
    if (!previewRef.current || status === 'exporting') return;
    setStatus('exporting');
    setProgress(0);
    try {
      await exportPreviewToPdf(previewRef.current, {
        fileName: fileName || 'question-paper',
        // @ts-expect-error ignore
        onProgress: setProgress,
        pageClassName,
      });
      setStatus('done');
      setTimeout(() => setStatus('idle'), 1800);
    } catch (err) {
      console.error('PDF export failed', err);
      setStatus('idle');
    }
  }

  return (
    <Button
      variant={variant}
      onClick={handleSave}
      disabled={status === 'exporting'}
      className="relative overflow-hidden"
    >
      {status === 'exporting' && (
        <motion.span
          className="absolute inset-y-0 left-0 bg-white/15"
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(progress * 100)}%` }}
          transition={{ duration: 0.15 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {status === 'exporting' ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Saving PDF…
          </>
        ) : status === 'done' ? (
          <>Saved ✓</>
        ) : (
          <>
            <Download size={15} />
            {label}
          </>
        )}
      </span>
    </Button>
  );
}

export default SaveAsPdfButton;
