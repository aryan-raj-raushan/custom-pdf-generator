'use client';

import React, { useState, useTransition, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Trash2,
  Pencil,
  Clock,
  BookOpen,
  Layers,
  LogOut,
  X,
  Loader2,
  FileCheck2,
  FileClock,
  Eye,
  Lock,
  BarChart2,
  TrendingUp,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { createEmptyMetadata, createEmptySection } from '@/components/layout/CustomPdfCreator';
import Image from 'next/image';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const ACCENT = '#1744F2';
const ACCENT_LIGHT = '#EEF2FF';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PaperMeta {
  _id: string;
  name: string;
  status: 'draft' | 'saved';
  createdAt: string;
  updatedAt: string;
  meta: {
    examTitle: string;
    organisation: string;
    totalQuestions: number;
    sections: number;
    date: string;
    language: string;
  };
}

interface DashboardClientProps {
  initialPapers: PaperMeta[];
  userRole: 'superadmin' | 'user';
  userPermission: 'edit' | 'view';
  projectCount: number;
  maxProjects: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const LANG_LABEL: Record<string, string> = {
  en: 'English',
  hi: 'हिंदी',
  bilingual: 'Bilingual',
};

// ─── New Paper Modal ──────────────────────────────────────────────────────────
function NewPaperModal({
  open,
  onClose,
  onCreate,
}: Readonly<{ open: boolean; onClose: () => void; onCreate: (name: string) => Promise<void> }>) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a project name.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onCreate(name.trim());
      setName('');
    } catch {
      setError('Failed to create paper. Please try again.');
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName('');
      setError('');
      setLoading(false);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-md rounded-md border border-gray-200 bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900">New paper</h2>
                <p className="mt-0.5 text-[12px] text-gray-400">
                  Give it a name — you can rename it anytime.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="e.g. SSC CGL Mock Test 1"
                className="w-full rounded border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-300 focus:border-gray-400 focus:bg-white transition-colors"
                maxLength={120}
              />
              {error && (
                <p className="rounded border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-600">
                  {error}
                </p>
              )}
              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded px-4 py-2 text-[13px] text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex items-center gap-1.5 rounded px-4 py-2 text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ background: loading || !name.trim() ? '#9CA3AF' : ACCENT }}
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  {loading ? 'Creating…' : 'Create & open'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({
  paper,
  onClose,
  onConfirm,
}: Readonly<{ paper: PaperMeta | null; onClose: () => void; onConfirm: () => Promise<void> }>) {
  const [loading, setLoading] = useState(false);
  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  }

  return (
    <AnimatePresence>
      {paper && (
        <motion.div
          key="del-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) onClose();
          }}
        >
          <motion.div
            key="del-modal"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-sm rounded-md border border-gray-200 bg-white p-6 shadow-2xl"
          >
            <h2 className="text-[15px] font-bold text-gray-900">Delete paper?</h2>
            <p className="mt-2 text-[13px] text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-800">{paper.name}</span> will be permanently
              deleted. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded px-4 py-2 text-[13px] text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="flex items-center gap-1.5 rounded bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {loading ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Rename Modal ─────────────────────────────────────────────────────────────
function RenameModal({
  paper,
  onClose,
  onRename,
}: Readonly<{
  paper: PaperMeta | null;
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
}>) {
  const [name, setName] = useState(paper?.name ?? '');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (paper) setName(paper.name);
  }, [paper]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onRename(name.trim());
    setLoading(false);
  }

  return (
    <AnimatePresence>
      {paper && (
        <motion.div
          key="ren-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) onClose();
          }}
        >
          <motion.div
            key="ren-modal"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md rounded-md border border-gray-200 bg-white p-6 shadow-2xl"
          >
            <h2 className="mb-4 text-[15px] font-bold text-gray-900">Rename paper</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none focus:border-gray-400 focus:bg-white transition-colors"
                maxLength={120}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded px-4 py-2 text-[13px] text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex items-center gap-1.5 rounded px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50 transition-colors"
                  style={{ background: ACCENT }}
                >
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  {loading ? 'Saving…' : 'Rename'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Usage Bar ────────────────────────────────────────────────────────────────
function UsageBar({ count, max }: { count: number; max: number }) {
  const pct = Math.min((count / max) * 100, 100);
  const isNear = pct >= 80;
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: isNear ? '#EF4444' : ACCENT }}
        />
      </div>
      <span className="text-[11px] text-gray-400 tabular-nums">
        {count}/{max}
      </span>
    </div>
  );
}

// ─── Paper Card ───────────────────────────────────────────────────────────────
function PaperCard({
  paper,
  canEdit,
  onDelete,
  onRename,
}: Readonly<{
  paper: PaperMeta;
  canEdit: boolean;
  onDelete: () => void;
  onRename: () => void;
}>) {
  const router = useRouter();
  const isDraft = paper.status === 'draft';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/editor/${paper._id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/editor/${paper._id}`);
        }
      }}
      className="group relative flex cursor-pointer flex-col rounded-md border border-gray-200 bg-white p-5 text-left transition-all hover:border-gray-400 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {/* Top row: status + actions */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
            isDraft
              ? 'bg-amber-50 text-amber-600 border border-amber-100'
              : 'bg-green-50 text-green-700 border border-green-100'
          }`}
        >
          {isDraft ? <FileClock size={9} /> : <FileCheck2 size={9} />}
          {isDraft ? 'Draft' : 'Saved'}
        </span>

        {canEdit ? (
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRename();
              }}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title="Rename"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-gray-300">
            <Eye size={9} /> View only
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="line-clamp-1 text-[14px] font-bold text-gray-900 mb-0.5 group-hover:text-gray-600 transition-colors">
        {paper.name}
      </h3>
      {paper.meta.examTitle && (
        <p className="line-clamp-1 text-[11.5px] text-gray-400 mb-4">{paper.meta.examTitle}</p>
      )}

      {/* Big stat: question count */}
      <div className="mb-4 flex items-end gap-1.5">
        <span className="text-[28px] font-black text-gray-900 leading-none tabular-nums">
          {paper.meta.totalQuestions}
        </span>
        <span className="text-[11px] text-gray-400 mb-0.5 leading-tight">
          questions
          <br />
          total
        </span>
      </div>

      {/* Spec chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {[
          {
            icon: <Layers size={10} />,
            label: `${paper.meta.sections} section${paper.meta.sections === 1 ? '' : 's'}`,
          },
          {
            icon: <FileText size={10} />,
            label: LANG_LABEL[paper.meta.language] ?? paper.meta.language,
          },
          ...(paper.meta.organisation
            ? [{ icon: <BookOpen size={10} />, label: paper.meta.organisation }]
            : []),
        ].map(({ icon, label }, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded border border-gray-100 bg-gray-50 px-2 py-0.5 text-[10.5px] text-gray-500"
          >
            {icon}
            {label}
          </span>
        ))}
      </div>

      {/* Footer: timestamps */}
      <div className="mt-auto border-t border-gray-100 pt-3 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <Clock size={9} />
          {formatRelative(paper.updatedAt)}
        </span>
        <span className="text-[10px] text-gray-300">{formatDate(paper.createdAt)}</span>
      </div>
    </motion.div>
  );
}

// ─── Summary Stats Bar ────────────────────────────────────────────────────────
function SummaryBar({ papers }: { papers: PaperMeta[] }) {
  const totalQ = papers.reduce((s, p) => s + (p.meta.totalQuestions || 0), 0);
  const drafts = papers.filter((p) => p.status === 'draft').length;
  const saved = papers.filter((p) => p.status === 'saved').length;
  const langs = new Set(papers.map((p) => p.meta.language)).size;

  const stats = [
    { label: 'Total papers', value: papers.length },
    { label: 'Saved', value: saved },
    { label: 'Drafts', value: drafts },
    { label: 'Total questions', value: totalQ.toLocaleString() },
    { label: 'Languages used', value: langs },
  ];

  return (
    <div className="border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center gap-8 flex-wrap">
        {stats.map(({ label, value }, i) => (
          <div key={i} className="flex flex-col">
            <span className="text-[18px] font-black text-gray-900 leading-none tabular-nums">
              {value}
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section Heading ──────────────────────────────────────────────────────────
function SectionHeading({
  icon,
  label,
  count,
}: Readonly<{ icon: React.ReactNode; label: string; count: number }>) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400">
        {icon}
        {label}
      </span>
      <span className="rounded border border-gray-100 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
        {count}
      </span>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardClient({
  initialPapers,
  userRole,
  userPermission,
  projectCount,
  maxProjects,
}: Readonly<DashboardClientProps>) {
  const router = useRouter();
  const [papers, setPapers] = useState<PaperMeta[]>(initialPapers);
  const [count, setCount] = useState(projectCount);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [deletingPaper, setDeletingPaper] = useState<PaperMeta | null>(null);
  const [renamingPaper, setRenamingPaper] = useState<PaperMeta | null>(null);
  const [, startTransition] = useTransition();

  const canEdit = userPermission === 'edit';
  const atLimit = count >= maxProjects;

  async function handleCreate(name: string) {
    const paper = {
      metadata: createEmptyMetadata(),
      sections: [createEmptySection('Section A — General Awareness')],
    };
    const res = await fetch('/api/papers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, paper, status: 'draft' }),
    });
    if (!res.ok) throw new Error('Failed to create');
    const { _id } = await res.json();
    setCount((c) => c + 1);
    setNewModalOpen(false);
    router.push(`/editor/${_id}`);
  }

  async function handleDelete() {
    if (!deletingPaper) return;
    const id = deletingPaper._id;
    const res = await fetch(`/api/papers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPapers((p) => p.filter((x) => x._id !== id));
      setCount((c) => c - 1);
    }
    setDeletingPaper(null);
  }

  async function handleRename(newName: string) {
    if (!renamingPaper) return;
    const id = renamingPaper._id;
    const res = await fetch(`/api/papers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) setPapers((p) => p.map((x) => (x._id === id ? { ...x, name: newName } : x)));
    setRenamingPaper(null);
  }

  const drafts = papers.filter((p) => p.status === 'draft');
  const saved = papers.filter((p) => p.status === 'saved');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
          {/* Logo + counter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded bg-gray-900">
              <Image src="/testpdflogo.jpeg" alt="TestPDF" width={45} height={45} />
            </div>
            <div>
              <span className="text-[14px] font-bold text-gray-900">
                Test<span style={{ color: ACCENT }}>PDF</span>
              </span>
            </div>
            <div className="ml-2 hidden sm:block">
              <UsageBar count={count} max={maxProjects} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {userRole === 'superadmin' && (
              <button
                type="button"
                onClick={() => router.push('/users')}
                className="rounded border border-gray-200 px-3 py-1.5 text-[12.5px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Manage users
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  if (!atLimit) setNewModalOpen(true);
                }}
                disabled={atLimit}
                title={atLimit ? `${maxProjects}-paper limit reached` : undefined}
                className="flex items-center gap-1.5 rounded px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: atLimit ? '#9CA3AF' : '#000' }}
              >
                {atLimit ? <Lock size={12} /> : <Plus size={13} />}
                New paper
              </button>
            )}

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Banners */}
      {!canEdit && (
        <div
          className="border-b px-6 py-2.5 text-center text-[12px]"
          style={{ borderColor: '#BFDBFE', background: '#EFF6FF', color: ACCENT }}
        >
          You have <span className="font-bold">view-only</span> access — you can open and export
          papers, but cannot create or edit.
        </div>
      )}
      {canEdit && atLimit && papers.length > 0 && (
        <div className="border-b border-amber-100 bg-amber-50 px-6 py-2.5 text-center text-[12px] text-amber-700">
          {maxProjects}-paper limit reached. Delete an existing paper to create a new one.
        </div>
      )}

      {/* Summary stats */}
      {papers.length > 0 && <SummaryBar papers={papers} />}

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {papers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-5 rounded-md border border-dashed border-gray-200 bg-white py-28 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-300">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">No papers yet</h2>
              <p className="mt-1 text-[12.5px] text-gray-400 max-w-xs">
                {canEdit
                  ? 'Create your first exam paper to get started.'
                  : 'No papers have been created in this workspace yet.'}
              </p>
            </div>
            {canEdit && !atLimit && (
              <button
                type="button"
                onClick={() => setNewModalOpen(true)}
                className="flex items-center gap-1.5 rounded px-5 py-2.5 text-[13px] font-semibold text-white"
                style={{ background: '#000' }}
              >
                <Plus size={14} /> New paper
              </button>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-12">
            {drafts.length > 0 && (
              <section>
                <SectionHeading
                  icon={<FileClock size={12} />}
                  label="Drafts"
                  count={drafts.length}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {drafts.map((p) => (
                      <PaperCard
                        key={p._id}
                        paper={p}
                        canEdit={canEdit}
                        onDelete={() => setDeletingPaper(p)}
                        onRename={() => setRenamingPaper(p)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
            {saved.length > 0 && (
              <section>
                <SectionHeading
                  icon={<FileCheck2 size={12} />}
                  label="Saved"
                  count={saved.length}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {saved.map((p) => (
                      <PaperCard
                        key={p._id}
                        paper={p}
                        canEdit={canEdit}
                        onDelete={() => setDeletingPaper(p)}
                        onRename={() => setRenamingPaper(p)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <NewPaperModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onCreate={handleCreate}
      />
      <DeleteConfirmModal
        paper={deletingPaper}
        onClose={() => setDeletingPaper(null)}
        onConfirm={handleDelete}
      />
      <RenameModal
        paper={renamingPaper}
        onClose={() => setRenamingPaper(null)}
        onRename={handleRename}
      />
    </div>
  );
}
