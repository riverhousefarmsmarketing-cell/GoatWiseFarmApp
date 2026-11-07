'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { useFarm, useFarmMembers } from '@/hooks/useFarm';
import { Assignment, RECURRENCE_LABELS, isOverdue, useAssignments } from '@/hooks/useFarmWork';
import { usePeople } from '@/hooks/usePeople';
import { Box, PrintToolbar, SectionTitle, SheetHeader } from '@/components/farm/PrintBits';
import { LoadingPage } from '@/components/ui';

function AssignmentsSheet() {
  const params = useSearchParams();
  const [personId, setPersonId] = useState(params.get('person') || '');
  const { farm } = useFarm();
  const { data: members } = useFarmMembers();
  const { data: people = [] } = usePeople();
  const { data: assignments = [], isLoading } = useAssignments();

  // Group open assignments by person (people with and without the app).
  const groups = useMemo(() => {
    const byPerson = new Map<string, { name: string; items: Assignment[] }>();
    const add = (key: string, name: string, a: Assignment) => {
      const g = byPerson.get(key) ?? { name, items: [] };
      if (!g.items.includes(a)) g.items.push(a);
      byPerson.set(key, g);
    };
    for (const a of assignments) {
      for (const x of a.assignment_assignees) {
        const p = people.find((pp) => pp.user_id === x.user_id);
        const m = members?.find((mm) => mm.user_id === x.user_id);
        add(p?.id ?? `u:${x.user_id}`, p?.name ?? m?.display_name ?? 'Team member', a);
      }
      for (const x of a.assignment_people ?? []) add(x.person_id, people.find((pp) => pp.id === x.person_id)?.name ?? 'Former worker', a);
      if (!a.assignment_assignees.length && !(a.assignment_people ?? []).length) add('none', 'Not assigned yet', a);
    }
    const list = Array.from(byPerson.entries()).map(([key, g]) => ({ key, ...g, items: g.items.sort((x, y) => (x.due_date ?? '9999').localeCompare(y.due_date ?? '9999')) }));
    return (personId ? list.filter((g) => g.key === personId) : list).sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments, people, members, personId]);

  if (isLoading) return <LoadingPage />;

  return (
    <>
      <PrintToolbar back="/dashboard/assignments">
        <label className="text-sm flex items-center gap-1">For
          <select value={personId} onChange={(e) => setPersonId(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="">Everyone (one section each)</option>
            {people.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </PrintToolbar>
      <div className="max-w-[8in] mx-auto p-6">
        <SheetHeader farm={farm?.name} title="Jobs to do" subtitle="Tick the box when done, write the date and any note." />
        {groups.length === 0 && <p className="text-sm">No open jobs.</p>}
        {groups.map((g, i) => (
          <section key={g.key} style={i > 0 && !personId ? { breakBefore: 'page' } : undefined}>
            <SectionTitle>{g.name}</SectionTitle>
            <table>
              <thead><tr><th className="w-8" /><th>Job</th><th>Due</th><th>Date done</th><th>Note</th></tr></thead>
              <tbody>
                {g.items.map((a) => (
                  <tr key={a.id}>
                    <td><Box /></td>
                    <td>
                      <b>{a.title}</b>{isOverdue(a) ? ' (overdue)' : ''}
                      {a.notes ? <div className="text-xs">{a.notes}</div> : null}
                      <div className="text-xs">{[a.animals?.name, a.herds?.name, a.paddocks?.name].filter(Boolean).join(' · ')}{a.recurrence !== 'none' ? ` · ${RECURRENCE_LABELS[a.recurrence]}` : ''}</div>
                    </td>
                    <td className="whitespace-nowrap">{a.due_date ? format(parseISO(a.due_date), 'EEE MMM d') : ''}</td>
                    <td className="w-24" />
                    <td className="w-40" />
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </>
  );
}

export default function PrintAssignmentsPage() {
  return <Suspense fallback={<LoadingPage />}><AssignmentsSheet /></Suspense>;
}
