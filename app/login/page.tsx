// app/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, AlertCircle } from 'lucide-react';

const ACCENT = '#1744F2';
const ACCENT_LIGHT = '#EEF2FF';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.ok) {
      router.push('/dashboard');
    } else {
      setError('Incorrect username or password.');
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4">
      {/* Subtle grid dot pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="w-full max-w-sm">
        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-gray-900 mb-5">
            <FileText size={17} className="text-white" />
          </div>
          <h1 className="text-[22px] font-black text-gray-900 tracking-tight">
            CustomPDF<span style={{ color: ACCENT }}>Creator</span>
          </h1>
          <p className="mt-1.5 text-[13px] text-gray-400">Sign in to access your workspace</p>
        </div>

        {/* Card */}
        <div className="rounded-md border border-gray-200 bg-white p-7 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="username"
                className="text-[12px] font-semibold text-gray-600 uppercase tracking-wider"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                placeholder="your-username"
                required
                className="w-full rounded border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-300 focus:border-gray-400 focus:bg-white transition-colors"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-[12px] font-semibold text-gray-600 uppercase tracking-wider"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                required
                className="w-full rounded border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-300 focus:border-gray-400 focus:bg-white transition-colors"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-3 py-2.5">
                <AlertCircle size={13} className="text-red-500 shrink-0" />
                <span className="text-[12.5px] text-red-600">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded text-[13px] font-semibold text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#000' }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="mt-5 text-center text-[11.5px] text-gray-400">
          Contact your admin if you don&apos;t have access.
        </p>
      </div>
    </div>
  );
}
