'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { FarmProvider } from '@/hooks/useFarm';
import { LoadingPage } from '@/components/ui';

/** Printable sheets: signed-in, farm data, no sidebar. */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);
  if (loading) return <LoadingPage />;
  if (!user) return null;
  return (
    <FarmProvider>
      <div className="print-sheet bg-white text-black min-h-screen">{children}</div>
    </FarmProvider>
  );
}
