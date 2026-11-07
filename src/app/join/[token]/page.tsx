'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { Button, Card, LoadingPage } from '@/components/ui';

interface InviteInfo {
  farm_name: string;
  role: string;
  valid: boolean;
}

/**
 * Where an invite link lands. Shows which farm it's for, then either joins
 * straight away (already signed in) or sends the person to create a login or
 * sign in and come back.
 */
export default function JoinFarmPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [invite, setInvite] = useState<InviteInfo | null | undefined>(undefined);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (getSupabaseClient() as any)
      .rpc('get_invite_info', { p_token: params.token })
      .then(({ data }: { data: InviteInfo[] | null }) => setInvite(data?.[0] ?? null));
  }, [params.token]);

  const join = async () => {
    setJoining(true);
    setError('');
    const { error } = await (getSupabaseClient() as any).rpc('accept_farm_invite', { p_token: params.token });
    if (error) {
      setError(error.message);
      setJoining(false);
      return;
    }
    queryClient.clear();
    router.push('/dashboard');
  };

  if (authLoading || invite === undefined) return <LoadingPage />;

  const next = encodeURIComponent(`/join/${params.token}`);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#105040] rounded-2xl mb-4">
          <span className="text-3xl">🐐</span>
        </div>

        {!invite || !invite.valid ? (
          <>
            <h1 className="text-xl font-bold text-gray-900">This invite link doesn&apos;t work anymore</h1>
            <p className="text-gray-600 mt-2 text-sm">
              It may have expired, been used already, or been cancelled. Ask the farm owner to send you a new one.
            </p>
            <Link href={user ? '/dashboard' : '/login'} className="inline-block mt-6 text-[#105040] font-medium hover:underline">
              {user ? 'Go to my dashboard' : 'Go to sign in'}
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900">You&apos;re invited to {invite.farm_name}</h1>
            <p className="text-gray-600 mt-2 text-sm">
              You&apos;ll join as a <span className="font-medium">{invite.role}</span> on GoatWise and use your own login.
            </p>
            {error && <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

            {user ? (
              <div className="mt-6 space-y-3">
                <Button className="w-full" loading={joining} onClick={join}>
                  Join {invite.farm_name}
                </Button>
                <p className="text-xs text-gray-500">Signed in as {user.email}</p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <Link href={`/signup?invite=${encodeURIComponent(params.token)}`} className="block">
                  <Button className="w-full">Create my login</Button>
                </Link>
                <Link href={`/login?next=${next}`} className="block">
                  <Button variant="outline" className="w-full">I already have a GoatWise login</Button>
                </Link>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
