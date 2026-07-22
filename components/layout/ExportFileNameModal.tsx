// components/layout/ExportFileNameModal.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ExportFileNameModalProps {
  open: boolean;
  defaultValue: string;
  onCancel: () => void;
  onConfirm: (fileName: string) => void;
}

export function ExportFileNameModal({
  open,
  defaultValue,
  onCancel,
  onConfirm,
}: Readonly<ExportFileNameModalProps>) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [open, defaultValue]);

  if (!open) return null;

  function submit() {
    const trimmed = value.trim();
    onConfirm(trimmed || defaultValue);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-[2px]">
      <div className="w-96 rounded-2xl border border-stone-200 bg-white p-5 shadow-xl">
        <h2 className="text-sm font-semibold text-stone-800">Name your file</h2>
        <p className="mt-1 text-xs text-stone-400">
          This will be used as the exported PDF's file name.
        </p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onCancel();
          }}
          className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-500"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ExportFileNameModal;
