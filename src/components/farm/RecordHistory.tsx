'use client';

import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useFarm, useFarmMembers } from '@/hooks/useFarm';
import { getSupabaseClient } from '@/lib/supabase';
import { AuditEntry } from '@/lib/history';
import { HistoryList } from '@/components/farm/HistoryList';
import { Card, EmptyState, LoadingSpinner } from '@/components/ui';

/**
 * Change history for one animal: the animal itself plus every record that
 * points at it (health, milk, weight, breeding, photos...).
 */
export function AnimalHistory({ animalId }: { animalId: string }) {
  const { farm } = useFarm();
  const { data: members } = useFarmMembers();
  const { data: entries = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ['audit_log', 'animal', farm?.farm_id, animalId],
    queryFn: async () => {
      const keys = ['animal_id', 'doe_id', 'buck_id'];
      const filters = [
        `record_id.eq.${animalId}`,
        ...keys.flatMap((k) => [`new_data->>${k}.eq.${animalId}`, `old_data->>${k}.eq.${animalId}`]),
      ].join(',');
      const { data, error } = await (getSupabaseClient() as any)
        .from('audit_log')
        .select('*')
        .or(filters)
        .order('changed_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AuditEntry[];
    },
    enabled: !!farm && !!animalId,
  });

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Change history</h2>
        <p className="text-sm text-gray-500">Every change to this animal and its records. Tap a line for details.</p>
      </div>
      {isLoading ? (
        <div className="p-8 flex justify-center"><LoadingSpinner /></div>
      ) : entries.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={<History className="h-10 w-10" />} title="No changes recorded yet" description="Changes made from now on will show up here." />
        </div>
      ) : (
        <HistoryList entries={entries} members={members} />
      )}
    </Card>
  );
}

/** "Deletion requested" banner for a record with a pending request. */
export function PendingDeletionBanner({ table, recordId }: { table: string; recordId: string }) {
  const { farm, isManager } = useFarm();
  const { data: members } = useFarmMembers();
  const { data: request } = useQuery({
    queryKey: ['deletion_requests', 'for', farm?.farm_id, table, recordId],
    queryFn: async () => {
      const { data, error } = await (getSupabaseClient() as any)
        .from('deletion_requests')
        .select('id, requested_by, reason')
        .eq('table_name', table)
        .eq('record_id', recordId)
        .eq('status', 'pending')
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; requested_by: string | null; reason: string | null } | null;
    },
    enabled: !!farm && !!recordId,
  });

  if (!request) return null;
  const who = members?.find((m) => m.user_id === request.requested_by);
  return (
    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
      <span className="font-medium">Deletion requested</span> by {who?.display_name || who?.email || 'a team member'}
      {request.reason ? ` — “${request.reason}”` : ''}.{' '}
      {isManager ? (
        <a href="/dashboard/approvals" className="underline font-medium">Review on Approvals</a>
      ) : (
        'Waiting for the owner or a manager to approve.'
      )}
    </div>
  );
}
