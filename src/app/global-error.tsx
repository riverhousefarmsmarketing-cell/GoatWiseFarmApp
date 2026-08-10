'use client';

import { useEffect } from 'react';

/**
 * Root error boundary. Catches errors thrown in the root layout itself (which
 * a route-segment error.tsx can't reach). It replaces the whole document, so it
 * must render its own <html>/<body>. Kept dependency-free and inline-styled so
 * it works even if the app shell/styles are what failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global render error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#f9fafb',
          color: '#111827',
          padding: '1.5rem',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🐐</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 20px' }}>
            The app hit an unexpected error. Your data is safe — please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: '#105040',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
