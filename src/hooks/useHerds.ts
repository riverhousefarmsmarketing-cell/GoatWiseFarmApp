import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Herd, Animal, FeedSchedule as DBFeedSchedule } from '@/types/database';

// Re-export Herd from database types for consumers that import from this file
export type { Herd } from '@/types/database';

export interface HerdWithStats extends Herd {
  animalCount: number;
  milkingCount: number;
  buckCount: number;
}

// NOTE: herd_transfers table does not exist in the schema.
// Transfer hooks are commented out below until the table is created.
// See: supabase/migrations/ for adding a herd_transfers migration.

// ==========================================
// HERDS
// ==========================================

export function useHerds() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['herds'],
    queryFn: async () => {
      const { data, error } = await supabase.from('herds')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Herd[];
    },
    enabled: !!user,
  });
}

export function useHerdsWithStats() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['herds', 'with-stats'],
    queryFn: async () => {
      // Get herds
      const { data: herds, error: herdsError } = await supabase.from('herds')
        .select('*')
        .order('name');

      if (herdsError) throw herdsError;

      // Get animal counts per herd
      const { data: animals, error: animalsError } = await supabase.from('animals')
        .select('id, herd_id, category, status')
        .eq('status', 'active');

      if (animalsError) throw animalsError;

      // Calculate stats for each herd
      const herdsWithStats: HerdWithStats[] = (herds || []).map((herd: Herd) => {
        const herdAnimals = (animals || []).filter((a) => a.herd_id === herd.id);
        return {
          ...herd,
          animalCount: herdAnimals.length,
          milkingCount: herdAnimals.filter((a) => a.category === 'milking_doe').length,
          buckCount: herdAnimals.filter((a) => a.category === 'buck').length,
        };
      });

      // Add "unassigned" pseudo-herd
      const unassignedAnimals = (animals || []).filter((a) => !a.herd_id);
      if (unassignedAnimals.length > 0) {
        herdsWithStats.push({
          id: 'unassigned',
          name: 'Unassigned',
          description: 'Animals not assigned to any herd',
          color: '#9ca3af',
          user_id: user?.id || '',
          created_at: '',
          updated_at: '',
          animalCount: unassignedAnimals.length,
          milkingCount: unassignedAnimals.filter((a) => a.category === 'milking_doe').length,
          buckCount: unassignedAnimals.filter((a) => a.category === 'buck').length,
        });
      }

      return herdsWithStats;
    },
    enabled: !!user,
  });
}

export function useHerd(id: string) {
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['herd', id],
    queryFn: async () => {
      if (id === 'unassigned') {
        return {
          id: 'unassigned',
          name: 'Unassigned',
          description: 'Animals not assigned to any herd',
          color: '#9ca3af',
        } as Herd;
      }

      const { data, error } = await supabase.from('herds')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Herd;
    },
    enabled: !!user && !!id,
  });
}

export function useHerdAnimals(herdId: string) {
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['herd-animals', herdId],
    queryFn: async () => {
      let query = supabase.from('animals')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (herdId === 'unassigned') {
        query = query.is('herd_id', null);
      } else {
        query = query.eq('herd_id', herdId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!herdId,
  });
}

export function useCreateHerd() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (herd: { name: string; description?: string | null; color?: string; location?: string | null }) => {
      const { data, error } = await supabase.from('herds')
        .insert([{ ...herd, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['herds'] });
    },
  });
}

export function useUpdateHerd() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Herd> }) => {
      const { data, error } = await supabase.from('herds')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['herds'] });
      queryClient.invalidateQueries({ queryKey: ['herd', id] });
    },
  });
}

export function useDeleteHerd() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, unassign all animals from this herd
      await supabase.from('animals')
        .update({ herd_id: null })
        .eq('herd_id', id);

      // Then delete the herd
      const { error } = await supabase.from('herds').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['herds'] });
      queryClient.invalidateQueries({ queryKey: ['animals'] });
    },
  });
}

export function useAssignAnimalToHerd() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async ({ animalId, herdId }: { animalId: string; herdId: string | null }) => {
      const { data, error } = await supabase.from('animals')
        .update({ herd_id: herdId })
        .eq('id', animalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['herds'] });
      queryClient.invalidateQueries({ queryKey: ['herd-animals'] });
      queryClient.invalidateQueries({ queryKey: ['animals'] });
    },
  });
}

// ==========================================
// HERD TRANSFERS
// ==========================================
// NOTE: These are stubs until herd_transfers table is created.
// After running migration 002_add_herd_transfers.sql, replace
// these stubs with real Supabase queries.

export function useHerdTransfers(filter?: string) {
  return useQuery({
    queryKey: ['herd_transfers', filter],
    queryFn: async () => {
      // Stub: return empty array until table exists
      return [] as Array<{
        id: string;
        animal_id: string;
        from_herd_id: string | null;
        to_herd_id: string;
        reason?: string;
        status: string;
        requested_date: string;
        completed_date?: string;
        animals?: { name: string };
        from_herd?: { name: string };
        to_herd?: { name: string };
      }>;
    },
  });
}

export function useCompleteHerdTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transferId: string) => {
      // Stub: no-op until table exists
      console.warn('herd_transfers table not yet created. Run migration 002.');
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['herd_transfers'] });
    },
  });
}

// ==========================================
// FEED INVENTORY
// ==========================================

export function useFeedInventory() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['feed-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase.from('feed_inventory')
        .select('*')
        .order('feed_type');

      if (error) throw error;
      return data as FeedInventory[];
    },
    enabled: !!user,
  });
}

export function useCreateFeedInventory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (item: Omit<FeedInventory, 'id' | 'user_id'>) => {
      const { data, error } = await supabase.from('feed_inventory')
        .insert([{ ...item, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-inventory'] });
    },
  });
}

export function useUpdateFeedInventory() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FeedInventory> }) => {
      const { data, error } = await supabase.from('feed_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-inventory'] });
    },
  });
}

export function useDeleteFeedInventory() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feed_inventory').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-inventory'] });
    },
  });
}

// ==========================================
// FEED SCHEDULES
// ==========================================

export function useFeedSchedules(herdId?: string) {
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['feed-schedules', herdId],
    queryFn: async () => {
      let query = supabase.from('feed_schedules')
        .select(`
          *,
          herd:herds(id, name, color)
        `)
        .order('created_at', { ascending: false });

      if (herdId) {
        query = query.eq('herd_id', herdId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (FeedSchedule & { herd: Herd })[];
    },
    enabled: !!user,
  });
}

export function useCreateFeedSchedule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (schedule: Omit<FeedSchedule, 'id' | 'user_id'>) => {
      const { data, error } = await supabase.from('feed_schedules')
        .insert([{ ...schedule, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-schedules'] });
    },
  });
}

export function useUpdateFeedSchedule() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FeedSchedule> }) => {
      const { data, error } = await supabase.from('feed_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-schedules'] });
    },
  });
}

export function useDeleteFeedSchedule() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feed_schedules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-schedules'] });
    },
  });
}
