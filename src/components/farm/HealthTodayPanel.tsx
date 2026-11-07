'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Syringe, CalendarCheck, ShieldAlert, Eye } from 'lucide-react';
import {
  courseSlots, useConcerns, useCourseDoses, useHealthProtocols, useProtocolRecords, useScheduleAnimals, useTreatmentCourses, useWatchList,
} from '@/hooks/useAnimalHealth';
import { computeDue } from '@/lib/healthSchedule';
import { formatSlot, localISODate } from '@/lib/chores';
import { ReportConcernModal } from '@/components/farm/ReportConcern';
import { Button, Card } from '@/components/ui';

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Today page: doses due, health schedule, sick pen/watch list and concerns. */
export function HealthTodayPanel() {
  const today = localISODate();
  const [reportOpen, setReportOpen] = useState(false);
  const { data: courses = [] } = useTreatmentCourses();
  const { data: doses = [] } = useCourseDoses(courses.map((c) => c.id));
  const { data: protocols = [] } = useHealthProtocols();
  const { data: animals = [] } = useScheduleAnimals();
  const { data: records = [] } = useProtocolRecords();
  const { data: watch = [] } = useWatchList();
  const { data: concerns = [] } = useConcerns();

  const doseState = useMemo(() => {
    const given = new Set(doses.map((d) => `${d.course_id}|${d.dose_date}|${d.slot}`));
    const now = nowHHMM();
    const todo: { name: string; med: string; slot: string; late: boolean }[] = [];
    let missed = 0;
    for (const c of courses) {
      for (const s of courseSlots(c)) {
        if (given.has(`${c.id}|${s.date}|${s.slot}`)) continue;
        if (s.date < today) missed++;
        else if (s.date === today) todo.push({ name: c.animals?.name ?? 'Animal', med: c.medication, slot: s.slot, late: s.slot < now });
      }
    }
    todo.sort((a, b) => a.slot.localeCompare(b.slot));
    return { todo, missed, late: todo.filter((t) => t.late).length };
  }, [courses, doses, today]);

  const due = useMemo(() => computeDue(protocols, animals, records, today), [protocols, animals, records, today]);
  const overdue = due.filter((d) => d.state === 'overdue').length;
  const dueToday = due.filter((d) => d.state === 'due').length;
  const openConcerns = concerns.filter((c) => c.status !== 'resolved');
  const urgent = openConcerns.filter((c) => c.urgency === 'urgent').length;
  const isolated = watch.filter((w) => w.care_status === 'isolated');
  const watching = watch.filter((w) => w.care_status === 'watch');

  const cards: JSX.Element[] = [];
  if (doseState.todo.length || doseState.missed) {
    cards.push(
      <Link key="doses" href="/dashboard/treatments" className="block">
        <Card className={`h-full hover:border-[#105040] ${doseState.late || doseState.missed ? 'border-[#9B1C1C]/40' : ''}`}>
          <div className="flex gap-3">
            <Syringe className={`h-6 w-6 flex-shrink-0 ${doseState.late || doseState.missed ? 'text-[#9B1C1C]' : 'text-[#105040]'}`} />
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">
                {doseState.todo.length} dose{doseState.todo.length === 1 ? '' : 's'} to give today
                {doseState.late > 0 && <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-[#9B1C1C] text-white">{doseState.late} late</span>}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {doseState.todo.slice(0, 3).map((t) => `${formatSlot(t.slot)} ${t.name}`).join(' · ') || 'None left today'}
              </p>
              {doseState.missed > 0 && <p className="text-sm text-[#9B1C1C]">{doseState.missed} missed on earlier days</p>}
            </div>
          </div>
        </Card>
      </Link>
    );
  }
  if (overdue || dueToday) {
    cards.push(
      <Link key="schedule" href="/dashboard/health-schedule" className="block">
        <Card className="h-full hover:border-[#105040]">
          <div className="flex gap-3">
            <CalendarCheck className="h-6 w-6 flex-shrink-0 text-[#105040]" />
            <div>
              <p className="font-semibold text-gray-900">Health schedule</p>
              <p className="text-sm text-gray-600">
                {overdue > 0 && <span className="text-[#9B1C1C] font-medium">{overdue} overdue</span>}
                {overdue > 0 && dueToday > 0 && ' · '}
                {dueToday > 0 && `${dueToday} due today`}
              </p>
            </div>
          </div>
        </Card>
      </Link>
    );
  }
  if (isolated.length || watching.length || openConcerns.length) {
    cards.push(
      <Link key="sick" href="/dashboard/sick-pen" className="block">
        <Card className={`h-full hover:border-[#105040] ${urgent ? 'border-[#9B1C1C]/40' : ''}`}>
          <div className="flex gap-3">
            <ShieldAlert className={`h-6 w-6 flex-shrink-0 ${isolated.length || urgent ? 'text-[#9B1C1C]' : 'text-amber-600'}`} />
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">Sick pen &amp; concerns</p>
              {isolated.length > 0 && <p className="text-sm text-gray-700 truncate">Isolated: {isolated.map((w) => w.name).join(', ')}</p>}
              {watching.length > 0 && <p className="text-sm text-gray-700 truncate flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Watch: {watching.map((w) => w.name).join(', ')}</p>}
              {openConcerns.length > 0 && (
                <p className={`text-sm ${urgent ? 'text-[#9B1C1C] font-medium' : 'text-gray-600'}`}>
                  {openConcerns.length} open concern{openConcerns.length === 1 ? '' : 's'}{urgent ? ` (${urgent} urgent)` : ''}
                </p>
              )}
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" leftIcon={<AlertCircle className="h-4 w-4" />} onClick={() => setReportOpen(true)}>Report a concern</Button>
      </div>
      {cards.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{cards}</div>}
      <ReportConcernModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
