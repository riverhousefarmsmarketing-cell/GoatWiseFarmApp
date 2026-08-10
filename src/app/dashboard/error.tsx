'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';

/**
 * Route-segment error boundary for the dashboard. Without this, an uncaught
 * render error white-screened the whole app; now the sidebar/nav persists and
 * the user gets a recovery card with a retry that re-renders the segment.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for debugging without exposing details to the user.
    console.error('Dashboard render error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 text-red-500 mb-4">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-500">
          This page hit an unexpected error. Your data is safe — try again, or head back to the
          dashboard.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Link href="/dashboard">
            <Button variant="secondary">Go to dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
