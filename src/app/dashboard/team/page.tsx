'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { Copy, Check, UserPlus, Trash2, Link2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFarm, useFarmMembers, farmKeys, ROLE_LABELS } from '@/hooks/useFarm';
import { getSupabaseClient } from '@/lib/supabase';
import { Badge, Button, Card, Input, Modal, Select, LoadingSpinner } from '@/components/ui';
import type { FarmRole } from '@/lib/farmSession';

interface Invite {
  id: string;
  role: 'manager' | 'worker';
  label: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

const ROLE_HELP: Record<FarmRole, string> = {
  owner: 'Everything, including managing the team.',
  manager: 'Everything except changing roles or removing people. Approves deletions, posts updates, makes assignments.',
  worker: 'Adds and edits records. Deleting needs approval.',
};

export default function TeamPage() {
  const supabase = getSupabaseClient() as any;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { farm, isOwner, isManager, refresh } = useFarm();
  const { data: members = [], isLoading } = useFarmMembers();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<'worker' | 'manager'>('worker');
  const [inviteLabel, setInviteLabel] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [farmName, setFarmName] = useState<string | null>(null);

  const { data: invites = [] } = useQuery<Invite[]>({
    queryKey: ['farm_invites', farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farm_invites')
        .select('id, role, label, created_at, expires_at, accepted_at, revoked_at')
        .is('accepted_at', null)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Invite[];
    },
    enabled: !!farm && isManager,
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_farm_invite', {
        p_role: inviteRole,
        p_label: inviteLabel || null,
      });
      if (error) throw error;
      return `${window.location.origin}/join/${data as string}`;
    },
    onSuccess: (link) => {
      setInviteLink(link);
      queryClient.invalidateQueries({ queryKey: ['farm_invites'] });
    },
    onError: (e: any) => alert(e.message),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('revoke_farm_invite', { p_invite_id: id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farm_invites'] }),
    onError: (e: any) => alert(e.message),
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: FarmRole }) => {
      const { error } = await supabase.rpc('set_member_role', { p_user_id: userId, p_role: role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmKeys.members });
      refresh();
    },
    onError: (e: any) => alert(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('remove_farm_member', { p_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: farmKeys.members }),
    onError: (e: any) => alert(e.message),
  });

  const renameFarm = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('farms').update({ name }).eq('id', farm!.farm_id);
      if (error) throw error;
    },
    onSuccess: () => {
      setFarmName(null);
      refresh();
    },
    onError: (e: any) => alert(e.message),
  });

  const openInvite = () => {
    setInviteRole('worker');
    setInviteLabel('');
    setInviteLink(null);
    setCopied(false);
    setInviteOpen(true);
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    } catch {
      window.prompt('Copy this link:', inviteLink);
    }
  };

  if (!farm) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500">Everyone who can log in to {farm.name}</p>
        </div>
        {isManager && (
          <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={openInvite}>
            Invite someone
          </Button>
        )}
      </div>

      {isOwner && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-3">Farm name</h2>
          {farmName === null ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-gray-700">{farm.name}</p>
              <Button variant="outline" size="sm" onClick={() => setFarmName(farm.name)}>
                Rename
              </Button>
            </div>
          ) : (
            <form
              className="flex flex-col sm:flex-row gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (farmName.trim()) renameFarm.mutate(farmName.trim());
              }}
            >
              <div className="flex-1">
                <Input value={farmName} onChange={(e) => setFarmName(e.target.value)} aria-label="Farm name" />
              </div>
              <Button type="submit" loading={renameFarm.isPending}>Save</Button>
              <Button type="button" variant="ghost" onClick={() => setFarmName(null)}>Cancel</Button>
            </form>
          )}
          {farm.complimentary && (
            <p className="mt-3 text-sm text-[#105040]">This farm has a complimentary account.</p>
          )}
        </Card>
      )}

      <Card padding="none">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">People ({members.length})</h2>
        </div>
        {isLoading ? (
          <div className="p-8 flex justify-center"><LoadingSpinner /></div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map((m) => {
              const isMe = m.user_id === user?.id;
              return (
                <li key={m.user_id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#B8DCC8] text-[#0A3228] flex items-center justify-center font-medium flex-shrink-0">
                      {(m.display_name || m.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {m.display_name || m.email}
                        {isMe && <span className="text-gray-400 font-normal"> (you)</span>}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {m.email} · joined {format(new Date(m.joined_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwner && !isMe ? (
                      <select
                        value={m.role}
                        onChange={(e) => setRole.mutate({ userId: m.user_id, role: e.target.value as FarmRole })}
                        className="rounded-lg border border-[#DDD8D4] px-2 py-1.5 text-sm"
                        aria-label={`Role for ${m.display_name || m.email}`}
                      >
                        <option value="owner">Owner</option>
                        <option value="manager">Manager</option>
                        <option value="worker">Worker</option>
                      </select>
                    ) : (
                      <Badge variant={m.role === 'worker' ? 'default' : 'success'}>{ROLE_LABELS[m.role]}</Badge>
                    )}
                    {isOwner && !isMe && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${m.display_name || m.email}`}
                        onClick={() => {
                          if (confirm(`Remove ${m.display_name || m.email} from ${farm.name}? They will lose access right away. Records they entered stay.`)) {
                            removeMember.mutate(m.user_id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-[#9B1C1C]" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {isManager && invites.length > 0 && (
        <Card padding="none">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Invites not used yet</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {invites.map((inv) => (
              <li key={inv.id} className="px-5 py-3 flex items-center gap-3">
                <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">
                    {inv.label || 'Invite'} · {ROLE_LABELS[inv.role]}
                  </p>
                  <p className="text-xs text-gray-500">
                    Expires {formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => revokeInvite.mutate(inv.id)}>
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold text-gray-900 mb-3">What each role can do</h2>
        <dl className="space-y-2 text-sm">
          {(Object.keys(ROLE_HELP) as FarmRole[]).map((r) => (
            <div key={r} className="flex flex-col sm:flex-row sm:gap-3">
              <dt className="font-medium text-gray-900 sm:w-24">{ROLE_LABELS[r]}</dt>
              <dd className="text-gray-600">{ROLE_HELP[r]}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite someone to your farm"
        footer={
          inviteLink ? (
            <Button onClick={() => setInviteOpen(false)}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button loading={createInvite.isPending} onClick={() => createInvite.mutate()}>
                Create invite link
              </Button>
            </>
          )
        }
      >
        {inviteLink ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Send this link to {inviteLabel || 'them'} by text or email. They&apos;ll create their own login and join{' '}
              {farm.name} as a {ROLE_LABELS[inviteRole].toLowerCase()}. The link works once and expires in 14 days.
            </p>
            <div className="flex gap-2">
              <input readOnly value={inviteLink} className="flex-1 min-w-0 rounded-lg border border-[#DDD8D4] px-3 py-2 text-sm bg-gray-50" onFocus={(e) => e.target.select()} />
              <Button variant="outline" onClick={copyLink} leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Who is it for?"
              value={inviteLabel}
              onChange={(e) => setInviteLabel(e.target.value)}
              placeholder="e.g. Jake"
              hint="Just so you can tell your invite links apart."
            />
            <Select
              label="Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'worker' | 'manager')}
              options={[
                { value: 'worker', label: 'Worker' },
                ...(isOwner ? [{ value: 'manager', label: 'Manager' }] : []),
              ]}
            />
            <p className="text-sm text-gray-500">{ROLE_HELP[inviteRole]}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
