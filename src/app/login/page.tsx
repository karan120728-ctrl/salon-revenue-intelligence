'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import { fetchApi } from '@/lib/api';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mode, setMode] = useState<'signin' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [warming, setWarming] = useState(true); // true while backend cold-start resolves

  // 🔥 Wake up the Render backend the moment the login page loads.
  useEffect(() => {
    fetchApi('/health')
      .catch(() => {})
      .finally(() => setWarming(false)); // Once /health responds, backend is warm
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    
    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      // Save token and user info
      localStorage.setItem('salon_token', data.token);
      localStorage.setItem('salon_user', JSON.stringify(data.user));
      router.push('/app');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    setLoading(true);

    try {
      await fetchApi('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, newPassword }),
      });

      setSuccessMsg('Your password has been updated. Please sign in with your new credentials.');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMode('signin');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Visual side */}
      <div className="hidden lg:flex flex-col justify-between bg-[var(--ink)] text-white p-12 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-[var(--rosewood)] opacity-20 blur-3xl" />
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Icon name="scissors" size={14} />
          </div>
          <span className="font-display text-lg">Marlowe &amp; Rose</span>
        </div>
        <div className="relative z-10">
          <p className="font-display text-3xl leading-snug max-w-md">
            &quot;It told me a client of nine years was going cold before I&apos;d noticed.&quot;
          </p>
          <p className="text-white/60 text-sm mt-4">Priya Shah — Owner, Shah Hair Studio</p>
        </div>
        <p className="text-xs text-white/40 relative z-10">
          © 2026 Marlowe &amp; Rose Revenue Intelligence
        </p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-8">
        {mode === 'signin' ? (
          <form onSubmit={handleSignIn} className="w-full max-w-sm fade-up">
            <h1 className="font-display text-3xl mb-2">Welcome back</h1>
            <p className="text-[var(--slate)] text-sm mb-8">Sign in to your operations dashboard.</p>
            
            {successMsg && (
              <p className="text-emerald-700 text-sm mb-4 bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                {successMsg}
              </p>
            )}
            {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}
            {warming && (
              <p className="text-xs text-[var(--slate)] mb-4 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                Connecting to server…
              </p>
            )}

            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--slate)]">Email</label>
            <div className="flex items-center gap-2 border border-[var(--line)] rounded-xl px-3.5 py-3 mt-1.5 mb-4 focus-within:border-[var(--ink)]">
              <Icon name="mail" size={16} className="text-[var(--slate)]" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full outline-none text-sm bg-transparent"
              />
            </div>
            
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--slate)]">Password</label>
            <div className="flex items-center gap-2 border border-[var(--line)] rounded-xl px-3.5 py-3 mt-1.5 mb-4 focus-within:border-[var(--ink)]">
              <Icon name="lock" size={16} className="text-[var(--slate)]" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full outline-none text-sm bg-transparent"
              />
            </div>
            
            <div className="flex items-center justify-between mb-7 text-sm">
              <label className="flex items-center gap-2 text-[var(--slate)]">
                <input type="checkbox" defaultChecked className="accent-[var(--ink)]" /> Remember me
              </label>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setSuccessMsg('');
                  setMode('forgot');
                }}
                className="font-semibold text-[var(--ink)] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            
            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}{' '}
              {!loading && <Icon name="chevron" size={15} />}
            </button>
            
            <p className="text-xs text-center text-[var(--slate)] mt-6">
              Demo: <strong>admin@marlowe.com</strong> / <strong>admin123</strong>
            </p>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="w-full max-w-sm fade-up">
            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccessMsg('');
                setMode('signin');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--slate)] hover:text-[var(--ink)] mb-6"
            >
              ← Back to sign in
            </button>
            
            <h1 className="font-display text-3xl mb-2">Reset password</h1>
            <p className="text-[var(--slate)] text-sm mb-8">
              Enter your registered salon email and choose a new password.
            </p>
            
            {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}

            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--slate)]">Registered Email</label>
            <div className="flex items-center gap-2 border border-[var(--line)] rounded-xl px-3.5 py-3 mt-1.5 mb-4 focus-within:border-[var(--ink)]">
              <Icon name="mail" size={16} className="text-[var(--slate)]" />
              <input
                required
                type="email"
                placeholder="salon@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full outline-none text-sm bg-transparent"
              />
            </div>

            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--slate)]">New Password</label>
            <div className="flex items-center gap-2 border border-[var(--line)] rounded-xl px-3.5 py-3 mt-1.5 mb-4 focus-within:border-[var(--ink)]">
              <Icon name="lock" size={16} className="text-[var(--slate)]" />
              <input
                required
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full outline-none text-sm bg-transparent"
              />
            </div>

            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--slate)]">Confirm New Password</label>
            <div className="flex items-center gap-2 border border-[var(--line)] rounded-xl px-3.5 py-3 mt-1.5 mb-7 focus-within:border-[var(--ink)]">
              <Icon name="lock" size={16} className="text-[var(--slate)]" />
              <input
                required
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full outline-none text-sm bg-transparent"
              />
            </div>

            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? 'Updating password…' : 'Set new password'}{' '}
              {!loading && <Icon name="chevron" size={15} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
