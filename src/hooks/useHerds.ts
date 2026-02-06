import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface Herd {
  id: string;
  name: string;
  description?: string;
  color: string;
  location?: string;
  pasture_name?: string;
  notes?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface HerdWithStats extends Herd {
  animalCount: number;
  milkingCount: number;
  buckCount: number;
}

export interface HerdTransfer {
  id: string;
  animal_id: string;
  from_herd_id: string | null;
  to_herd_id: string;
  reason?: string;
  status: 'pending' | 'completed' | 'cancelled';
  requested_date: string;
  completed_date?: string;
  user_id: string;
}

export interface FeedInventory {
  id: string;
  feed_type: string;
  brand?: string;
  quantity_on_hand: number;
  unit: string;
  unit_cost?: number;
  low_stock_threshold?: number;
  reorder_quantity?: number;
  supplier?: string;
  storage_location?: string;
  expiration_date?: string;
  notes?: string;
  user_id: string;
}

export interface FeedSchedule {
  id: string;
  herd_id: string;
  feed_type: string;
  quantity_per_feeding: number;
  unit: string;
  feeding_times: string[];
  start_date: string;
  end_date?: string;
  status: 'active' | 'paused' | 'completed';
  notes?: string;
  user_id: string;
}

// ==========================================
// HERDS
// ==========================================

export function useHerds() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['herds'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('herds') as any)
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
      const { data: herds, error: herdsError } = await (supabase
        .from('herds') as any)
        .select('*')
        .order('name');

      if (herdsError) throw herdsError;

      // Get animal counts per herd
      const { data: animals, error: animalsError } = await (supabase
        .from('animals') as any)
        .select('id, herd_id, category, status')
        .eq('status', 'active');

      if (animalsError) throw animalsError;

      // Calculate stats for each herd
      const herdsWithStats: HerdWithStats[] = (herds || []).map((herd: any) => {
        const herdAnimals = animals?.filter((a: any) => a.herd_id === herd.id) || [];
        return {
          ...herd,
          animalCount: herdAnimals.length,
          milkingCount: herdAnimals.filter((a: any) => a.category === 'milking_doe').length,
          buckCount: herdAnimals.filter((a: any) => a.category === 'buck').length,
        };
      });

      // Add "unassigned" pseudo-herd
      const unassignedAnimals = animals?.filter((a: any) => !a.herd_id) || [];
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
          milkingCount: unassignedAnimals.filter((a: any) => a.category === 'milking_doe').length,
          buckCount: unassignedAnimals.filter((a: any) => a.category === 'buck').length,
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

      const { data, error } = await (supabase
        .from('herds') as any)
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
      let query = (supabase
        .from('animals') as any)
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
    mutationFn: async (herd: Omit<Herd, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await (supabase
        .from('herds') as any)
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
      const { data, error } = await (supabase
        .from('herds') as any)
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
      await (supabase
        .from('animals') as any)
        .update({ herd_id: null })
        .eq('herd_id', id);

      // Then delete the herd
      const { error } = await (supabase.from('herds') as any).delete().eq('id', id);
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
      const { data, error } = await (supabase
        .from('animals') as any)
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

export function useHerdTransfers(status?: string) {
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['herd-transfers', status],
    queryFn: async () => {
      let query = (supabase
        .from('herd_transfers') as any)
        .select(`
          *,
          animal:animals(id, name),
          from_herd:herds!herd_transfers_from_herd_id_fkey(id, name, color),
          to_herd:herds!herd_transfers_to_herd_id_fkey(id, name, color)
        `)
        .order('requested_date', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateHerdTransfer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (transfer: {
      animal_id: string;
      from_herd_id: string | null;
      to_herd_id: string;
      reason?: string;
    }) => {
      const { data, error } = await (supabase
        .from('herd_transfers') as any)
        .insert([{
          ...transfer,
          user_id: user?.id,
          status: 'pending',
          requested_date: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['herd-transfers'] });
    },
  });
}

export function useCompleteHerdTransfer() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (transferId: string) => {
      // Get the transfer details
      const { data: transfer, error: fetchError } = await (supabase
        .from('herd_transfers') as any)
        .select('*')
        .eq('id', transferId)
        .single();

      if (fetchError) throw fetchError;

      // Update the animal's herd
      const { error: updateError } = await (supabase
        .from('animals') as any)
        .update({ herd_id: transfer.to_herd_id })
        .eq('id', transfer.animal_id);

      if (updateError) throw updateError;

      // Mark transfer as completed
      const { data, error } = await (supabase
        .from('herd_transfers') as any)
        .update({
          status: 'completed',
          completed_date: new Date().toISOString(),
        })
        .eq('id', transferId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['herd-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['herds'] });
      queryClient.invalidateQueries({ queryKey: ['herd-animals'] });
      queryClient.invalidateQueries({ queryKey: ['animals'] });
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
      const { data, error } = await (supabase
        .from('feed_inventory') as any)
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
      const { data, error } = await (supabase
        .from('feed_inventory') as any)
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
      const { data, error } = await (supabase
        .from('feed_inventory') as any)
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
      const { error } = await (supabase.from('feed_inventory') as any).delete().eq('id', id);
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
      let query = (supabase
        .from('feed_schedules') as any)
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
      const { data, error } = await (supabase
        .from('feed_schedules') as any)
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
      const { data, error } = await (supabase
        .from('feed_schedules') as any)
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
      const { error } = await (supabase.from('feed_schedules') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-schedules'] });
    },
  });
}
