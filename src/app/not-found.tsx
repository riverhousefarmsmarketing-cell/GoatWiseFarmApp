import Link from 'next/link';

/**
 * 404 page. Self-contained and inline-styled so it renders correctly whether or
 * not the visitor is inside the authenticated app shell.
 */
export default function NotFound() {
  return (
    <div
      style={{
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
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Page not found</h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 20px' }}>
          We couldn’t find that page. It may have moved, or the link is out of date.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            background: '#105040',
            color: '#fff',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
