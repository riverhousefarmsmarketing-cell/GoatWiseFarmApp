'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useFarm } from '@/hooks/useFarm';
import type { PayType } from '@/lib/pay';

const db = () => getSupabaseClient() as any;

export type PersonKind = 'family' | 'employee' | 'volunteer' | 'contractor' | 'other';
export const PERSON_KIND_LABELS: Record<PersonKind, string> = {
  family: 'Family', employee: 'Employee', volunteer: 'Volunteer', contractor: 'Contractor', other: 'Other',
};

export interface Person {
  id: string;
  user_id: string | null;
  name: string;
  kind: PersonKind;
  phone: string | null;
  email: string | null;
  emergency_contact: string | null;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  notes: string | null;
}

export interface PersonPay {
  person_id: string;
  pay_type: PayType;
  rate: number | null;
  notes: string | null;
}

export interface TimeEntry {
  id: string;
  person_id: string;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number;
  hours: number;
  task: string | null;
  notes: string | null;
  user_id: string | null;
  paid_payment_id: string | null;
  created_at: string;
}

export interface PayPayment {
  id: string;
  person_id: string;
  paid_on: string;
  amount: number;
  period_start: string | null;
  period_end: string | null;
  hours: number | null;
  method: string | null;
  notes: string | null;
  transaction_id: string | null;
  user_id: string | null;
  created_at: string;
}

export const peopleKeys = {
  people: ['farm_people'] as const,
  pay: ['person_pay'] as const,
  hours: ['time_entries'] as const,
  payments: ['pay_payments'] as const,
};

export function usePeople() {
  const { farm } = useFarm();
  return useQuery<Person[]>({
    queryKey: [...peopleKeys.people, farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await db().from('farm_people').select('*').order('active', { ascending: false }).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!farm,
  });
}

/** The signed-in person's own profile, if any. */
export function useMyPerson() {
  const { user } = useAuth();
  const { data: people = [], ...rest } = usePeople();
  return { ...rest, data: people.find((p) => p.user_id === user?.id) ?? null };
}

export function personName(people: Person[] | undefined, id: string | null | undefined): string {
  if (!id) return 'Someone';
  return people?.find((p) => p.id === id)?.name ?? 'Former worker';
}

export function useSavePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<Person> & { name: string }) => {
      const { id, ...rest } = p;
      const { data, error } = id
        ? await db().from('farm_people').update(rest).eq('id', id).select('id').single()
        : await db().from('farm_people').insert(rest).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKeys.people }),
  });
}

/** Pay settings: owners and managers only (others get nothing back). */
export function usePersonPay() {
  const { farm, isManager } = useFarm();
  return useQuery<PersonPay[]>({
    queryKey: [...peopleKeys.pay, farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await db().from('person_pay').select('person_id, pay_type, rate, notes');
      if (error) throw error;
      return data;
    },
    enabled: !!farm && isManager,
  });
}

export function useSavePersonPay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (p: PersonPay) => {
      const { error } = await db().from('person_pay').upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: 'person_id' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKeys.pay }),
  });
}

export function useTimeEntries(opts: { personId?: string; from?: string; to?: string } = {}) {
  const { farm } = useFarm();
  return useQuery<TimeEntry[]>({
    queryKey: [...peopleKeys.hours, farm?.farm_id, opts.personId ?? 'all', opts.from ?? '', opts.to ?? ''],
    queryFn: async () => {
      let q = db().from('time_entries').select('*').order('work_date', { ascending: false }).order('created_at', { ascending: false }).limit(2000);
      if (opts.personId) q = q.eq('person_id', opts.personId);
      if (opts.from) q = q.gte('work_date', opts.from);
      if (opts.to) q = q.lte('work_date', opts.to);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!farm,
  });
}

export function useSaveTimeEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (t: Partial<TimeEntry> & { person_id: string; work_date: string }) => {
      const { id, created_at, user_id, paid_payment_id, ...rest } = t as any;
      const { error } = id
        ? await db().from('time_entries').update(rest).eq('id', id)
        : await db().from('time_entries').insert({ ...rest, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKeys.hours }),
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db().from('time_entries').delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Hours that have been paid can only be removed by the owner or a manager.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKeys.hours }),
  });
}

export function usePayments(personId?: string) {
  const { farm } = useFarm();
  return useQuery<PayPayment[]>({
    queryKey: [...peopleKeys.payments, farm?.farm_id, personId ?? 'all'],
    queryFn: async () => {
      let q = db().from('pay_payments').select('*').order('paid_on', { ascending: false }).limit(500);
      if (personId) q = q.eq('person_id', personId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!farm,
  });
}

/** Record a payment; optionally also as a labor expense in Money. */
export function useRecordPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (p: {
      person: Person; paid_on: string; amount: number; period_start: string | null; period_end: string | null;
      hours: number | null; method: string | null; notes: string | null; addToMoney: boolean;
    }) => {
      let transaction_id: string | null = null;
      if (p.addToMoney && p.amount > 0) {
        const period = p.period_start && p.period_end ? ` (${p.period_start} to ${p.period_end})` : '';
        const { data, error } = await db().from('transactions').insert({
          type: 'expense', category: 'labor', amount: p.amount, date: p.paid_on,
          description: `Pay: ${p.person.name}${period}`, payment_method: p.method, notes: p.notes, user_id: user!.id,
        }).select('id').single();
        if (error) throw error;
        transaction_id = data.id;
      }
      const { error } = await db().from('pay_payments').insert({
        person_id: p.person.id, paid_on: p.paid_on, amount: p.amount, period_start: p.period_start, period_end: p.period_end,
        hours: p.hours, method: p.method, notes: p.notes, transaction_id, user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleKeys.payments });
      queryClient.invalidateQueries({ queryKey: peopleKeys.hours });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('pay_payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleKeys.payments });
      queryClient.invalidateQueries({ queryKey: peopleKeys.hours });
    },
  });
}
