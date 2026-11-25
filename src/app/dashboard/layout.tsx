'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { LoadingPage } from '@/components/ui';
import { FeedbackButton } from '@/components/FeedbackButton';
import { NotificationBanner } from '@/components/NotificationBanner';
import { OutboxSync } from '@/components/OutboxSync';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingPage />;
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <NotificationBanner />
      {children}
      <FeedbackButton />
      <OutboxSync />
    </DashboardLayout>
  );
}
