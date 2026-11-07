'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { ShieldCheck, Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFarm, useFarmMembers, memberName } from '@/hooks/useFarm';
import { getSupabaseClient } from '@/lib/supabase';
import { tableLabel, recordName, visibleFields, fieldLabel, formatValue } from '@/lib/history';
import { Badge, Button, Card, EmptyState, LoadingSpinner } from '@/components/ui';
import { pokeDispatch } from '@/lib/push';

interface DeletionRequest {
  id: string;
  table_name: string;
  record_id: string;
  record_label: string | null;
  record_data: Record<string, any> | null;
  reason: string | null;
  requested_by: string | null;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
}

const STATUS_BADGE: Record<DeletionRequest['status'], { label: string; variant: 'warning' | 'danger' | 'success' | 'default' }> = {
  pending: { label: 'Waiting for approval', variant: 'warning' },
  approved: { label: 'Approved — deleted', variant: 'danger' },
  rejected: { label: 'Rejected — kept', variant: 'success' },
  cancelled: { label: 'Withdrawn', variant: 'default' },
};

function describe(req: DeletionRequest): string {
  const name = req.record_label || recordName({ old_data: req.record_data, new_data: null });
  return name ? `${tableLabel(req.table_name)}: ${name}` : tableLabel(req.table_name);
}

export default function ApprovalsPage() {
  const supabase = getSupabaseClient() as any;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { farm, isManager } = useFarm();
  const { data: members } = useFarmMembers();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery<DeletionRequest[]>({
    queryKey: ['deletion_requests', farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deletion_requests')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as DeletionRequest[];
    },
    enabled: !!farm,
  });

  const invalidate = () => {
    pokeDispatch();
    queryClient.invalidateQueries({ queryKey: ['deletion_requests'] });
    // An approval deletes a record somewhere; refresh every list.
    queryClient.invalidateQueries();
  };

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      let note: string | null = null;
      if (!approve) {
        note = window.prompt('Reason for keeping it? (optional — the person who asked will see this)', '');
        if (note === null) return;
      }
      const { error } = await supabase.rpc('decide_deletion_request', { p_request_id: id, p_approve: approve, p_note: note });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => alert(e.message),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('cancel_deletion_request', { p_request_id: id });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => alert(e.message),
  });

  const pending = requests.filter((r) => r.status === 'pending');
  const decided = requests.filter((r) => r.status !== 'pending');
  const visiblePending = isManager ? pending : pending.filter((r) => r.requested_by === user?.id);
  const visibleDecided = isManager ? decided : decided.filter((r) => r.requested_by === user?.id);

  const renderRequest = (req: DeletionRequest) => {
    const fields = visibleFields(Object.keys(req.record_data ?? {}));
    const isOpen = expanded === req.id;
    return (
      <li key={req.id} className="px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{describe(req)}</p>
            <p className="text-sm text-gray-500">
              Requested by {memberName(members, req.requested_by)} ·{' '}
              {formatDistanceToNow(new Date(req.requested_at), { addSuffix: true })}
            </p>
            {req.reason && <p className="mt-1 text-sm text-gray-700">&ldquo;{req.reason}&rdquo;</p>}
            {req.status !== 'pending' && req.decided_at && (
              <p className="mt-1 text-sm text-gray-500">
                {STATUS_BADGE[req.status].label.split(' —')[0]} by {memberName(members, req.decided_by)} on{' '}
                {format(new Date(req.decided_at), 'MMM d, yyyy')}
                {req.decision_note ? ` — “${req.decision_note}”` : ''}
              </p>
            )}
            {fields.length > 0 && (
              <button onClick={() => setExpanded(isOpen ? null : req.id)} className="mt-1 text-sm text-[#105040] hover:underline">
                {isOpen ? 'Hide details' : 'Show what would be deleted'}
              </button>
            )}
            {isOpen && (
              <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm bg-gray-50 rounded-lg p-3">
                {fields.map((f) => (
                  <div key={f} className="flex gap-2 min-w-0">
                    <dt className="text-gray-500 flex-shrink-0">{fieldLabel(f)}:</dt>
                    <dd className="text-gray-900 truncate">{formatValue(req.record_data?.[f])}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {req.status === 'pending' ? (
              <>
                {isManager && (
                  <>
                    <Button
                      size="sm"
                      variant="danger"
                      leftIcon={<Check className="h-4 w-4" />}
                      onClick={() => {
                        if (confirm(`Approve and permanently delete ${describe(req)}? A copy stays in Change History.`)) {
                          decide.mutate({ id: req.id, approve: true });
                        }
                      }}
                    >
                      Approve delete
                    </Button>
                    <Button size="sm" variant="outline" leftIcon={<X className="h-4 w-4" />} onClick={() => decide.mutate({ id: req.id, approve: false })}>
                      Keep it
                    </Button>
                  </>
                )}
                {!isManager && req.requested_by === user?.id && (
                  <Button size="sm" variant="outline" onClick={() => cancel.mutate(req.id)}>
                    Withdraw request
                  </Button>
                )}
              </>
            ) : (
              <Badge variant={STATUS_BADGE[req.status].variant}>{STATUS_BADGE[req.status].label}</Badge>
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        <p className="text-gray-500">
          {isManager
            ? 'Workers can’t delete records on their own. Their delete requests wait here for you.'
            : 'Your delete requests. The owner or a manager approves them.'}
        </p>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <>
          <Card padding="none">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Waiting for a decision ({visiblePending.length})</h2>
            </div>
            {visiblePending.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<ShieldCheck className="h-10 w-10" />} title="Nothing waiting" description="No delete requests need a decision." />
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">{visiblePending.map(renderRequest)}</ul>
            )}
          </Card>

          {visibleDecided.length > 0 && (
            <Card padding="none">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Recent decisions</h2>
              </div>
              <ul className="divide-y divide-gray-100">{visibleDecided.map(renderRequest)}</ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
