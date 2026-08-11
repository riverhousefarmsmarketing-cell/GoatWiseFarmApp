import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient, mutationFrom } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { categoryIs } from '@/lib/animalVocab';
import type { Herd, Animal, FeedSchedule as DBFeedSchedule, FeedInventoryRecord, FeedType } from '@/types/database';

// Type aliases for convenience
type FeedInventory = FeedInventoryRecord;
type FeedSchedule = DBFeedSchedule;

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
      const { data: rawAnimals, error: animalsError } = await supabase.from('animals')
        .select('id, herd_id, category, status')
        .eq('status', 'active');

      if (animalsError) throw animalsError;

      const animals = rawAnimals as { id: string; herd_id: string | null; category: string; status: string }[];

      // Calculate stats for each herd
      const herdsWithStats: HerdWithStats[] = (herds || []).map((herd: Herd) => {
        const herdAnimals = animals.filter((a) => a.herd_id === herd.id);
        return {
          ...herd,
          animalCount: herdAnimals.length,
          milkingCount: herdAnimals.filter((a) => categoryIs(a, 'milking_female')).length,
          buckCount: herdAnimals.filter((a) => categoryIs(a, 'male')).length,
        };
      });

      // Add "unassigned" pseudo-herd
      const unassignedAnimals = animals.filter((a) => !a.herd_id);
      if (unassignedAnimals.length > 0) {
        herdsWithStats.push({
          id: 'unassigned',
          name: 'Unassigned',
          description: 'Animals not assigned to any herd',
          color: '#9ca3af',
          location: null,
          pasture_name: null,
          species: 'goat',
          user_id: user?.id || '',
          created_at: '',
          updated_at: '',
          animalCount: unassignedAnimals.length,
          milkingCount: unassignedAnimals.filter((a) => categoryIs(a, 'milking_female')).length,
          buckCount: unassignedAnimals.filter((a) => categoryIs(a, 'male')).length,
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
          location: null,
          pasture_name: null,
          species: 'goat',
          user_id: '',
          created_at: '',
          updated_at: '',
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
    mutationFn: async (herd: { name: string; description?: string | null; color?: string; location?: string | null; pasture_name?: string | null; species?: 'goat' | 'sheep' }) => {
      const { data, error } = await mutationFrom('herds')
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
      const { data, error } = await mutationFrom('herds')
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
      await mutationFrom('animals')
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
      const { data, error } = await mutationFrom('animals')
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
// Backed by the herd_transfers table. A transfer is a pending request to move
// an animal from one herd to another; completing it actually reassigns the
// animal's herd_id and stamps the completion date.

export function useHerdTransfers(filter?: string) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['herd_transfers', filter],
    queryFn: async () => {
      // Two FKs point at herds (from_herd_id, to_herd_id), so each embed is
      // disambiguated with its FK column as the hint. The page reads
      // transfer.animal / transfer.from_herd / transfer.to_herd.
      let query = supabase
        .from('herd_transfers')
        .select(
          '*, animal:animals!animal_id(id,name), from_herd:herds!from_herd_id(id,name,color), to_herd:herds!to_herd_id(id,name,color)'
        )
        .order('requested_date', { ascending: false });

      if (filter && filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateHerdTransfer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      animal_id: string;
      to_herd_id: string;
      from_herd_id: string | null;
      reason?: string | null;
    }) => {
      const { data, error } = await mutationFrom('herd_transfers')
        .insert([
          {
            user_id: user?.id,
            animal_id: input.animal_id,
            to_herd_id: input.to_herd_id,
            from_herd_id: input.from_herd_id,
            reason: input.reason || null,
            status: 'pending',
            requested_date: new Date().toISOString(),
          },
        ])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['herd_transfers'] });
    },
  });
}

export function useCompleteHerdTransfer() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (transferId: string) => {
      // Look up which animal moves where, so completing the transfer actually
      // reassigns the animal's herd rather than just flipping a status flag.
      const { data, error: fetchError } = await supabase
        .from('herd_transfers')
        .select('id, animal_id, to_herd_id')
        .eq('id', transferId)
        .single();
      if (fetchError) throw fetchError;
      const transfer = data as { id: string; animal_id: string; to_herd_id: string };

      // Move the animal into the destination herd.
      const { error: animalError } = await mutationFrom('animals')
        .update({ herd_id: transfer.to_herd_id })
        .eq('id', transfer.animal_id);
      if (animalError) throw animalError;

      // Stamp the transfer completed.
      const { error: transferError } = await mutationFrom('herd_transfers')
        .update({ status: 'completed', completed_date: new Date().toISOString() })
        .eq('id', transferId);
      if (transferError) throw transferError;

      return transfer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['herd_transfers'] });
      queryClient.invalidateQueries({ queryKey: ['herds'] });
      queryClient.invalidateQueries({ queryKey: ['animals'] });
    },
  });
}

export function useCancelHerdTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await mutationFrom('herd_transfers')
        .update({ status: 'cancelled' })
        .eq('id', transferId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['herd_transfers'] });
    },
  });
}

// ==========================================
// FEED TYPES
// ==========================================

export function useFeedTypes() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['feed-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('feed_types')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as FeedType[];
    },
    enabled: !!user,
  });
}

export function useCreateFeedType() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<FeedType, 'id' | 'user_id' | 'created_at'>) => {
      const { data, error } = await mutationFrom('feed_types')
        .insert([{ ...item, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-types'] });
      queryClient.invalidateQueries({ queryKey: ['feed-inventory'] });
    },
  });
}

export function useUpdateFeedType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FeedType> & { id: string }) => {
      const { data, error } = await mutationFrom('feed_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-types'] });
    },
  });
}

export function useDeleteFeedType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await mutationFrom('feed_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-types'] });
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
        .order('created_at', { ascending: false });

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
      const { data, error } = await mutationFrom('feed_inventory')
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
      const { data, error } = await mutationFrom('feed_inventory')
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
      const { data, error } = await mutationFrom('feed_schedules')
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
      const { data, error } = await mutationFrom('feed_schedules')
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
