'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient, mutationFrom } from '@/lib/supabase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import type { MilkRecord, MilkRecordInsert } from '@/types/database';

// ==========================================
// QUERY KEYS
// ==========================================

export const milkKeys = {
  all: ['milk'] as const,
  lists: () => [...milkKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...milkKeys.lists(), filters] as const,
  today: () => [...milkKeys.all, 'today'] as const,
  stats: (days: number) => [...milkKeys.all, 'stats', days] as const,
  byAnimal: (animalId: string) => [...milkKeys.all, 'animal', animalId] as const,
};

// ==========================================
// HOOKS
// ==========================================

export function useTodaysMilk() {
  const supabase = getSupabaseClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: milkKeys.today(),
    queryFn: async () => {
      const { data, error } = await supabase.from('milk_records')
        .select('*, animals(name)')
        .eq('date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (MilkRecord & { animals?: { name: string } | null })[];
    },
  });
}

export function useMilkStats(days: number = 7) {
  const supabase = getSupabaseClient();
  // days-1: an inclusive `.gte` window is `days` calendar days counting today
  // (subDays(now, days) spanned days+1, so a "7-day" stat covered 8 days).
  const startDate = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');

  return useQuery({
    queryKey: milkKeys.stats(days),
    queryFn: async () => {
      const { data, error } = await supabase.from('milk_records')
        .select('date, amount, amount_unit, discarded')
        .gte('date', startDate)
        .order('date');

      if (error) throw error;

      const records = data as MilkRecord[];

      // Group by date
      const byDate = records.reduce((acc, record) => {
        if (!acc[record.date]) {
          acc[record.date] = { total: 0, discarded: 0 };
        }
        if (record.discarded) {
          acc[record.date].discarded += record.amount;
        } else {
          acc[record.date].total += record.amount;
        }
        return acc;
      }, {} as Record<string, { total: number; discarded: number }>);

      // Calculate totals
      const totalAmount = records
        .filter((r) => !r.discarded)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const discardedAmount = records
        .filter((r) => r.discarded)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const dailyAverage = totalAmount / days;

      return {
        byDate,
        totalAmount,
        discardedAmount,
        dailyAverage,
        recordCount: records.length,
      };
    },
  });
}

export function useMilkByAnimal(animalId: string, days: number = 30) {
  const supabase = getSupabaseClient();
  // days-1: an inclusive `.gte` window is `days` calendar days counting today
  // (subDays(now, days) spanned days+1, so a "7-day" stat covered 8 days).
  const startDate = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');

  return useQuery({
    queryKey: [...milkKeys.byAnimal(animalId), days],
    queryFn: async () => {
      const { data, error } = await supabase.from('milk_records')
        .select('*')
        .eq('animal_id', animalId)
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as MilkRecord[];
    },
    enabled: !!animalId,
  });
}

export function useTopProducers(days: number = 7) {
  const supabase = getSupabaseClient();
  // days-1: an inclusive `.gte` window is `days` calendar days counting today
  // (subDays(now, days) spanned days+1, so a "7-day" stat covered 8 days).
  const startDate = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['milk', 'top-producers', days],
    queryFn: async () => {
      const { data, error } = await supabase.from('milk_records')
        .select('animal_id, amount, animals(name)')
        .gte('date', startDate)
        .eq('discarded', false);

      if (error) throw error;

      // Group by animal
      const byAnimal = (data as (MilkRecord & { animals: { name: string } | null })[]).reduce((acc: Record<string, { animalId: string; name: string; total: number }>, record) => {
        if (!acc[record.animal_id]) {
          acc[record.animal_id] = {
            animalId: record.animal_id,
            name: record.animals?.name || 'Unknown',
            total: 0,
          };
        }
        acc[record.animal_id].total += record.amount;
        return acc;
      }, {} as Record<string, { animalId: string; name: string; total: number }>);

      return Object.values(byAnimal)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    },
  });
}

export function useCreateMilkRecord() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (record: Omit<MilkRecordInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await mutationFrom('milk_records')
        .insert({ ...record, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as MilkRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: milkKeys.all });
    },
  });
}

export function useDeleteMilkRecord() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('milk_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: milkKeys.all });
    },
  });
}
