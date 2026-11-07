'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useFarm } from '@/hooks/useFarm';
import { pokeDispatch } from '@/lib/push';

// ---------------------------------------------------------------------------
// Farm updates feed (migration 021)
// ---------------------------------------------------------------------------

export interface FarmPost {
  id: string;
  farm_id: string;
  author_id: string | null;
  title: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  farm_post_reads: { user_id: string; read_at: string }[];
}

export const postKeys = { all: ['farm_posts'] as const };

export function useFarmPosts(limit = 100) {
  const { farm } = useFarm();
  return useQuery<FarmPost[]>({
    queryKey: [...postKeys.all, farm?.farm_id, limit],
    queryFn: async () => {
      const { data, error } = await (getSupabaseClient() as any)
        .from('farm_posts')
        .select('*, farm_post_reads(user_id, read_at)')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as FarmPost[];
    },
    enabled: !!farm,
    refetchInterval: 2 * 60_000,
  });
}

export function useSavePost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (post: { id?: string; title: string; body: string; pinned: boolean }) => {
      const supabase = getSupabaseClient() as any;
      const values = { title: post.title.trim() || null, body: post.body.trim(), pinned: post.pinned };
      const { error } = post.id
        ? await supabase.from('farm_posts').update({ ...values, updated_at: new Date().toISOString() }).eq('id', post.id)
        : await supabase.from('farm_posts').insert({ ...values, author_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: postKeys.all }); pokeDispatch(); },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (getSupabaseClient() as any).from('farm_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.all }),
  });
}

/** Record that the signed-in person has seen these posts. */
export function useMarkPostsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (postIds: string[]) => {
      if (postIds.length === 0) return;
      const { error } = await (getSupabaseClient() as any)
        .from('farm_post_reads')
        .upsert(postIds.map((post_id) => ({ post_id, user_id: user!.id })), { onConflict: 'post_id,user_id', ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.all }),
  });
}

// ---------------------------------------------------------------------------
// Assignments (migration 021)
// ---------------------------------------------------------------------------

export type AssignmentStatus = 'todo' | 'in_progress' | 'done';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Assignment {
  id: string;
  farm_id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  status: AssignmentStatus;
  recurrence: Recurrence;
  animal_id: string | null;
  herd_id: string | null;
  paddock_id: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
  completion_note: string | null;
  assignment_assignees: { user_id: string }[];
  animals: { name: string } | null;
  herds: { name: string } | null;
  paddocks: { name: string } | null;
}

export const STATUS_LABELS: Record<AssignmentStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
};

export const assignmentKeys = { all: ['assignments'] as const };

export function useAssignments(opts: { includeDone?: boolean } = {}) {
  const { farm } = useFarm();
  return useQuery<Assignment[]>({
    queryKey: [...assignmentKeys.all, farm?.farm_id, !!opts.includeDone],
    queryFn: async () => {
      let q = (getSupabaseClient() as any)
        .from('assignments')
        .select('*, assignment_assignees(user_id), animals(name), herds(name), paddocks(name)')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (!opts.includeDone) {
        q = q.neq('status', 'done');
      } else {
        q = q.limit(300);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Assignment[];
    },
    enabled: !!farm,
    refetchInterval: 2 * 60_000,
  });
}

export interface AssignmentInput {
  id?: string;
  title: string;
  notes: string;
  due_date: string;
  recurrence: Recurrence;
  animal_id: string;
  herd_id: string;
  paddock_id: string;
  assignees: string[];
}

export function useSaveAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssignmentInput) => {
      const supabase = getSupabaseClient() as any;
      const values = {
        title: input.title.trim(),
        notes: input.notes.trim() || null,
        due_date: input.due_date || null,
        recurrence: input.recurrence,
        animal_id: input.animal_id || null,
        herd_id: input.herd_id || null,
        paddock_id: input.paddock_id || null,
      };

      let id = input.id;
      if (id) {
        const { error } = await supabase.from('assignments').update(values).eq('id', id);
        if (error) throw error;
        const { data: current, error: curErr } = await supabase
          .from('assignment_assignees').select('user_id').eq('assignment_id', id);
        if (curErr) throw curErr;
        const have: string[] = (current ?? []).map((r: any) => r.user_id);
        const toRemove = have.filter((u) => !input.assignees.includes(u));
        const toAdd = input.assignees.filter((u) => !have.includes(u));
        if (toRemove.length) {
          const { error: e } = await supabase.from('assignment_assignees').delete().eq('assignment_id', id).in('user_id', toRemove);
          if (e) throw e;
        }
        if (toAdd.length) {
          const { error: e } = await supabase.from('assignment_assignees').insert(toAdd.map((user_id) => ({ assignment_id: id, user_id })));
          if (e) throw e;
        }
      } else {
        const { data, error } = await supabase.from('assignments').insert(values).select('id').single();
        if (error) throw error;
        id = data.id as string;
        if (input.assignees.length) {
          const { error: e } = await supabase
            .from('assignment_assignees')
            .insert(input.assignees.map((user_id) => ({ assignment_id: id, user_id })));
          if (e) throw e;
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: assignmentKeys.all }); pokeDispatch(); },
  });
}

export function useSetAssignmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: AssignmentStatus; note?: string | null }) => {
      const update: Record<string, unknown> = { status };
      if (note !== undefined) update.completion_note = note || null;
      const { error } = await (getSupabaseClient() as any).from('assignments').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (getSupabaseClient() as any).from('assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}

/** Today's date as yyyy-MM-dd in the person's own time zone. */
export function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function isOverdue(a: Pick<Assignment, 'due_date' | 'status'>): boolean {
  return a.status !== 'done' && !!a.due_date && a.due_date < todayISO();
}
