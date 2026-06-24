"use client";

import React, { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
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
} from "lucide-react";
import { signOut } from "next-auth/react";
import {
  createEmptyMetadata,
  createEmptySection,
} from "@/components/layout/CustomPdfCreator";

interface PaperMeta {
  _id: string;
  name: string;
  status: "draft" | "saved";
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
  userRole: "superadmin" | "user";
  userPermission: "edit" | "view";
  projectCount: number;
  maxProjects: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const LANG_LABEL: Record<string, string> = {
  en: "English",
  hi: "हिंदी",
  bilingual: "Bilingual",
};

// ─── New Paper Modal ──────────────────────────────────────────────────────────

function NewPaperModal({
  open,
  onClose,
  onCreate,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}>) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a project name.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onCreate(name.trim());
      setName("");
    } catch {
      setError("Failed to create paper. Please try again.");
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName("");
      setError("");
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  New paper
                </h2>
                <p className="mt-0.5 text-xs text-stone-400">
                  Give this paper a name — you can always
                  rename it later.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3"
            >
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="e.g. SSC CGL Mock Test 1"
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-300 focus:border-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-100"
                maxLength={120}
              />

              {error && (
                <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </p>
              )}

              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-sm text-stone-500 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <Plus size={14} />
                  )}
                  {loading ? "Creating…" : "Create & open"}
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
}: Readonly<{
  paper: PaperMeta | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}>) {
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading)
              onClose();
          }}
        >
          <motion.div
            key="del-modal"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-xl"
          >
            <h2 className="text-base font-semibold text-stone-900">
              Delete paper?
            </h2>
            <p className="mt-1.5 text-sm text-stone-500">
              <span className="font-medium text-stone-700">
                {paper.name}
              </span>{" "}
              will be permanently deleted. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-lg px-4 py-2 text-sm text-stone-500 hover:bg-stone-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <Trash2 size={14} />
                )}
                {loading ? "Deleting…" : "Delete"}
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
  const [name, setName] = useState(paper?.name ?? "");
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading)
              onClose();
          }}
        >
          <motion.div
            key="ren-modal"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-base font-semibold text-stone-900">
              Rename paper
            </h2>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3"
            >
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-100"
                maxLength={120}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-lg px-4 py-2 text-sm text-stone-500 hover:bg-stone-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : null}
                  {loading ? "Saving…" : "Rename"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/editor/${paper._id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/editor/${paper._id}`);
        }
      }}
      className="group relative flex cursor-pointer flex-col rounded-xl border border-stone-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
    >
      {/* Status badge + actions */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${paper.status === "saved"
            ? "bg-emerald-50 text-emerald-600"
            : "bg-amber-50 text-amber-600"
            }`}
        >
          {paper.status === "saved" ? (
            <FileCheck2 size={10} />
          ) : (
            <FileClock size={10} />
          )}
          {paper.status === "saved" ? "Saved" : "Draft"}
        </span>

        {canEdit ? (
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRename();
              }}
              className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              title="Rename"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-500"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-stone-300">
            <Eye size={10} /> View only
          </span>
        )}
      </div>

      {/* Name + title */}
      <div className="mb-3 text-left">
        <h3 className="line-clamp-1 text-sm font-semibold text-stone-900 group-hover:text-stone-700">
          {paper.name}
        </h3>
        {paper.meta.examTitle && (
          <p className="mt-0.5 line-clamp-1 text-xs text-stone-400">
            {paper.meta.examTitle}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="mt-auto flex flex-wrap gap-3 border-t border-stone-100 pt-3">
        <Stat
          icon={<BookOpen size={11} />}
          label={`${paper.meta.totalQuestions} questions`}
        />
        <Stat
          icon={<Layers size={11} />}
          label={`${paper.meta.sections} section${paper.meta.sections === 1 ? "" : "s"}`}
        />
        <Stat
          icon={<FileText size={11} />}
          label={
            LANG_LABEL[paper.meta.language] ?? paper.meta.language
          }
        />
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center gap-1 text-[10px] text-stone-400">
        <Clock size={10} />
        <span>Updated {formatRelative(paper.updatedAt)}</span>
        <span className="mx-1">·</span>
        <span>{formatDate(paper.createdAt)}</span>
      </div>
    </motion.div>
  );
}

function Stat({ icon, label }: Readonly<{ icon: React.ReactNode; label: string }>) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-stone-500">
      {icon}
      {label}
    </span>
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

  const canEdit = userPermission === "edit";
  const atProjectLimit = count >= maxProjects;
  const canCreateNew = canEdit && !atProjectLimit;

  async function handleCreate(name: string) {
    const paper = {
      metadata: createEmptyMetadata(),
      sections: [createEmptySection("Section A — General Awareness")],
    };

    const res = await fetch("/api/papers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, paper, status: "draft" }),
    });

    if (!res.ok) throw new Error("Failed to create");

    const { _id } = await res.json();
    setCount((c) => c + 1);
    setNewModalOpen(false);
    router.push(`/editor/${_id}`);
  }

  async function handleDelete() {
    if (!deletingPaper) return;
    const id = deletingPaper._id;

    const res = await fetch(`/api/papers/${id}`, { method: "DELETE" });
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
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    if (res.ok) {
      setPapers((p) =>
        p.map((x) => (x._id === id ? { ...x, name: newName } : x)),
      );
    }
    setRenamingPaper(null);
  }

  const drafts = papers.filter((p) => p.status === "draft");
  const saved = papers.filter((p) => p.status === "saved");

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-900 text-white">
              <FileText size={16} />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-stone-900">
                Exam Creator
              </h1>
              <p className="text-[11px] text-stone-400">
                {count}/{maxProjects} papers
                {!canEdit && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-stone-300">
                    <Eye size={9} /> view only
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {userRole === "superadmin" ? (
              <button
                type="button"
                onClick={() => router.push("/users")}
                className="rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
              >
                Manage users
              </button>
            ) : null}

            {/* New paper button — blocked for view-only or at limit */}
            {canEdit ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (!atProjectLimit)
                      setNewModalOpen(true);
                  }}
                  disabled={atProjectLimit}
                  title={
                    atProjectLimit
                      ? `You've reached the ${maxProjects}-project limit`
                      : undefined
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {atProjectLimit ? (
                    <Lock size={14} />
                  ) : (
                    <Plus size={15} />
                  )}
                  New paper
                </button>
                {atProjectLimit && (
                  <p className="absolute right-0 top-full mt-1.5 w-52 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-700 shadow-sm">
                    {maxProjects}-project limit reached. Delete a paper to create a new one.
                  </p>
                )}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* View-only notice banner */}
      {!canEdit && (
        <div className="border-b border-blue-100 bg-blue-50 px-6 py-2.5 text-center text-xs text-blue-600">
          You have <span className="font-semibold">view-only</span> access — you can open papers and export PDFs, but cannot create, edit, or import questions.
        </div>
      )}

      {/* Project limit banner (edit users only) */}
      {canEdit && atProjectLimit && papers.length > 0 && (
        <div className="border-b border-amber-100 bg-amber-50 px-6 py-2.5 text-center text-xs text-amber-700">
          You&apos;ve reached the <span className="font-semibold">{maxProjects}-project limit</span>. Delete an existing paper to create a new one.
        </div>
      )}

      <main className="mx-auto max-w-6xl px-6 py-8">
        {papers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-stone-300 bg-white py-24 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-700">
                No papers yet
              </h2>
              <p className="mt-1 text-xs text-stone-400">
                {canEdit
                  ? "Create your first exam paper to get started."
                  : "No papers have been created in this workspace yet."}
              </p>
            </div>
            {canCreateNew && (
              <button
                type="button"
                onClick={() => setNewModalOpen(true)}
                className="mt-1 flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
              >
                <Plus size={14} /> New paper
              </button>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-10">
            {drafts.length > 0 && (
              <section>
                <SectionHeading
                  icon={<FileClock size={14} />}
                  label="Drafts"
                  count={drafts.length}
                />
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {drafts.map((p) => (
                      <PaperCard
                        key={p._id}
                        paper={p}
                        canEdit={canEdit}
                        onDelete={() =>
                          setDeletingPaper(p)
                        }
                        onRename={() =>
                          setRenamingPaper(p)
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {saved.length > 0 && (
              <section>
                <SectionHeading
                  icon={<FileCheck2 size={14} />}
                  label="Saved"
                  count={saved.length}
                />
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {saved.map((p) => (
                      <PaperCard
                        key={p._id}
                        paper={p}
                        canEdit={canEdit}
                        onDelete={() =>
                          setDeletingPaper(p)
                        }
                        onRename={() =>
                          setRenamingPaper(p)
                        }
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

function SectionHeading({
  icon,
  label,
  count,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  count: number;
}>) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
        {icon}
        {label}
      </span>
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
        {count}
      </span>
    </div>
  );
}