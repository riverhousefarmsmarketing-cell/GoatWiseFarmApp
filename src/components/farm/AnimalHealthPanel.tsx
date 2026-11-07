'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Eye, ShieldAlert, AlertCircle, Syringe, FlaskConical, HeartCrack } from 'lucide-react';
import { useFarmMembers, memberName } from '@/hooks/useFarm';
import {
  DEATH_CATEGORY_LABELS, DeathCategory, LAB_TEST_LABELS, useLabTests, useRecordDeath, useSetCareStatus, useTreatmentCourses,
} from '@/hooks/useAnimalHealth';
import { ReportConcernModal } from '@/components/farm/ReportConcern';
import { localISODate } from '@/lib/chores';
import { Badge, Button, Card, Input, Modal, Select } from '@/components/ui';

interface PanelAnimal {
  id: string;
  name: string;
  status: string;
  care_status?: 'normal' | 'watch' | 'isolated' | null;
  care_status_note?: string | null;
  care_status_since?: string | null;
  care_status_by?: string | null;
  death_date?: string | null;
  death_category?: DeathCategory | null;
  death_cause?: string | null;
  necropsy_done?: boolean | null;
  necropsy_findings?: string | null;
}

/** Health at a glance on an animal's page: watch/sick-pen status, concerns, treatments, lab results, death record. */
export function AnimalHealthPanel({ animal }: { animal: PanelAnimal }) {
  const today = localISODate();
  const { data: members } = useFarmMembers();
  const { data: courses = [] } = useTreatmentCourses();
  const { data: labs = [] } = useLabTests(animal.id);
  const setCare = useSetCareStatus();
  const recordDeath = useRecordDeath();
  const [reportOpen, setReportOpen] = useState(false);
  const [deathOpen, setDeathOpen] = useState(false);
  const [death, setDeath] = useState({ death_date: today, death_category: 'unknown' as DeathCategory, death_cause: '', necropsy_done: false, necropsy_findings: '' });

  const care = animal.care_status ?? 'normal';
  const activeCourses = courses.filter((c) => c.animal_id === animal.id && c.status === 'active');
  const deceased = animal.status === 'deceased';

  const changeCare = (status: 'normal' | 'watch' | 'isolated') => {
    let note: string | null = null;
    if (status !== 'normal') {
      const answer = window.prompt(status === 'isolated' ? `Why is ${animal.name} going in the sick pen?` : `Why should the team watch ${animal.name}?`, animal.care_status_note ?? '');
      if (answer === null) return;
      note = answer.trim() || null;
    }
    setCare.mutate({ animalId: animal.id, status, note }, { onError: (e: any) => alert(e.message) });
  };

  return (
    <Card>
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          <h2 className="font-semibold text-gray-900">Health status</h2>

          {deceased ? (
            <div className="rounded-lg bg-gray-100 p-3 text-sm">
              <p className="font-medium text-gray-900 flex items-center gap-2"><HeartCrack className="h-4 w-4" /> Died{animal.death_date ? ` ${format(parseISO(animal.death_date), 'MMM d, yyyy')}` : ''}</p>
              {animal.death_category && <p className="text-gray-700">Cause: {DEATH_CATEGORY_LABELS[animal.death_category]}{animal.death_cause ? ` — ${animal.death_cause}` : ''}</p>}
              {animal.necropsy_done && <p className="text-gray-700">Necropsy: {animal.necropsy_findings || 'done'}</p>}
            </div>
          ) : (
            <>
              {care !== 'normal' && (
                <div className={`rounded-lg p-3 text-sm ${care === 'isolated' ? 'bg-red-50 text-[#9B1C1C]' : 'bg-amber-50 text-amber-900'}`}>
                  <p className="font-medium flex items-center gap-2">
                    {care === 'isolated' ? <ShieldAlert className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {care === 'isolated' ? 'In the sick pen / isolated' : 'Watch closely'}
                  </p>
                  {animal.care_status_note && <p>{animal.care_status_note}</p>}
                  {animal.care_status_since && <p className="text-xs opacity-80">Since {format(new Date(animal.care_status_since), "MMM d 'at' h:mm a")} · {memberName(members, animal.care_status_by)}</p>}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {care !== 'watch' && <Button size="sm" variant="outline" leftIcon={<Eye className="h-4 w-4" />} onClick={() => changeCare('watch')}>Watch closely</Button>}
                {care !== 'isolated' && <Button size="sm" variant="outline" leftIcon={<ShieldAlert className="h-4 w-4" />} onClick={() => changeCare('isolated')}>Sick pen</Button>}
                {care !== 'normal' && <Button size="sm" variant="ghost" onClick={() => changeCare('normal')}>Back to normal</Button>}
                <Button size="sm" variant="outline" leftIcon={<AlertCircle className="h-4 w-4" />} onClick={() => setReportOpen(true)}>Report a concern</Button>
                <Button size="sm" variant="ghost" leftIcon={<HeartCrack className="h-4 w-4" />} onClick={() => setDeathOpen(true)}>Record death</Button>
              </div>
            </>
          )}

          {activeCourses.length > 0 && (
            <div className="space-y-1">
              {activeCourses.map((c) => (
                <Link key={c.id} href="/dashboard/treatments" className="flex items-center gap-2 text-sm text-[#105040] hover:underline">
                  <Syringe className="h-4 w-4" /> On treatment: {c.medication}{c.reason ? ` (${c.reason})` : ''}
                </Link>
              ))}
            </div>
          )}
          {!deceased && activeCourses.length === 0 && (
            <Link href="/dashboard/treatments" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:underline"><Syringe className="h-4 w-4" /> Start a treatment</Link>
          )}
        </div>

        <div className="lg:w-80 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><FlaskConical className="h-4 w-4" /> Lab results</h3>
            <Link href="/dashboard/lab-tests" className="text-xs text-[#105040] hover:underline">Add / all</Link>
          </div>
          {labs.length === 0 ? (
            <p className="text-sm text-gray-500">No lab results.</p>
          ) : (
            <ul className="space-y-1.5">
              {labs.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-700">{LAB_TEST_LABELS[t.test_type]} · {format(parseISO(t.sample_date), 'MMM d, yyyy')}</span>
                  {t.result === 'value'
                    ? <span className="font-medium">{t.value} {t.value_unit}</span>
                    : <Badge variant={t.result === 'positive' ? 'danger' : t.result === 'negative' ? 'success' : 'default'}>{t.result}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ReportConcernModal open={reportOpen} onClose={() => setReportOpen(false)} animalId={animal.id} />

      <Modal open={deathOpen} onClose={() => setDeathOpen(false)} title={`Record the death of ${animal.name}`}
        footer={<>
          <Button variant="ghost" onClick={() => setDeathOpen(false)}>Cancel</Button>
          <Button variant="danger" loading={recordDeath.isPending} onClick={() => recordDeath.mutate({ animalId: animal.id, ...death }, { onSuccess: () => setDeathOpen(false), onError: (e: any) => alert(e.message) })}>Save</Button>
        </>}>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{animal.name} will be marked deceased. Their records stay.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Date" type="date" max={today} value={death.death_date} onChange={(e) => setDeath({ ...death, death_date: e.target.value })} />
            <Select label="Cause" value={death.death_category} onChange={(e) => setDeath({ ...death, death_category: e.target.value as DeathCategory })}
              options={(Object.keys(DEATH_CATEGORY_LABELS) as DeathCategory[]).map((c) => ({ value: c, label: DEATH_CATEGORY_LABELS[c] }))} />
          </div>
          <Input label="Details" value={death.death_cause} onChange={(e) => setDeath({ ...death, death_cause: e.target.value })} placeholder="e.g. Pneumonia after 3 days of treatment" />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={death.necropsy_done} onChange={(e) => setDeath({ ...death, necropsy_done: e.target.checked })} className="rounded" />
            A necropsy was done
          </label>
          {death.necropsy_done && <Input label="Necropsy findings" value={death.necropsy_findings} onChange={(e) => setDeath({ ...death, necropsy_findings: e.target.value })} />}
        </div>
      </Modal>
    </Card>
  );
}
