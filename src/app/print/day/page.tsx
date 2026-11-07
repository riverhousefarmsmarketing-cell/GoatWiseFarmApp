'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { useFarm, useFarmMembers, memberName } from '@/hooks/useFarm';
import { useChoresForDay, useTargetLabeler } from '@/hooks/useTodaysChores';
import { useAssignments } from '@/hooks/useFarmWork';
import { animalLabel, courseSlots, useTreatmentCourses } from '@/hooks/useAnimalHealth';
import { usePeople, personName } from '@/hooks/usePeople';
import { formatSlot, localISODate } from '@/lib/chores';
import { Box, PrintToolbar, SectionTitle, SheetHeader } from '@/components/farm/PrintBits';
import { LoadingPage } from '@/components/ui';

function DaySheet() {
  const params = useSearchParams();
  const [date, setDate] = useState(params.get('date') || localISODate());
  const [personFilter, setPersonFilter] = useState(params.get('person') || '');
  const [blankRows, setBlankRows] = useState(4);
  const { farm } = useFarm();
  const { data: members } = useFarmMembers();
  const { data: people = [] } = usePeople();
  const { chores, instructions, loading } = useChoresForDay(date);
  const labelFor = useTargetLabeler();
  const { data: assignments = [] } = useAssignments();
  const { data: courses = [] } = useTreatmentCourses();

  const doses = useMemo(() => courses.flatMap((c) => courseSlots(c).filter((s) => s.date === date).map((s) => ({ c, slot: s.slot })))
    .sort((a, b) => a.slot.localeCompare(b.slot)), [courses, date]);

  const person = people.find((p) => p.id === personFilter);
  const jobs = assignments
    .filter((a) => !a.due_date || a.due_date <= date || a.due_date <= format(new Date(Date.parse(date) + 7 * 86_400_000), 'yyyy-MM-dd'))
    .filter((a) => !person || (a.assignment_people ?? []).some((x) => x.person_id === person.id)
      || (!!person.user_id && a.assignment_assignees.some((x) => x.user_id === person.user_id)))
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));
  const whoFor = (a: (typeof assignments)[number]) => [
    ...a.assignment_assignees.map((x) => memberName(members, x.user_id)),
    ...(a.assignment_people ?? []).map((x) => personName(people, x.person_id)),
  ].join(', ');

  if (loading) return <LoadingPage />;

  return (
    <>
      <PrintToolbar back="/dashboard/chores">
        <label className="text-sm flex items-center gap-1">Day <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="border rounded px-2 py-1 text-sm" /></label>
        <label className="text-sm flex items-center gap-1">Jobs for
          <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="">Everyone</option>
            {people.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="text-sm flex items-center gap-1">Blank rows <input type="number" min={0} max={15} value={blankRows} onChange={(e) => setBlankRows(Number(e.target.value) || 0)} className="border rounded px-2 py-1 text-sm w-16" /></label>
      </PrintToolbar>

      <div className="max-w-[8in] mx-auto p-6">
        <SheetHeader farm={farm?.name} title={`Daily jobs — ${format(parseISO(date), 'EEEE, MMMM d, yyyy')}`}
          subtitle={person ? `For ${person.name}` : 'Tick each box when done and write your name and the time.'} />

        {instructions.length > 0 && (
          <>
            <SectionTitle>Special instructions</SectionTitle>
            <ul className="list-disc pl-5 text-sm space-y-0.5">
              {instructions.map((p) => <li key={p.id}><b>{labelFor(p).name}:</b> {p.title}</li>)}
            </ul>
          </>
        )}

        <SectionTitle>Chores</SectionTitle>
        {chores.length === 0 ? <p className="text-sm">No feeding or watering scheduled.</p> : (
          <table>
            <thead><tr><th className="w-8" /><th>Time</th><th>Job</th><th>Where / who</th><th>Done by</th><th>Time done</th></tr></thead>
            <tbody>
              {chores.map((c) => {
                const t = labelFor(c.plan);
                return (
                  <tr key={c.key}>
                    <td><Box checked={!!c.completion} /></td>
                    <td className="whitespace-nowrap">{formatSlot(c.slot)}</td>
                    <td><b>{c.plan.title}</b>{c.plan.amount != null ? ` — ${c.plan.amount} ${c.plan.unit ?? ''}` : ''}{c.plan.notes ? <div className="text-xs">{c.plan.notes}</div> : null}</td>
                    <td>{t.name}{t.where ? <div className="text-xs">{t.where}</div> : null}</td>
                    <td className="w-32">{c.completion ? (personName(people, (c.completion as any).person_id) !== 'Someone' ? personName(people, (c.completion as any).person_id) : memberName(members, c.completion.user_id)) : ''}</td>
                    <td className="w-20" />
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {doses.length > 0 && (
          <>
            <SectionTitle>Medicine doses</SectionTitle>
            <table>
              <thead><tr><th className="w-8" /><th>Time</th><th>Animal</th><th>Medicine</th><th>Given by</th><th>Amount given</th></tr></thead>
              <tbody>
                {doses.map(({ c, slot }) => (
                  <tr key={`${c.id}-${slot}`}>
                    <td><Box /></td>
                    <td className="whitespace-nowrap">{formatSlot(slot)}</td>
                    <td><b>{animalLabel(c.animals)}</b>{c.reason ? <div className="text-xs">{c.reason}</div> : null}</td>
                    <td>{c.medication}{c.dose != null ? ` ${c.dose} ${c.dose_unit ?? ''}` : ''}{c.route ? ` ${c.route}` : ''}</td>
                    <td className="w-32" />
                    <td className="w-24" />
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <SectionTitle>Jobs</SectionTitle>
        {jobs.length === 0 && blankRows === 0 ? <p className="text-sm">No open jobs.</p> : (
          <table>
            <thead><tr><th className="w-8" /><th>Job</th><th>For</th><th>Due</th><th>Done by</th><th>Note</th></tr></thead>
            <tbody>
              {jobs.map((a) => (
                <tr key={a.id}>
                  <td><Box /></td>
                  <td><b>{a.title}</b>{a.notes ? <div className="text-xs">{a.notes}</div> : null}{[a.animals?.name, a.herds?.name, a.paddocks?.name].filter(Boolean).length ? <div className="text-xs">{[a.animals?.name, a.herds?.name, a.paddocks?.name].filter(Boolean).join(' · ')}</div> : null}</td>
                  <td>{whoFor(a)}</td>
                  <td className="whitespace-nowrap">{a.due_date ? format(parseISO(a.due_date), 'EEE MMM d') : ''}</td>
                  <td className="w-28" />
                  <td className="w-32" />
                </tr>
              ))}
              {Array.from({ length: blankRows }, (_, i) => (
                <tr key={`blank-${i}`}><td><Box /></td><td>&nbsp;</td><td /><td /><td /><td /></tr>
              ))}
            </tbody>
          </table>
        )}

        <SectionTitle>Hours worked</SectionTitle>
        <table>
          <thead><tr><th>Name</th><th>Start</th><th>End</th><th>Break</th><th>What you worked on</th></tr></thead>
          <tbody>
            {Array.from({ length: Math.max(3, blankRows) }, (_, i) => (
              <tr key={i}><td className="w-40">{i === 0 && person ? person.name : ' '}</td><td className="w-20" /><td className="w-20" /><td className="w-16" /><td /></tr>
            ))}
          </tbody>
        </table>

        <SectionTitle>Notes — anything wrong, low or out?</SectionTitle>
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="border-b border-gray-500 h-7" />)}

        <p className="text-xs mt-6">Back in GoatWise: tick each item on Chores, Treatments or Assignments and choose who did it; add hours on People &amp; Hours.</p>
      </div>
    </>
  );
}

export default function PrintDayPage() {
  return <Suspense fallback={<LoadingPage />}><DaySheet /></Suspense>;
}
