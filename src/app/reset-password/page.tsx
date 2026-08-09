'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { Button, Input, Card, LoadingPage } from '@/components/ui';

type Status = 'verifying' | 'ready' | 'invalid' | 'done';

/**
 * Recovery links arrive in one of two shapes depending on the auth flow:
 *   PKCE     -> /reset-password?code=...
 *   implicit -> /reset-password#access_token=...&type=recovery
 * Either way supabase-js consumes the URL during client initialisation
 * (detectSessionInUrl), so getSession() below resolves only once that has
 * finished. Expired or already-used links come back as error params instead.
 */
function readLinkError(): string | null {
  if (typeof window === 'undefined') return null;

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);

  const code = hash.get('error_code') || query.get('error_code');
  const description = hash.get('error_description') || query.get('error_description');
  const error = hash.get('error') || query.get('error');

  if (!code && !error) return null;

  if (code === 'otp_expired') {
    return 'That reset link has expired. Request a new one below.';
  }

  return description?.replace(/\+/g, ' ') || 'That reset link is no longer valid.';
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('verifying');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const problem = readLinkError();
    if (problem) {
      setLinkError(problem);
      setStatus('invalid');
      return;
    }

    getSupabaseClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        setStatus(session ? 'ready' : 'invalid');
      })
      .catch(() => {
        if (!cancelled) setStatus('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await getSupabaseClient().auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }

      setStatus('done');
      // Clear the recovery token out of the address bar before moving on.
      window.history.replaceState(null, '', '/reset-password');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'verifying') {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-3xl">🐐</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Choose a new password</h1>
          <p className="text-gray-500 mt-1">Your farm data is waiting for you</p>
        </div>

        <Card className="p-6">
          {status === 'invalid' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                {linkError ||
                  'This reset link is invalid or has already been used. Reset links work once and expire after an hour.'}
              </div>
              <Link href="/forgot-password" className="block">
                <Button className="w-full">Request a new link</Button>
              </Link>
            </div>
          )}

          {status === 'done' && (
            <div className="p-3 rounded-lg bg-green-50 text-green-800 text-sm">
              Password updated. Taking you to your dashboard&hellip;
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <Input
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                hint="At least 8 characters"
                autoComplete="new-password"
              />

              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />

              <Button type="submit" className="w-full" loading={loading}>
                Update password
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              <Link href="/login" className="text-primary-600 hover:underline font-medium">
                Back to sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
