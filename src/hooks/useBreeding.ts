'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { addDays, format, differenceInDays } from 'date-fns';
import type { BreedingRecord, BreedingRecordInsert } from '@/types/database';

const GESTATION_DAYS = 150;

// ==========================================
// QUERY KEYS
// ==========================================

export const breedingKeys = {
  all: ['breeding'] as const,
  lists: () => [...breedingKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...breedingKeys.lists(), filters] as const,
  detail: (id: string) => [...breedingKeys.all, 'detail', id] as const,
  upcoming: () => [...breedingKeys.all, 'upcoming'] as const,
  byDoe: (doeId: string) => [...breedingKeys.all, 'doe', doeId] as const,
};

// ==========================================
// HOOKS
// ==========================================

export function useBreedingRecords(status?: string) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: breedingKeys.list({ status }),
    queryFn: async () => {
      let query = (supabase
        .from('breeding_records') as any)
        .select(`
          *,
          doe:animals!breeding_records_doe_id_fkey(id, name),
          buck:animals!breeding_records_buck_id_fkey(id, name)
        `)
        .order('breeding_date', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

export function useUpcomingKiddings(days: number = 30) {
  const supabase = getSupabaseClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const futureDate = format(addDays(new Date(), days), 'yyyy-MM-dd');

  return useQuery({
    queryKey: breedingKeys.upcoming(),
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('breeding_records') as any)
        .select(`
          *,
          doe:animals!breeding_records_doe_id_fkey(id, name)
        `)
        .in('status', ['bred', 'confirmed_pregnant'])
        .not('due_date', 'is', null)
        .gte('due_date', today)
        .lte('due_date', futureDate)
        .order('due_date');

      if (error) throw error;

      // Add days until due
      return (data as any[]).map((record) => ({
        ...record,
        daysUntilDue: differenceInDays(new Date(record.due_date), new Date()),
      }));
    },
  });
}

export function useBreedingByDoe(doeId: string) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: breedingKeys.byDoe(doeId),
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('breeding_records') as any)
        .select(`
          *,
          buck:animals!breeding_records_buck_id_fkey(id, name)
        `)
        .eq('doe_id', doeId)
        .order('breeding_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!doeId,
  });
}

export function useCreateBreedingRecord() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (record: {
      doe_id: string;
      buck_id?: string | null;
      breeding_date: string;
      breeding_method?: string;
      notes?: string | null;
      status?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate due date
      const dueDate = format(
        addDays(new Date(record.breeding_date), GESTATION_DAYS),
        'yyyy-MM-dd'
      );

      const { data, error } = await (supabase
        .from('breeding_records') as any)
        .insert({
          ...record,
          user_id: user.id,
          due_date: dueDate,
          status: record.status || 'bred',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: breedingKeys.all });
    },
  });
}

export function useUpdateBreedingRecord() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      status: string;
      confirmation_date: string;
      confirmation_method: string;
      kidding_date: string;
      number_of_kids: number;
      kidding_notes: string;
      labor_duration: string;
      assistance_required: boolean;
      assistance_notes: string;
      notes: string;
    }>) => {
      const { data, error } = await (supabase
        .from('breeding_records') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: breedingKeys.all });
    },
  });
}

export function useRecordKidding() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async ({
      breedingId,
      kiddingDate,
      numberOfKids,
      kiddingNotes,
      laborDuration,
      assistanceRequired,
      assistanceNotes,
    }: {
      breedingId: string;
      kiddingDate: string;
      numberOfKids?: number;
      kiddingNotes?: string;
      laborDuration?: string;
      assistanceRequired?: boolean;
      assistanceNotes?: string;
    }) => {
      const { data, error } = await (supabase
        .from('breeding_records') as any)
        .update({
          status: 'kidded',
          kidding_date: kiddingDate,
          number_of_kids: numberOfKids,
          kidding_notes: kiddingNotes,
          labor_duration: laborDuration,
          assistance_required: assistanceRequired,
          assistance_notes: assistanceNotes,
        })
        .eq('id', breedingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: breedingKeys.all });
    },
  });
}

export function useConfirmPregnancy() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async ({
      breedingId,
      confirmationDate,
      confirmationMethod,
    }: {
      breedingId: string;
      confirmationDate?: string;
      confirmationMethod?: string;
    }) => {
      const { data, error } = await (supabase
        .from('breeding_records') as any)
        .update({
          status: 'confirmed_pregnant',
          confirmation_date: confirmationDate || format(new Date(), 'yyyy-MM-dd'),
          confirmation_method: confirmationMethod,
        })
        .eq('id', breedingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: breedingKeys.all });
    },
  });
}
