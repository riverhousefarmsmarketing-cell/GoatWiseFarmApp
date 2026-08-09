'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input, Card } from '@/components/ui';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await resetPassword(email.trim());
      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-3xl">🐐</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="text-gray-500 mt-1">
            We&apos;ll email you a link to choose a new one
          </p>
        </div>

        <Card className="p-6">
          {sent ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-green-50 text-green-800 text-sm">
                If an account exists for <strong>{email.trim()}</strong>, a reset link
                is on its way. The link expires in one hour.
              </div>
              <p className="text-sm text-gray-600">
                Check your spam folder if it hasn&apos;t arrived in a few minutes.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSent(false);
                  setError('');
                }}
              >
                Send to a different address
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                hint="Use the address you signed up with"
              />

              <Button type="submit" className="w-full" loading={loading}>
                Send reset link
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Remembered it?{' '}
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
