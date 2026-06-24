"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
    ArrowLeft,
    Loader2,
    LogOut,
    Trash2,
    UserPlus,
    Users,
    ShieldCheck,
    Eye,
} from "lucide-react";

interface UserRow {
    _id: string;
    username: string;
    role: "user";
    permission: "edit" | "view";
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
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function UsersClient({
    initialUsers,
    limits: initialLimits,
}: Readonly<UsersClientProps>) {
    const router = useRouter();
    const [users, setUsers] = useState(initialUsers);
    const [limits, setLimits] = useState(initialLimits);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [permission, setPermission] = useState<"edit" | "view">("edit");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const canAddWithPermission =
        permission === "edit" ? limits.canAddEdit : limits.canAddView;
    const formBlocked = !limits.canAddAny || !canAddWithPermission;

    function getLimitMessage(): string | null {
        if (!limits.canAddAny)
            return "You've reached the 10-user limit for this workspace.";
        if (permission === "edit" && !limits.canAddEdit)
            return "You've reached the 5-user limit for edit access.";
        if (permission === "view" && !limits.canAddView)
            return "You've reached the 5-user limit for view access.";
        return null;
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (formBlocked) return;
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, permission }),
            });

            const data = (await res.json()) as UserRow | { error?: string };

            if (!res.ok) {
                throw new Error(
                    "error" in data ? data.error : "Failed to create user",
                );
            }

            const newUser = data as UserRow;
            setUsers((current) => [newUser, ...current]);
            setLimits((l) => ({
                ...l,
                totalUsers: l.totalUsers + 1,
                editUsers:
                    permission === "edit" ? l.editUsers + 1 : l.editUsers,
                viewUsers:
                    permission === "view" ? l.viewUsers + 1 : l.viewUsers,
                canAddAny: l.totalUsers + 1 < 10,
                canAddEdit:
                    (permission === "edit" ? l.editUsers + 1 : l.editUsers) < 5,
                canAddView:
                    (permission === "view" ? l.viewUsers + 1 : l.viewUsers) < 5,
            }));
            setUsername("");
            setPassword("");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to create user",
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string, perm: "edit" | "view") {
        setDeletingId(id);
        setError("");

        try {
            const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = (await res.json()) as { error?: string };
                throw new Error(data.error ?? "Failed to delete user");
            }
            setUsers((current) => current.filter((user) => user._id !== id));
            setLimits((l) => ({
                ...l,
                totalUsers: l.totalUsers - 1,
                editUsers: perm === "edit" ? l.editUsers - 1 : l.editUsers,
                viewUsers: perm === "view" ? l.viewUsers - 1 : l.viewUsers,
                canAddAny: l.totalUsers - 1 < 10,
                canAddEdit:
                    (perm === "edit" ? l.editUsers - 1 : l.editUsers) < 5,
                canAddView:
                    (perm === "view" ? l.viewUsers - 1 : l.viewUsers) < 5,
            }));
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to delete user",
            );
        } finally {
            setDeletingId(null);
        }
    }

    const limitMessage = getLimitMessage();

    return (
        <div className="min-h-screen bg-stone-50">
            <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/85 backdrop-blur-sm">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-white">
                            <Users size={18} />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold text-stone-900">
                                User access
                            </h1>
                            <p className="text-[11px] text-stone-400">
                                {limits.totalUsers}/10 users · {limits.editUsers}/5 edit · {limits.viewUsers}/5 view
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => router.push("/dashboard")}
                            className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-100"
                        >
                            <ArrowLeft size={14} /> Dashboard
                        </button>
                        <button
                            type="button"
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-2 text-sm text-white hover:bg-stone-800"
                        >
                            <LogOut size={14} /> Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[360px_1fr]">
                {/* Add user form */}
                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-stone-900">
                        Add user
                    </h2>
                    <p className="mt-1 text-xs text-stone-400">
                        New users can sign in immediately with the credentials
                        you save here.
                    </p>

                    {/* Quota bars */}
                    <div className="mt-4 flex flex-col gap-2">
                        <QuotaBar
                            label="Edit users"
                            used={limits.editUsers}
                            max={5}
                        />
                        <QuotaBar
                            label="View users"
                            used={limits.viewUsers}
                            max={5}
                        />
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="mt-4 flex flex-col gap-3"
                    >
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                            disabled={formBlocked}
                            className="rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-100 disabled:opacity-50"
                            required
                        />
                        <input
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            disabled={formBlocked}
                            className="rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-100 disabled:opacity-50"
                            required
                        />

                        {/* Permission toggle */}
                        <div className="flex gap-2">
                            <PermissionButton
                                active={permission === "edit"}
                                disabled={!limits.canAddEdit}
                                icon={<ShieldCheck size={13} />}
                                label="Edit"
                                sublabel="Can create & edit"
                                onClick={() => setPermission("edit")}
                            />
                            <PermissionButton
                                active={permission === "view"}
                                disabled={!limits.canAddView}
                                icon={<Eye size={13} />}
                                label="View"
                                sublabel="Read & export only"
                                onClick={() => setPermission("view")}
                            />
                        </div>

                        {limitMessage ? (
                            <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                {limitMessage}
                            </p>
                        ) : null}

                        {error ? (
                            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                                {error}
                            </p>
                        ) : null}

                        <button
                            type="submit"
                            disabled={loading || formBlocked}
                            className="flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 size={15} className="animate-spin" />
                            ) : (
                                <UserPlus size={15} />
                            )}
                            {loading ? "Creating..." : "Add user"}
                        </button>
                    </form>
                </section>

                {/* Existing users table */}
                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <div>
                        <h2 className="text-sm font-semibold text-stone-900">
                            Existing users
                        </h2>
                        <p className="mt-1 text-xs text-stone-400">
                            {users.length} user{users.length === 1 ? "" : "s"}{" "}
                            can access the workspace
                        </p>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl border border-stone-200">
                        {users.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-stone-400">
                                No users added yet.
                            </div>
                        ) : (
                            users.map((user) => (
                                <div
                                    key={user._id}
                                    className="flex items-center justify-between border-b border-stone-100 px-4 py-3 last:border-b-0"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-stone-900">
                                                {user.username}
                                            </p>
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${user.permission === "edit"
                                                        ? "bg-blue-50 text-blue-600"
                                                        : "bg-stone-100 text-stone-500"
                                                    }`}
                                            >
                                                {user.permission === "edit" ? (
                                                    <ShieldCheck size={9} />
                                                ) : (
                                                    <Eye size={9} />
                                                )}
                                                {user.permission}
                                            </span>
                                        </div>
                                        <p className="text-xs text-stone-400">
                                            Added {formatDate(user.createdAt)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDelete(user._id, user.permission)
                                        }
                                        disabled={deletingId === user._id}
                                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                                    >
                                        {deletingId === user._id ? (
                                            <Loader2
                                                size={14}
                                                className="animate-spin"
                                            />
                                        ) : (
                                            <Trash2 size={14} />
                                        )}
                                        Delete
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

function QuotaBar({
    label,
    used,
    max,
}: Readonly<{
    label: string;
    used: number;
    max: number;
}>) {
    const pct = Math.min((used / max) * 100, 100);
    const full = used >= max;
    return (
        <div>
            <div className="mb-1 flex justify-between text-[11px] text-stone-400">
                <span>{label}</span>
                <span className={full ? "font-semibold text-amber-600" : ""}>
                    {used}/{max}
                </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                    className={`h-full rounded-full transition-all ${full ? "bg-amber-400" : "bg-stone-400"}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

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
            className={`flex flex-1 flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${active
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300 hover:bg-white"
                }`}
        >
            <span className="flex items-center gap-1.5 text-xs font-semibold">
                {icon} {label}
            </span>
            <span
                className={`text-[11px] ${active ? "text-stone-300" : "text-stone-400"}`}
            >
                {sublabel}
            </span>
        </button>
    );
}