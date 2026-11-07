'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useFarm } from '@/hooks/useFarm';
import { pokeDispatch } from '@/lib/push';
import { insertOrQueue } from '@/lib/offline';
import { notify } from '@/components/ui/toast';

const db = () => getSupabaseClient() as any;

export type RestockLevel = 'low' | 'out';
export type RestockStatus = 'open' | 'ordered' | 'restocked' | 'cancelled';
export type RestockCategory = 'feed' | 'mineral' | 'medicine' | 'supplies' | 'bedding' | 'equipment' | 'other';

export interface RestockRequest {
  id: string;
  user_id: string | null;
  item_name: string;
  feed_type_id: string | null;
  category: RestockCategory;
  level: RestockLevel;
  quantity_note: string | null;
  note: string | null;
  status: RestockStatus;
  ordered_by: string | null;
  ordered_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

export const CATEGORY_LABELS: Record<RestockCategory, string> = {
  feed: 'Feed & hay',
  mineral: 'Mineral',
  medicine: 'Medicine',
  supplies: 'Supplies',
  bedding: 'Bedding',
  equipment: 'Equipment',
  other: 'Other',
};

export const restockKeys = { all: ['restock_requests'] as const };

export function useRestockRequests() {
  const { farm } = useFarm();
  return useQuery<RestockRequest[]>({
    queryKey: [...restockKeys.all, farm?.farm_id],
    queryFn: async () => {
      const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await db()
        .from('restock_requests')
        .select('*')
        // Everything still open, plus anything finished in the last 60 days.
        .or(`status.in.(open,ordered),resolved_at.gte.${since}`)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as RestockRequest[];
    },
    enabled: !!farm,
    refetchInterval: 2 * 60_000,
  });
}

export function useFlagRestock() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (r: {
      item_name: string; feed_type_id: string | null; category: RestockCategory; level: RestockLevel;
      quantity_note: string; note: string;
    }) => {
      const result = await insertOrQueue('restock_requests', [{
        item_name: r.item_name.trim(),
        feed_type_id: r.feed_type_id || null,
        category: r.category,
        level: r.level,
        quantity_note: r.quantity_note.trim() || null,
        note: r.note.trim() || null,
        user_id: user!.id,
      }], `Restock: ${r.item_name.trim()}`);
      if (result === 'queued') notify('No signal: saved on this device. It will be added to the list when you’re back online.');
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: restockKeys.all }); pokeDispatch(); },
  });
}

export function useUpdateRestock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; status?: RestockStatus; level?: RestockLevel; resolution_note?: string | null }) => {
      const { error } = await db().from('restock_requests').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: restockKeys.all }),
  });
}

export function useDeleteRestock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('restock_requests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: restockKeys.all }),
  });
}

/** Feed types and minerals to pick from when flagging an item. */
export function useStockItems() {
  const { farm } = useFarm();
  return useQuery<{ id: string; name: string; category: string }[]>({
    queryKey: ['restock_stock_items', farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await db().from('feed_types').select('id, name, category').order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!farm,
  });
}

