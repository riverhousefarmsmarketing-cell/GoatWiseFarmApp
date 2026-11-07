'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ClipboardList, Plus, Pencil, Trash2, Repeat, CheckCircle2, PlayCircle, RotateCcw, Printer } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFarm, useFarmMembers, memberName } from '@/hooks/useFarm';
import {
  Assignment, AssignmentInput, AssignmentStatus, RECURRENCE_LABELS, Recurrence, STATUS_LABELS,
  isOverdue, useAssignments, useDeleteAssignment, useSaveAssignment, useSetAssignmentStatus,
} from '@/hooks/useFarmWork';
import { getSupabaseClient } from '@/lib/supabase';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal, Select } from '@/components/ui';
import { usePeople, useMyPerson, personName } from '@/hooks/usePeople';
import { DoneByDialog } from '@/components/farm/DoneByDialog';
import Link from 'next/link';

type View = 'mine' | 'open' | 'done';

const EMPTY_FORM: AssignmentInput = {
  title: '', notes: '', due_date: '', recurrence: 'none', animal_id: '', herd_id: '', paddock_id: '', assignees: [], people: [],
};

function useNamedList(table: 'animals' | 'herds' | 'paddocks', enabled: boolean) {
  const { farm } = useFarm();
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['assignment_link_options', table, farm?.farm_id],
    queryFn: async () => {
      let q = (getSupabaseClient() as any).from(table).select('id, name').order('name');
      if (table === 'animals') q = q.eq('status', 'active');
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!farm,
  });
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const { isManager } = useFarm();
  const { data: members } = useFarmMembers();
  const { data: allPeople = [] } = usePeople();
  const { data: myPerson } = useMyPerson();
  const paperPeople = allPeople.filter((pp) => pp.active && !pp.user_id);
  const [doneFor, setDoneFor] = useState<Assignment | null>(null);
  const whoFor = (a: Assignment) => [
    ...a.assignment_assignees.map((x) => memberName(members, x.user_id)),
    ...(a.assignment_people ?? []).map((x) => personName(allPeople, x.person_id)),
  ];
  const [view, setView] = useState<View>('mine');
  const [personFilter, setPersonFilter] = useState('');
  const { data: assignments = [], isLoading } = useAssignments({ includeDone: view === 'done' });
  const saveAssignment = useSaveAssignment();
  const setStatus = useSetAssignmentStatus();
  const deleteAssignment = useDeleteAssignment();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AssignmentInput>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const { data: animals = [] } = useNamedList('animals', formOpen);
  const { data: herds = [] } = useNamedList('herds', formOpen);
  const { data: paddocks = [] } = useNamedList('paddocks', formOpen);

  const shown = useMemo(() => {
    let list = assignments;
    if (view === 'mine') list = list.filter((a) => a.assignment_assignees.some((x) => x.user_id === user?.id));
    if (view === 'done') list = list.filter((a) => a.status === 'done');
    if (view !== 'mine' && personFilter) list = list.filter((a) => personFilter.startsWith('p:')
      ? (a.assignment_people ?? []).some((x) => x.person_id === personFilter.slice(2))
      : a.assignment_assignees.some((x) => x.user_id === personFilter));
    if (view === 'done') {
      return [...list].sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));
    }
    // Overdue first, then by due date, undated last.
    return [...list].sort((a, b) => {
      const ao = isOverdue(a) ? 0 : 1;
      const bo = isOverdue(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');
    });
  }, [assignments, view, personFilter, user?.id]);

  const openNew = () => {
    setForm({ ...EMPTY_FORM, assignees: [] });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (a: Assignment) => {
    setForm({
      id: a.id,
      title: a.title,
      notes: a.notes ?? '',
      due_date: a.due_date ?? '',
      recurrence: a.recurrence,
      animal_id: a.animal_id ?? '',
      herd_id: a.herd_id ?? '',
      paddock_id: a.paddock_id ?? '',
      assignees: a.assignment_assignees.map((x) => x.user_id),
      people: (a.assignment_people ?? []).map((x) => x.person_id),
    });
    setFormError('');
    setFormOpen(true);
  };

  const submit = () => {
    if (!form.title.trim()) return setFormError('Give the assignment a title.');
    if (form.assignees.length + form.people.length === 0) return setFormError('Choose at least one person.');
    if (form.recurrence !== 'none' && !form.due_date) return setFormError('A repeating assignment needs a first due date.');
    saveAssignment.mutate(form, {
      onSuccess: () => setFormOpen(false),
      onError: (e: any) => setFormError(e.message),
    });
  };

  const changeStatus = (a: Assignment, status: AssignmentStatus) => {
    if (status === 'done') return setDoneFor(a);
    setStatus.mutate({ id: a.id, status }, { onError: (e: any) => alert(e.message) });
  };

  const togglePerson = (id: string) =>
    setForm((f) => ({ ...f, people: f.people.includes(id) ? f.people.filter((x) => x !== id) : [...f.people, id] }));

  const toggleAssignee = (id: string) =>
    setForm((f) => ({ ...f, assignees: f.assignees.includes(id) ? f.assignees.filter((x) => x !== id) : [...f.assignees, id] }));

  const tabs: { key: View; label: string }[] = [
    { key: 'mine', label: 'My assignments' },
    { key: 'open', label: 'All open' },
    { key: 'done', label: 'Done' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-500">{isManager ? 'Give people tasks and see where everything stands.' : 'Tasks assigned to you and the team.'}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/print/assignments" target="_blank"><Button variant="outline" leftIcon={<Printer className="h-4 w-4" />}>Print</Button></Link>
          {isManager && (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openNew}>
              New assignment
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="inline-flex rounded-lg border border-[#DDD8D4] bg-white p-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${view === t.key ? 'bg-[#105040] text-white' : 'text-[#384E42] hover:bg-gray-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {view !== 'mine' && (
          <div className="sm:w-56">
            <Select
              aria-label="Filter by person"
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              options={[{ value: '', label: 'Everyone' }, ...(members ?? []).map((m) => ({ value: m.user_id, label: m.display_name || m.email || 'Unknown' })),
                ...paperPeople.map((pp) => ({ value: `p:${pp.id}`, label: `${pp.name} (paper)` }))]}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-10 w-10" />}
            title={view === 'mine' ? 'Nothing assigned to you' : view === 'done' ? 'Nothing finished yet' : 'No open assignments'}
            description={isManager && view !== 'done' ? 'Create an assignment to give someone a task.' : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((a) => {
            const overdue = isOverdue(a);
            const mine = a.assignment_assignees.some((x) => x.user_id === user?.id);
            const canUpdate = isManager || mine;
            const linked = [a.animals?.name, a.herds?.name, a.paddocks?.name].filter(Boolean).join(' · ');
            return (
              <Card key={a.id} className={overdue ? 'border-[#9B1C1C]/40' : undefined}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`font-semibold ${a.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{a.title}</h2>
                      <Badge variant={a.status === 'done' ? 'success' : a.status === 'in_progress' ? 'info' : overdue ? 'danger' : 'default'}>
                        {overdue ? 'Overdue' : STATUS_LABELS[a.status]}
                      </Badge>
                      {a.recurrence !== 'none' && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Repeat className="h-3 w-3" /> {RECURRENCE_LABELS[a.recurrence]}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {a.due_date ? `Due ${format(parseISO(a.due_date), 'EEE, MMM d')}` : 'No due date'}
                      {' · '}
                      {whoFor(a).length ? whoFor(a).join(', ') : 'Unassigned'}
                      {linked ? ` · ${linked}` : ''}
                    </p>
                    {a.notes && <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap break-words">{a.notes}</p>}
                    {a.status === 'done' && (
                      <p className="mt-1 text-sm text-[#105040]">
                        Done by {a.completed_by_person_id ? personName(allPeople, a.completed_by_person_id) : memberName(members, a.completed_by)}
                        {a.completed_by_person_id && allPeople.find((pp) => pp.id === a.completed_by_person_id)?.user_id !== a.completed_by ? ` (entered by ${memberName(members, a.completed_by)})` : ''}
                        {a.completed_at ? ` on ${format(new Date(a.completed_at), 'MMM d')}` : ''}
                        {a.completion_note ? ` — “${a.completion_note}”` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    {canUpdate && a.status === 'todo' && (
                      <Button size="sm" variant="outline" leftIcon={<PlayCircle className="h-4 w-4" />} onClick={() => changeStatus(a, 'in_progress')}>
                        Start
                      </Button>
                    )}
                    {canUpdate && a.status !== 'done' && (
                      <Button size="sm" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => changeStatus(a, 'done')}>
                        Mark done
                      </Button>
                    )}
                    {canUpdate && a.status === 'done' && (
                      <Button size="sm" variant="ghost" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => changeStatus(a, 'todo')}>
                        Reopen
                      </Button>
                    )}
                    {isManager && (
                      <>
                        <Button size="sm" variant="ghost" aria-label="Edit assignment" onClick={() => openEdit(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Delete assignment"
                          onClick={() => {
                            if (confirm(`Delete "${a.title}"?`)) deleteAssignment.mutate(a.id, { onError: (e: any) => alert(e.message) });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-[#9B1C1C]" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <DoneByDialog
        open={!!doneFor}
        title={doneFor ? `Mark "${doneFor.title}" done` : ''}
        busy={setStatus.isPending}
        onClose={() => setDoneFor(null)}
        onConfirm={({ personId, note }) => doneFor && setStatus.mutate(
          { id: doneFor.id, status: 'done', note, personId: personId && personId !== myPerson?.id ? personId : null },
          { onSuccess: () => setDoneFor(null), onError: (e: any) => alert(e.message) })}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={form.id ? 'Edit assignment' : 'New assignment'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button loading={saveAssignment.isPending} onClick={submit}>{form.id ? 'Save' : 'Assign'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{formError}</div>}
          <Input label="What needs doing?" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Trim hooves" />
          <div className="space-y-1">
            <label htmlFor="assignment-notes" className="block text-sm font-medium text-[#384E42]">Notes</label>
            <textarea
              id="assignment-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-[#DDD8D4] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#105040]"
              placeholder="Anything they should know"
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-[#384E42] mb-1">
              Who&apos;s doing it?<span className="text-[#9B1C1C] ml-1">*</span>
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {paperPeople.map((pp) => (
                <label key={pp.id} className="flex items-center gap-2 rounded-lg border border-dashed border-[#DDD8D4] px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={form.people.includes(pp.id)} onChange={() => togglePerson(pp.id)} className="rounded" />
                  <span className="truncate">{pp.name} <span className="text-gray-400">(paper sheet)</span></span>
                </label>
              ))}
              {(members ?? []).map((m) => (
                <label key={m.user_id} className="flex items-center gap-2 rounded-lg border border-[#DDD8D4] px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={form.assignees.includes(m.user_id)} onChange={() => toggleAssignee(m.user_id)} className="rounded" />
                  <span className="truncate">{m.display_name || m.email}{m.user_id === user?.id ? ' (you)' : ''}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Due date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            <Select
              label="Repeat"
              value={form.recurrence}
              onChange={(e) => setForm({ ...form, recurrence: e.target.value as Recurrence })}
              options={(Object.keys(RECURRENCE_LABELS) as Recurrence[]).map((r) => ({ value: r, label: RECURRENCE_LABELS[r] }))}
            />
          </div>
          {form.recurrence !== 'none' && (
            <p className="text-xs text-gray-500">When it&apos;s marked done, the next one is created automatically for the same people.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label="Animal (optional)" value={form.animal_id} onChange={(e) => setForm({ ...form, animal_id: e.target.value })}
              options={[{ value: '', label: '—' }, ...animals.map((x) => ({ value: x.id, label: x.name }))]} />
            <Select label="Herd (optional)" value={form.herd_id} onChange={(e) => setForm({ ...form, herd_id: e.target.value })}
              options={[{ value: '', label: '—' }, ...herds.map((x) => ({ value: x.id, label: x.name }))]} />
            <Select label="Paddock (optional)" value={form.paddock_id} onChange={(e) => setForm({ ...form, paddock_id: e.target.value })}
              options={[{ value: '', label: '—' }, ...paddocks.map((x) => ({ value: x.id, label: x.name }))]} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
