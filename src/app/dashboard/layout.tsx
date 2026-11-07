'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { FarmProvider, useFarm } from '@/hooks/useFarm';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { Button, Card, Input, LoadingPage } from '@/components/ui';
import { Toaster } from '@/components/ui/toast';
import { getSupabaseClient } from '@/lib/supabase';
import { OfflineSync } from '@/hooks/useOffline';

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
    <OfflineSync userId={user.id}>
      <FarmProvider>
        <FarmGate>
          <DashboardLayout>{children}</DashboardLayout>
        </FarmGate>
        <Toaster />
      </FarmProvider>
    </OfflineSync>
  );
}

/** Everything in the dashboard belongs to a farm. Someone who was removed
 *  from their only farm lands here and can start their own. */
function FarmGate({ children }: { children: React.ReactNode }) {
  const { farm, loading, refresh } = useFarm();
  const { signOut } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (loading) return <LoadingPage />;
  if (farm) return <>{children}</>;

  const createFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const { error } = await (getSupabaseClient() as any).rpc('create_my_farm', { p_name: name });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    await refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9] px-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-bold text-gray-900">You&apos;re not part of a farm right now</h1>
        <p className="text-gray-600 mt-2 text-sm">
          If someone is adding you to their farm, open the invite link they sent you. Or start your own farm below.
        </p>
        <form onSubmit={createFarm} className="mt-5 space-y-3">
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
          <Input label="Farm name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Happy Goat Farm" />
          <Button type="submit" loading={saving} className="w-full">
            Start my farm
          </Button>
        </form>
        <button onClick={() => signOut()} className="mt-4 text-sm text-gray-500 hover:underline">
          Sign out
        </button>
      </Card>
    </div>
  );
}
