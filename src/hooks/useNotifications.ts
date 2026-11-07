'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const db = () => getSupabaseClient() as any;

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  urgent: boolean;
  created_at: string;
  read_at: string | null;
}

export const NOTIFICATION_KINDS: { kind: string; label: string; managersOnly?: boolean }[] = [
  { kind: 'concern', label: 'Concerns reported', managersOnly: true },
  { kind: 'approval', label: 'Delete requests to approve', managersOnly: true },
  { kind: 'restock', label: 'Items low or out', managersOnly: true },
  { kind: 'dose_late', label: 'Treatment doses late', managersOnly: true },
  { kind: 'chore_late', label: 'Chores late', managersOnly: true },
  { kind: 'assignment', label: 'New assignments for me' },
  { kind: 'assignment_overdue', label: 'My overdue assignments' },
  { kind: 'farm_update', label: 'Farm updates' },
  { kind: 'concern_resolved', label: 'My concerns resolved' },
  { kind: 'approval_decided', label: 'My delete requests decided' },
];

const keys = { list: ['notifications'] as const, settings: ['notification_settings'] as const };

export function useNotifications() {
  const { user } = useAuth();
  return useQuery<AppNotification[]>({
    queryKey: [...keys.list, user?.id],
    queryFn: async () => {
      const { data, error } = await db().from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[] | 'all') => {
      let q = db().from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
      if (ids !== 'all') q = q.in('id', ids);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list }),
  });
}

export function useNotificationSettings() {
  const { user } = useAuth();
  return useQuery<string[]>({
    queryKey: [...keys.settings, user?.id],
    queryFn: async () => {
      const { data, error } = await db().from('notification_settings').select('muted_kinds').maybeSingle();
      if (error) throw error;
      return data?.muted_kinds ?? [];
    },
    enabled: !!user,
  });
}

export function useSaveNotificationSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (muted: string[]) => {
      const { error } = await db().from('notification_settings')
        .upsert({ user_id: user!.id, muted_kinds: muted, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.settings }),
  });
}
