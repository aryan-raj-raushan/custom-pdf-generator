'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  ArrowLeft,
  Loader2,
  LogOut,
  Trash2,
  UserPlus,
  Users,
  ShieldCheck,
  Eye,
  FileText,
} from 'lucide-react';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const ACCENT = '#1744F2';
const ACCENT_LIGHT = '#EEF2FF';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserRow {
  _id: string;
  username: string;
  role: 'user';
  permission: 'edit' | 'view';
  createdAt: string;
}

interface WorkspaceLimits {
  totalUsers: number;
  editUsers: number;
  viewUsers: number;
  canAddAny: boolean;
  canAddEdit: boolean;
  canAddView: boolean;
}

interface UsersClientProps {
  initialUsers: UserRow[];
  limits: WorkspaceLimits;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Quota Bar ────────────────────────────────────────────────────────────────
function QuotaBar({ label, used, max }: Readonly<{ label: string; used: number; max: number }>) {
  const pct = Math.min((used / max) * 100, 100);
  const full = used >= max;
  const near = pct >= 80;
  return (
    <div>
      <div className="mb-1.5 flex justify-between items-center">
        <span className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">
          {label}
        </span>
        <span
          className={`text-[11px] font-bold tabular-nums ${full ? 'text-amber-600' : near ? 'text-amber-500' : 'text-gray-500'}`}
        >
          {used}/{max}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: full ? '#F59E0B' : near ? '#FBBF24' : ACCENT }}
        />
      </div>
    </div>
  );
}

// ─── Permission Button ────────────────────────────────────────────────────────
function PermissionButton({
  active,
  disabled,
  icon,
  label,
  sublabel,
  onClick,
}: Readonly<{
  active: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-1 flex-col gap-0.5 rounded border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={
        active
          ? { borderColor: ACCENT, background: ACCENT_LIGHT, color: ACCENT }
          : { borderColor: '#E5E7EB', background: '#F9FAFB', color: '#6B7280' }
      }
    >
      <span className="flex items-center gap-1.5 text-[12px] font-bold">
        {icon} {label}
      </span>
      <span className="text-[11px]" style={{ color: active ? '#6B7280' : '#9CA3AF' }}>
        {sublabel}
      </span>
    </button>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────
function UserTableRow({
  user,
  deletingId,
  onDelete,
}: {
  user: UserRow;
  deletingId: string | null;
  onDelete: (id: string, perm: 'edit' | 'view') => void;
}) {
  const isEdit = user.permission === 'edit';
  const isDeleting = deletingId === user._id;
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 last:border-b-0 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-gray-50 text-[12px] font-bold text-gray-600 select-none uppercase">
          {user.username.slice(0, 2)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-gray-900">{user.username}</span>
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border ${
                isEdit
                  ? 'border-blue-100 bg-blue-50 text-blue-600'
                  : 'border-gray-100 bg-gray-50 text-gray-500'
              }`}
            >
              {isEdit ? <ShieldCheck size={9} /> : <Eye size={9} />}
              {user.permission}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">Added {formatDate(user.createdAt)}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDelete(user._id, user.permission)}
        disabled={isDeleting}
        className="flex items-center gap-1.5 rounded px-3 py-1.5 text-[12px] text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 transition-colors"
      >
        {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        {isDeleting ? 'Removing…' : 'Remove'}
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function UsersClient({
  initialUsers,
  limits: initialLimits,
}: Readonly<UsersClientProps>) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [limits, setLimits] = useState(initialLimits);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [permission, setPermission] = useState<'edit' | 'view'>('edit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canAddWithPermission = permission === 'edit' ? limits.canAddEdit : limits.canAddView;
  const formBlocked = !limits.canAddAny || !canAddWithPermission;

  function getLimitMessage(): string | null {
    if (!limits.canAddAny) return "You've reached the 10-user limit for this workspace.";
    if (permission === 'edit' && !limits.canAddEdit)
      return "You've reached the 5-user limit for edit access.";
    if (permission === 'view' && !limits.canAddView)
      return "You've reached the 5-user limit for view access.";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (formBlocked) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, permission }),
      });
      const data = (await res.json()) as UserRow | { error?: string };
      if (!res.ok) throw new Error('error' in data ? data.error : 'Failed to create user');
      const newUser = data as UserRow;
      setUsers((u) => [newUser, ...u]);
      setLimits((l) => ({
        ...l,
        totalUsers: l.totalUsers + 1,
        editUsers: permission === 'edit' ? l.editUsers + 1 : l.editUsers,
        viewUsers: permission === 'view' ? l.viewUsers + 1 : l.viewUsers,
        canAddAny: l.totalUsers + 1 < 10,
        canAddEdit: (permission === 'edit' ? l.editUsers + 1 : l.editUsers) < 5,
        canAddView: (permission === 'view' ? l.viewUsers + 1 : l.viewUsers) < 5,
      }));
      setUsername('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, perm: 'edit' | 'view') {
    setDeletingId(id);
    setError('');
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to delete user');
      }
      setUsers((u) => u.filter((x) => x._id !== id));
      setLimits((l) => ({
        ...l,
        totalUsers: l.totalUsers - 1,
        editUsers: perm === 'edit' ? l.editUsers - 1 : l.editUsers,
        viewUsers: perm === 'view' ? l.viewUsers - 1 : l.viewUsers,
        canAddAny: l.totalUsers - 1 < 10,
        canAddEdit: (perm === 'edit' ? l.editUsers - 1 : l.editUsers) < 5,
        canAddView: (perm === 'view' ? l.viewUsers - 1 : l.viewUsers) < 5,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  }

  const limitMessage = getLimitMessage();
  const editUsers = users.filter((u) => u.permission === 'edit');
  const viewUsers = users.filter((u) => u.permission === 'view');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-gray-900">
              <FileText size={14} className="text-white" />
            </div>
            <span className="text-[14px] font-bold text-gray-900">
              CustomPDF<span style={{ color: ACCENT }}>Creator</span>
            </span>
            <span className="hidden sm:block text-gray-200 text-[14px]">/</span>
            <span className="hidden sm:flex items-center gap-1.5 text-[13px] text-gray-500 font-medium">
              <Users size={13} /> User access
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 rounded border border-gray-200 px-3 py-1.5 text-[12.5px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={13} /> Dashboard
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors"
              style={{ background: '#111827' }}
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 px-6 py-8 lg:grid-cols-[340px_1fr]">
        {/* ── Left: Add user form ── */}
        <div className="flex flex-col gap-4">
          {/* Capacity card */}
          <div className="rounded-md border border-gray-200 bg-white p-5">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-400 mb-4">
              Workspace capacity
            </p>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { n: limits.totalUsers, max: 10, label: 'Total' },
                { n: limits.editUsers, max: 5, label: 'Editors' },
                { n: limits.viewUsers, max: 5, label: 'Viewers' },
              ].map(({ n, max, label }) => (
                <div key={label} className="text-center">
                  <div className="text-[22px] font-black text-gray-900 leading-none tabular-nums">
                    {n}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    of {max} {label}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <QuotaBar label="Editors" used={limits.editUsers} max={5} />
              <QuotaBar label="Viewers" used={limits.viewUsers} max={5} />
            </div>
          </div>

          {/* Add user form card */}
          <div className="rounded-md border border-gray-200 bg-white p-5">
            <h2 className="text-[14px] font-bold text-gray-900 mb-0.5">Add user</h2>
            <p className="text-[11.5px] text-gray-400 mb-4">
              New users can sign in immediately with these credentials.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                disabled={formBlocked}
                className="w-full rounded border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none focus:border-gray-400 focus:bg-white transition-colors disabled:opacity-50"
                required
              />
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                disabled={formBlocked}
                className="w-full rounded border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none focus:border-gray-400 focus:bg-white transition-colors disabled:opacity-50"
                required
              />

              <div className="flex gap-2">
                <PermissionButton
                  active={permission === 'edit'}
                  disabled={!limits.canAddEdit}
                  icon={<ShieldCheck size={12} />}
                  label="Editor"
                  sublabel="Create & edit papers"
                  onClick={() => setPermission('edit')}
                />
                <PermissionButton
                  active={permission === 'view'}
                  disabled={!limits.canAddView}
                  icon={<Eye size={12} />}
                  label="Viewer"
                  sublabel="Read & export only"
                  onClick={() => setPermission('view')}
                />
              </div>

              {limitMessage && (
                <p className="rounded border border-amber-100 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-700">
                  {limitMessage}
                </p>
              )}
              {error && (
                <p className="rounded border border-red-100 bg-red-50 px-3 py-2 text-[11.5px] text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || formBlocked}
                className="flex items-center justify-center gap-1.5 rounded py-2.5 text-[13px] font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: formBlocked ? '#9CA3AF' : ACCENT }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {loading ? 'Creating…' : 'Add user'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Right: User list ── */}
        <div className="rounded-md border border-gray-200 bg-white">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-[14px] font-bold text-gray-900">
              {users.length === 0
                ? 'No users yet'
                : `${users.length} user${users.length === 1 ? '' : 's'}`}
            </h2>
            <p className="text-[11.5px] text-gray-400 mt-0.5">
              All users with access to this workspace
            </p>
          </div>

          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-10 h-10 rounded border border-gray-200 bg-gray-50 flex items-center justify-center mb-3">
                <Users size={18} className="text-gray-300" />
              </div>
              <p className="text-[13px] text-gray-500 font-medium">No users added yet</p>
              <p className="text-[11.5px] text-gray-400 mt-1">
                Use the form to add your first team member.
              </p>
            </div>
          ) : (
            <>
              {/* Editors group */}
              {editUsers.length > 0 && (
                <div>
                  <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 flex items-center gap-1.5">
                      <ShieldCheck size={10} /> Editors
                    </span>
                    <span className="rounded border border-gray-100 bg-gray-50 px-1.5 py-0.5 text-[9px] font-bold text-gray-500">
                      {editUsers.length}/5
                    </span>
                  </div>
                  {editUsers.map((user) => (
                    <UserTableRow
                      key={user._id}
                      user={user}
                      deletingId={deletingId}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}

              {/* Viewers group */}
              {viewUsers.length > 0 && (
                <div className={editUsers.length > 0 ? 'border-t border-gray-100' : ''}>
                  <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 flex items-center gap-1.5">
                      <Eye size={10} /> Viewers
                    </span>
                    <span className="rounded border border-gray-100 bg-gray-50 px-1.5 py-0.5 text-[9px] font-bold text-gray-500">
                      {viewUsers.length}/5
                    </span>
                  </div>
                  {viewUsers.map((user) => (
                    <UserTableRow
                      key={user._id}
                      user={user}
                      deletingId={deletingId}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
