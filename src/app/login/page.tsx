'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import { fetchApi } from '@/lib/api';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('admin@marlowe.com');
  const [password, setPassword] = useState('admin123');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
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
        <form onSubmit={submit} className="w-full max-w-sm fade-up">
          <h1 className="font-display text-3xl mb-2">Welcome back</h1>
          <p className="text-[var(--slate)] text-sm mb-8">Sign in to your operations dashboard.</p>
          
          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}

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
            <a href="#" className="font-semibold text-[var(--ink)] hover:underline">Forgot password?</a>
          </div>
          
          <button type="submit" className="btn-primary w-full justify-center">
            {loading ? 'Signing in…' : 'Sign in'}{' '}
            {!loading && <Icon name="chevron" size={15} />}
          </button>
          
          <p className="text-xs text-center text-[var(--slate)] mt-6">
            Demo: <strong>admin@marlowe.com</strong> / <strong>admin123</strong>
          </p>
        </form>
      </div>
    </div>
  );
}
