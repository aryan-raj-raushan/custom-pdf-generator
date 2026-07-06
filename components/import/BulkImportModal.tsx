// components/import/BulkImportModal.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  FileWarning,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { parseBulkImportText, FLAG_LABELS } from '@/lib/bulkImportParser';
import { extractDocxForImport } from '@/lib/docxImportTextParser';
import { Button } from '@/components/ui/Button';
import { Select, TextArea } from '@/components/ui/Field';
import { Subject } from '../layout/CustomPdfCreator';

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (result: ReturnType<typeof parseBulkImportText>) => void;
}

const SUBJECT_OPTIONS: { value: Subject; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'reasoning', label: 'Reasoning' },
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'gk', label: 'GK / Current Affairs' },
];

type SourceMode = 'paste' | 'docx';

export function BulkImportModal({ open, onClose, onImport }: Readonly<BulkImportModalProps>) {
  const [sourceMode, setSourceMode] = useState<SourceMode>('paste');
  const [text, setText] = useState('');
  const [subject, setSubject] = useState<Subject>('general');

  // docx-specific state. `images` is kept out of parseBulkImportText's
  // input text itself — it's passed alongside as a sentinel map, see
  // bulkImportParser's `images` option.
  const [docxImages, setDocxImages] = useState<Map<number, string>>(new Map());
  const [docxFileName, setDocxFileName] = useState<string | null>(null);
  const [docxStatus, setDocxStatus] = useState<'idle' | 'reading' | 'error'>('idle');
  const [docxError, setDocxError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const result = useMemo(
    () => parseBulkImportText(text, { defaultSubject: subject, images: docxImages }),
    [text, subject, docxImages],
  );
  const hasContent = text.trim().length > 0;

  function resetAll() {
    setText('');
    setDocxImages(new Map());
    setDocxFileName(null);
    setDocxStatus('idle');
    setDocxError(null);
  }

  const importedRef = React.useRef(false);

  useEffect(() => {
    if (open) importedRef.current = false;
  }, [open]);

  function handleImport() {
    if (result.totalParsed === 0 || importedRef.current) return;
    importedRef.current = true;
    onImport(result);
    resetAll();
    onClose();
  }

  function handleModalClose() {
    resetAll();
    importedRef.current = false;
    onClose();
  }

  const processDocxFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setDocxStatus('error');
      setDocxError(
        "That doesn't look like a .docx file. Legacy .doc files need to be saved as .docx first.",
      );
      return;
    }

    setDocxStatus('reading');
    setDocxError(null);
    setDocxFileName(file.name);

    try {
      const extraction = await extractDocxForImport(file);
      setText(extraction.text);
      setDocxImages(extraction.images);
      setDocxStatus('idle');
    } catch (err) {
      setDocxStatus('error');
      setDocxError(
        "Couldn't read this file — it may be corrupted, password-protected, or not a valid Word document.",
      );
      setText('');
      setDocxImages(new Map());
    }
  }, []);

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processDocxFile(file);
    e.target.value = ''; // allow re-selecting the same file after a fix
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processDocxFile(file);
  }

  function switchMode(mode: SourceMode) {
    if (mode === sourceMode) return;
    resetAll();
    setSourceMode(mode);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          onClick={handleModalClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-900 text-white">
                  <ClipboardPaste size={15} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">Bulk import questions</h2>
                  <p className="text-[11px] text-stone-400">
                    Paste text or upload a Word document — we&apos;ll parse it automatically
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleModalClose}
                className="text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Source mode toggle */}
            <div className="flex items-center gap-1 border-b border-stone-100 px-5 py-2.5">
              <ModeButton
                active={sourceMode === 'paste'}
                onClick={() => switchMode('paste')}
                icon={<ClipboardPaste size={13} />}
                label="Paste text"
              />
              <ModeButton
                active={sourceMode === 'docx'}
                onClick={() => switchMode('docx')}
                icon={<UploadCloud size={13} />}
                label="Upload .docx"
              />
              {sourceMode === 'docx' && (
                <span className="ml-auto text-[11px] text-stone-400">
                  Images embedded in the document are kept automatically
                </span>
              )}
            </div>

            {/* Body */}
            <div className="flex flex-1 gap-4 overflow-hidden p-5">
              <div className="flex w-1/2 flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-stone-700">
                    {sourceMode === 'paste' ? 'Paste your questions' : 'Source document'}
                  </label>
                  <div className="w-44">
                    <Select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value as Subject)}
                      className="!py-1 !text-xs"
                    >
                      {SUBJECT_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {sourceMode === 'paste' ? (
                  <>
                    <TextArea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={`1. What is the capital of France?\nA. Berlin\nB. Paris\nC. Madrid\nD. Rome\nAnswer: B\nSolution: Paris has been the capital since the 10th century.\n\n2. Next question...`}
                      className="flex-1 resize-none font-mono text-xs leading-relaxed"
                      style={{ minHeight: 0 }}
                    />
                    <p className="text-[11px] text-stone-400">
                      Answer and Solution lines are optional — questions without them still import,
                      just flagged for follow-up. Images can&apos;t be pasted into plain text —
                      switch to &ldquo;Upload .docx&rdquo; if your questions have diagrams.
                    </p>
                  </>
                ) : (
                  <DocxDropZone
                    fileName={docxFileName}
                    status={docxStatus}
                    error={docxError}
                    isDragging={isDraggingFile}
                    imageCount={docxImages.size}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={handleDrop}
                    onFileInputChange={handleFileInputChange}
                    onReplace={resetAll}
                  />
                )}
              </div>

              {/* Live preview */}
              <div className="flex w-1/2 flex-col gap-3 overflow-hidden">
                <label className="text-[13px] font-medium text-stone-700">Preview</label>

                {!hasContent ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-stone-200 text-center text-stone-400">
                    <Sparkles size={20} />
                    <p className="px-8 text-xs">
                      {sourceMode === 'paste'
                        ? "Paste text on the left and we'll parse it live here"
                        : "Upload a .docx on the left and we'll parse it live here"}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <StatCard label="Questions found" value={result.totalParsed} tone="neutral" />
                      <StatCard label="Clean" value={result.totalClean} tone="good" />
                      <StatCard
                        label="Need attention"
                        value={result.flaggedQuestions.length}
                        tone="warn"
                      />
                    </div>

                    {sourceMode === 'docx' && docxImages.size > 0 && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] text-emerald-700">
                        {docxImages.size} image{docxImages.size === 1 ? '' : 's'} found in the
                        document and matched to questions or options automatically.
                      </div>
                    )}

                    {result.unparsedPreamble.length > 0 && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-700">
                        {result.unparsedPreamble.length} line(s) before the first question were
                        ignored (e.g. a title or header you pasted by accident).
                      </div>
                    )}

                    <div className="flex-1 space-y-1.5 overflow-y-auto rounded-lg border border-stone-100 p-2">
                      {result.questions.map((q) => {
                        const flagged = (q.importFlags?.length ?? 0) > 0;
                        return (
                          <div
                            key={q.id}
                            className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-xs ${
                              flagged ? 'bg-amber-50' : 'bg-stone-50'
                            }`}
                          >
                            {flagged ? (
                              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                            ) : (
                              <CheckCircle2
                                size={13}
                                className="mt-0.5 shrink-0 text-emerald-500"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-stone-700">
                                <span className="font-medium text-stone-400">
                                  Q{q.importSourceIndex}.
                                </span>{' '}
                                {(q.textEn || q.textHi || '(empty)').slice(0, 70)}
                              </p>
                              {q.imageDataUrl && (
                                <span className="mt-0.5 inline-block text-[10px] text-emerald-600">
                                  Question image attached
                                </span>
                              )}
                              {flagged && (
                                <p className="mt-0.5 text-[10px] text-amber-600">
                                  {q.importFlags!.map((f) => FLAG_LABELS[f.type]).join(' · ')}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-stone-100 px-5 py-3.5">
              <p className="text-xs text-stone-400">
                {result.totalParsed > 0
                  ? `${result.totalParsed} question${result.totalParsed === 1 ? '' : 's'} ready to import`
                  : 'Nothing to import yet'}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleModalClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleImport}
                  disabled={result.totalParsed === 0}
                >
                  Import {result.totalParsed > 0 ? result.totalParsed : ''} question
                  {result.totalParsed === 1 ? '' : 's'}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: Readonly<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function DocxDropZone({
  fileName,
  status,
  error,
  isDragging,
  imageCount,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputChange,
  onReplace,
}: Readonly<{
  fileName: string | null;
  status: 'idle' | 'reading' | 'error';
  error: string | null;
  isDragging: boolean;
  imageCount: number;
  onDragOver: (e: React.DragEvent<HTMLLabelElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLLabelElement>) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReplace: () => void;
}>) {
  const inputId = 'bulk-import-docx-input';

  if (fileName && status !== 'error') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-6 text-center">
        {status === 'reading' ? (
          <>
            <Loader2 size={20} className="animate-spin text-stone-400" />
            <p className="text-xs text-stone-500">Reading {fileName}…</p>
          </>
        ) : (
          <>
            <CheckCircle2 size={20} className="text-emerald-500" />
            <p className="max-w-full truncate text-xs font-medium text-stone-700">{fileName}</p>
            {imageCount > 0 && (
              <p className="text-[11px] text-stone-400">
                {imageCount} image{imageCount === 1 ? '' : 's'} extracted
              </p>
            )}
            <Button size="sm" variant="ghost" onClick={onReplace} className="mt-1">
              Choose a different file
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <label
        htmlFor={inputId}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 text-center transition-colors ${
          isDragging
            ? 'border-stone-400 bg-stone-50'
            : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50/60'
        }`}
      >
        <UploadCloud size={22} className="text-stone-400" />
        <p className="text-xs font-medium text-stone-600">
          Drop a .docx file here, or click to browse
        </p>
        <p className="text-[11px] text-stone-400">
          Images embedded in the document import automatically
        </p>
        <input
          id={inputId}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={onFileInputChange}
        />
      </label>
      {status === 'error' && error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
          <FileWarning size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: Readonly<{ label: string; value: number; tone: 'neutral' | 'good' | 'warn' }>) {
  const toneClasses = {
    neutral: 'bg-stone-50 text-stone-700',
    good: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-amber-50 text-amber-700',
  }[tone];

  return (
    <div className={`rounded-md px-2.5 py-2 ${toneClasses}`}>
      <p className="text-lg font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[10px] leading-tight opacity-80">{label}</p>
    </div>
  );
}

export default BulkImportModal;
