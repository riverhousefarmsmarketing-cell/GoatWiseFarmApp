'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient, mutationFrom } from '@/lib/supabase';
import { format, subDays, addDays, parseISO } from 'date-fns';
import type { HealthRecord, HealthRecordInsert, Inspection, InspectionInsert } from '@/types/database';

// ==========================================
// QUERY KEYS
// ==========================================

export const healthKeys = {
  all: ['health'] as const,
  records: () => [...healthKeys.all, 'records'] as const,
  recordList: (filters: Record<string, unknown>) => [...healthKeys.records(), filters] as const,
  recordsByAnimal: (animalId: string) => [...healthKeys.records(), 'animal', animalId] as const,
  inspections: () => [...healthKeys.all, 'inspections'] as const,
  inspectionsByAnimal: (animalId: string) => [...healthKeys.inspections(), 'animal', animalId] as const,
  followUps: () => [...healthKeys.all, 'follow-ups'] as const,
  withdrawals: () => [...healthKeys.all, 'withdrawals'] as const,
};

// ==========================================
// HEALTH RECORDS
// ==========================================

export function useHealthRecords(options: { animalId?: string; type?: string; days?: number } = {}) {
  const supabase = getSupabaseClient();
  const startDate = options.days 
    ? format(subDays(new Date(), options.days), 'yyyy-MM-dd')
    : undefined;

  return useQuery<HealthRecord[]>({
    queryKey: healthKeys.recordList(options),
    queryFn: async () => {
      let query = supabase.from('health_records')
        .select('*, animals(name)')
        .order('date', { ascending: false });

      if (options.animalId) {
        query = query.eq('animal_id', options.animalId);
      }
      if (options.type && options.type !== 'all') {
        query = query.eq('type', options.type);
      }
      if (startDate) {
        query = query.gte('date', startDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

export function useFollowUpsDue() {
  const supabase = getSupabaseClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: healthKeys.followUps(),
    queryFn: async () => {
      const { data, error } = await supabase.from('health_records')
        .select('*, animals(name)')
        .eq('follow_up_completed', false)
        .not('follow_up_date', 'is', null)
        .lte('follow_up_date', today)
        .order('follow_up_date');

      if (error) throw error;
      return data;
    },
  });
}

export function useActiveWithdrawals() {
  const supabase = getSupabaseClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: healthKeys.withdrawals(),
    queryFn: async () => {
      // Get records with withdrawal periods
      const { data, error } = await supabase.from('health_records')
        .select('*, animals(name)')
        .not('withdrawal_days', 'is', null)
        .gt('withdrawal_days', 0)
        .order('date', { ascending: false });

      if (error) throw error;

      // Filter to active withdrawals
      return (data as HealthRecord[]).filter((record) => {
        if (!record.withdrawal_days) return false;
        const endDate = addDays(parseISO(record.date), record.withdrawal_days);
        return endDate >= new Date();
      }).map((record) => ({
        ...record,
        withdrawalEndDate: format(
          addDays(parseISO(record.date), record.withdrawal_days!),
          'yyyy-MM-dd'
        ),
      }));
    },
  });
}

export function useCreateHealthRecord() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (record: Omit<HealthRecordInsert, 'user_id'>): Promise<HealthRecord> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await mutationFrom('health_records')
        .insert({ ...record, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as HealthRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all });
    },
  });
}

export function useUpdateHealthRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HealthRecord> & { id: string }) => {
      const { data, error } = await mutationFrom('health_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all });
    },
  });
}

export function useMarkFollowUpComplete() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await mutationFrom('health_records')
        .update({ follow_up_completed: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all });
    },
    onError: (e: any) => {
      alert(`Could not update the follow-up: ${e?.message || 'please try again.'}`);
    },
  });
}

// ==========================================
// INSPECTIONS
// ==========================================

export function useInspections(animalId?: string) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: animalId 
      ? healthKeys.inspectionsByAnimal(animalId)
      : healthKeys.inspections(),
    queryFn: async () => {
      let query = supabase.from('inspections')
        .select('*, animals(name)')
        .order('date', { ascending: false });

      if (animalId) {
        query = query.eq('animal_id', animalId);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      return data;
    },
  });
}

export function useLatestInspections() {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['health', 'latest-inspections'],
    queryFn: async () => {
      // Get the most recent inspection for each animal
      const { data, error } = await supabase.from('inspections')
        .select('*, animals(name)')
        .order('date', { ascending: false });

      if (error) throw error;

      // Group by animal, keep latest
      const byAnimal = (data as Inspection[]).reduce((acc: Record<string, Inspection>, inspection) => {
        if (!acc[inspection.animal_id]) {
          acc[inspection.animal_id] = inspection;
        }
        return acc;
      }, {} as Record<string, any>);

      return Object.values(byAnimal);
    },
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (inspection: Omit<InspectionInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await mutationFrom('inspections')
        .insert({ ...inspection, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all });
    },
  });
}

export function useUpdateInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Inspection> & { id: string }) => {
      const { data, error } = await mutationFrom('inspections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all });
    },
  });
}

export function useDeleteInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await mutationFrom('inspections')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all });
    },
    onError: (e: any) => {
      alert(`Could not delete the inspection: ${e?.message || 'please try again.'}`);
    },
  });
}
