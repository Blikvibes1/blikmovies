'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const { error } = await supabase.auth.signInWithOtp({ email });
    setStatus(error ? 'error' : 'sent');
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-2xl font-bold tracking-[-2px] block text-center mb-10">
          blikmovies
        </Link>

        <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
          <h1 className="text-2xl font-semibold mb-2">Log in</h1>
          <p className="text-zinc-400 text-sm mb-6">
            We&apos;ll email you a magic link — no password needed.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-rose-500"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending link...' : 'Send magic link'}
            </button>
          </form>

          {status === 'sent' && (
            <p className="text-emerald-400 text-sm mt-4">
              Check your inbox for the login link.
            </p>
          )}
          {status === 'error' && (
            <p className="text-rose-400 text-sm mt-4">
              Something went wrong. Double check email auth is enabled in your Supabase project.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
