'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useFarm, useFarmMembers } from '@/hooks/useFarm';
import { getSupabaseClient } from '@/lib/supabase';
import { AuditEntry, TABLE_LABELS } from '@/lib/history';
import { HistoryList } from '@/components/farm/HistoryList';
import { Button, Card, EmptyState, Input, LoadingSpinner, Select } from '@/components/ui';

const PAGE_SIZE = 50;

export default function HistoryPage() {
  const { farm } = useFarm();
  const { data: members } = useFarmMembers();
  const [person, setPerson] = useState('');
  const [table, setTable] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, error } = useInfiniteQuery({
    queryKey: ['audit_log', farm?.farm_id, person, table, action, from, to],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let q = (getSupabaseClient() as any)
        .from('audit_log')
        .select('*')
        .order('changed_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (person) q = q.eq('changed_by', person);
      if (table) q = q.eq('table_name', table);
      if (action) q = q.eq('action', action);
      if (from) q = q.gte('changed_at', new Date(`${from}T00:00:00`).toISOString());
      if (to) q = q.lte('changed_at', new Date(`${to}T23:59:59.999`).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return data as AuditEntry[];
    },
    getNextPageParam: (last: AuditEntry[], all: AuditEntry[][]) =>
      last.length === PAGE_SIZE ? all.length * PAGE_SIZE : undefined,
    enabled: !!farm,
  });

  const entries = data?.pages.flat() ?? [];
  const tableOptions = Object.entries(TABLE_LABELS)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, label]) => ({ value, label }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Change History</h1>
        <p className="text-gray-500">
          Every addition, edit and deletion on the farm: who, when, and what changed. Tap a line for details.
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Select
            label="Person"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            options={[
              { value: '', label: 'Everyone' },
              ...(members ?? []).map((m) => ({ value: m.user_id, label: m.display_name || m.email || 'Unknown' })),
            ]}
          />
          <Select
            label="Type of record"
            value={table}
            onChange={(e) => setTable(e.target.value)}
            options={[{ value: '', label: 'All records' }, ...tableOptions]}
          />
          <Select
            label="Change"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            options={[
              { value: '', label: 'Any change' },
              { value: 'insert', label: 'Added' },
              { value: 'update', label: 'Edited' },
              { value: 'delete', label: 'Deleted' },
            ]}
          />
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>

      <Card padding="none">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-red-700">Could not load history: {(error as Error).message}</p>
        ) : entries.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<History className="h-10 w-10" />}
              title="No changes found"
              description="Changes made from now on will show up here."
            />
          </div>
        ) : (
          <>
            <HistoryList entries={entries} members={members} />
            {hasNextPage && (
              <div className="p-4 border-t border-gray-100 flex justify-center">
                <Button variant="outline" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
                  Show older changes
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
