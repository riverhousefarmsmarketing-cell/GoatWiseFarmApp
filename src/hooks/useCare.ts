'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useFarm } from '@/hooks/useFarm';
import { deleteOrRequest } from '@/lib/deleteRecord';
import type { CareKind, CarePlan, ChoreCompletion } from '@/lib/chores';
import { insertOrQueue } from '@/lib/offline';
import { notify } from '@/components/ui/toast';
import { usePendingRows } from '@/hooks/useOffline';

const db = () => getSupabaseClient() as any;

// ---------------------------------------------------------------------------
// Care plans
// ---------------------------------------------------------------------------

export interface CarePlanRow extends CarePlan {
  farm_id: string;
  created_at: string;
  groups: { name: string; color: string | null } | null;
  paddocks: { name: string } | null;
  herds: { name: string; color: string | null } | null;
}

export const careKeys = {
  plans: ['care_plans'] as const,
  completions: ['chore_completions'] as const,
  minerals: ['minerals'] as const,
  refills: ['mineral_refills'] as const,
};

export const KIND_LABELS: Record<CareKind, string> = {
  feeding: 'Feeding',
  watering: 'Watering',
  instruction: 'Special instruction',
};

export function useCarePlans() {
  const { farm } = useFarm();
  return useQuery<CarePlanRow[]>({
    queryKey: [...careKeys.plans, farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await db()
        .from('care_plans')
        .select('*, groups(name, color), paddocks(name), herds(name, color)')
        .order('kind')
        .order('title');
      if (error) throw error;
      return data as CarePlanRow[];
    },
    enabled: !!farm,
  });
}

export interface CarePlanInput {
  id?: string;
  kind: CareKind;
  target: 'group' | 'paddock' | 'herd';
  target_id: string;
  title: string;
  amount: string;
  unit: string;
  times: string[];
  days_of_week: number[];
  seasonal: boolean;
  season_start: string;
  season_end: string;
  active: boolean;
  notes: string;
}

export function useSaveCarePlan() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: CarePlanInput) => {
      const times = input.kind === 'instruction' ? [] : Array.from(new Set(input.times.filter(Boolean))).sort();
      const values = {
        kind: input.kind,
        group_id: input.target === 'group' ? input.target_id : null,
        paddock_id: input.target === 'paddock' ? input.target_id : null,
        herd_id: input.target === 'herd' ? input.target_id : null,
        title: input.title.trim(),
        amount: input.kind === 'instruction' || input.amount === '' ? null : Number(input.amount),
        unit: input.kind === 'instruction' ? null : input.unit.trim() || null,
        times,
        days_of_week: input.days_of_week.length === 0 || input.days_of_week.length === 7 ? null : [...input.days_of_week].sort(),
        season_start: input.seasonal ? input.season_start : null,
        season_end: input.seasonal ? input.season_end : null,
        active: input.active,
        notes: input.notes.trim() || null,
      };
      const { error } = input.id
        ? await db().from('care_plans').update(values).eq('id', input.id)
        : await db().from('care_plans').insert({ ...values, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: careKeys.plans }),
  });
}

export function useSetCarePlanActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await db().from('care_plans').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: careKeys.plans }),
  });
}

export function useDeleteCarePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('care_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: careKeys.plans }),
  });
}

// ---------------------------------------------------------------------------
// Chore check-offs
// ---------------------------------------------------------------------------

export function useChoreCompletions(isoDate: string) {
  const { farm } = useFarm();
  const pending = usePendingRows<ChoreCompletion>('chore_completions');
  const query = useQuery<ChoreCompletion[]>({
    queryKey: [...careKeys.completions, farm?.farm_id, isoDate],
    queryFn: async () => {
      const { data, error } = await db().from('chore_completions').select('*').eq('chore_date', isoDate);
      if (error) throw error;
      return data as ChoreCompletion[];
    },
    enabled: !!farm,
    refetchInterval: 60_000,
  });
  // Ticks saved on this device but not sent yet still show as done.
  const data = useMemo(() => {
    const sent = query.data ?? [];
    const extra = pending.filter((p) => p.chore_date === isoDate && !sent.some((s) => s.care_plan_id === p.care_plan_id && s.slot === p.slot))
      .map((p) => ({ ...p, done_at: p.done_at ?? new Date().toISOString() }));
    return [...sent, ...extra];
  }, [query.data, pending, isoDate]);
  return { ...query, data };
}

export function useTickChore() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (c: { care_plan_id: string; chore_date: string; slot: string; note?: string | null }) => {
      // Works with no signal too: kept on the device and sent later. Someone
      // else ticking it a moment ago is fine ("already there").
      const result = await insertOrQueue('chore_completions', [{ ...c, note: c.note?.trim() || null, user_id: user!.id }], 'Chore ticked off');
      if (result === 'queued') notify('No signal: ticked off on this device. It will be sent when you’re back online.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: careKeys.completions }),
  });
}

export function useUntickChore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (completionId: string) => {
      const { data, error } = await db().from('chore_completions').delete().eq('id', completionId).select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Only the person who ticked this off (or a manager) can undo it.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: careKeys.completions }),
  });
}

// ---------------------------------------------------------------------------
// Minerals (feed types in the 'mineral' category) and refills by pasture
// ---------------------------------------------------------------------------

export interface Mineral {
  id: string;
  name: string;
  unit: string;
  check_every_days: number | null;
  notes: string | null;
}

export interface MineralRefill {
  id: string;
  paddock_id: string;
  feed_type_id: string;
  amount: number;
  unit: string;
  refilled_on: string;
  notes: string | null;
  user_id: string | null;
  created_at: string;
}

export function useMinerals() {
  const { farm } = useFarm();
  return useQuery<Mineral[]>({
    queryKey: [...careKeys.minerals, farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await db()
        .from('feed_types')
        .select('id, name, unit, check_every_days, notes')
        .eq('category', 'mineral')
        .order('name');
      if (error) throw error;
      return data as Mineral[];
    },
    enabled: !!farm,
  });
}

export function useSaveMineral() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (m: { id?: string; name: string; unit: string; check_every_days: string; notes: string }) => {
      const values = {
        name: m.name.trim(),
        unit: m.unit.trim() || 'lbs',
        check_every_days: m.check_every_days ? Number(m.check_every_days) : null,
        notes: m.notes.trim() || null,
      };
      const { error } = m.id
        ? await db().from('feed_types').update(values).eq('id', m.id)
        : await db().from('feed_types').insert({ ...values, category: 'mineral', user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: careKeys.minerals });
      queryClient.invalidateQueries({ queryKey: ['feed_types'] });
      queryClient.invalidateQueries({ queryKey: ['feed-types'] });
    },
  });
}

export function useMineralRefills() {
  const { farm } = useFarm();
  return useQuery<MineralRefill[]>({
    queryKey: [...careKeys.refills, farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await db()
        .from('mineral_refills')
        .select('*')
        .order('refilled_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data as MineralRefill[];
    },
    enabled: !!farm,
  });
}

/** Log one or more minerals put out in one pasture on one day. */
export function useLogRefills() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      paddock_id: string;
      refilled_on: string;
      notes: string;
      rows: { feed_type_id: string; amount: string; unit: string }[];
    }) => {
      const rows = input.rows
        .filter((r) => r.feed_type_id && Number(r.amount) > 0)
        .map((r) => ({
          paddock_id: input.paddock_id,
          refilled_on: input.refilled_on,
          notes: input.notes.trim() || null,
          feed_type_id: r.feed_type_id,
          amount: Number(r.amount),
          unit: r.unit.trim() || 'lbs',
          user_id: user!.id,
        }));
      if (rows.length === 0) throw new Error('Add at least one mineral with an amount.');
      const result = await insertOrQueue('mineral_refills', rows, `Mineral refill (${rows.length})`);
      if (result === 'queued') notify('No signal: saved on this device. It will be sent when you’re back online.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: careKeys.refills }),
  });
}

export function useDeleteRefill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { error } = await deleteOrRequest('mineral_refills', id, label);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: careKeys.refills }),
  });
}

/** Most recent refill for each pasture + mineral pair. */
export function latestRefills(refills: MineralRefill[]): Map<string, MineralRefill> {
  const latest = new Map<string, MineralRefill>();
  for (const r of refills) {
    const key = `${r.paddock_id}|${r.feed_type_id}`;
    const have = latest.get(key);
    if (!have || r.refilled_on > have.refilled_on || (r.refilled_on === have.refilled_on && r.created_at > have.created_at)) {
      latest.set(key, r);
    }
  }
  return latest;
}
