'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { AlertCircle, Eye, ShieldAlert, CheckCircle2, Plus } from 'lucide-react';
import { useFarm, useFarmMembers, memberName } from '@/hooks/useFarm';
import {
  ConcernReport, animalLabel, useConcerns, useScheduleAnimals, useSetCareStatus, useUpdateConcern, useWatchList,
} from '@/hooks/useAnimalHealth';
import { ReportConcernModal } from '@/components/farm/ReportConcern';
import { Badge, Button, Card, EmptyState, LoadingSpinner, Modal, Select, Input } from '@/components/ui';

const stamp = (iso: string | null) => (iso ? format(new Date(iso), "MMM d 'at' h:mm a") : '');

export default function SickPenPage() {
  const { isManager } = useFarm();
  const { data: members } = useFarmMembers();
  const { data: watch = [], isLoading: watchLoading } = useWatchList();
  const { data: concerns = [], isLoading: concernsLoading } = useConcerns();
  const { data: animals = [] } = useScheduleAnimals();
  const setCare = useSetCareStatus();
  const updateConcern = useUpdateConcern();

  const [reportOpen, setReportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ animalId: '', status: 'watch' as 'watch' | 'isolated', note: '' });

  const isolated = watch.filter((w) => w.care_status === 'isolated');
  const watching = watch.filter((w) => w.care_status === 'watch');
  const open = concerns.filter((c) => c.status !== 'resolved').sort((a, b) => {
    const rank = { urgent: 0, normal: 1, low: 2 } as const;
    return rank[a.urgency] - rank[b.urgency] || a.created_at.localeCompare(b.created_at);
  });
  const resolved = concerns.filter((c) => c.status === 'resolved');

  const resolve = (c: ConcernReport) => {
    const note = window.prompt('What was done? (optional — the reporter will see this)', '');
    if (note === null) return;
    updateConcern.mutate({ id: c.id, status: 'resolved', resolution_note: note || null }, { onError: (e: any) => alert(e.message) });
  };

  const renderConcern = (c: ConcernReport) => (
    <li key={c.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3">
      <span className="mt-0.5 flex-shrink-0">
        {c.status === 'resolved' ? <CheckCircle2 className="h-5 w-5 text-[#105040]" /> : <AlertCircle className={`h-5 w-5 ${c.urgency === 'urgent' ? 'text-[#9B1C1C]' : 'text-amber-600'}`} />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {c.animal_id && <Link href={`/dashboard/herd/${c.animal_id}`} className="font-semibold text-gray-900 hover:underline">{animalLabel(c.animals)}</Link>}
          {c.urgency === 'urgent' && c.status !== 'resolved' && <Badge variant="danger">Urgent</Badge>}
          {c.status === 'acknowledged' && <Badge variant="info">Seen</Badge>}
        </div>
        <p className="text-sm text-gray-900 whitespace-pre-wrap">{c.description}</p>
        {c.photo_url && (
          <a href={c.photo_url} target="_blank" rel="noreferrer" className="inline-block mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.photo_url} alt="Photo with the report" className="h-24 w-24 object-cover rounded-lg border border-gray-200" />
          </a>
        )}
        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
          <p>Reported by {memberName(members, c.user_id)} · {stamp(c.created_at)} ({formatDistanceToNow(new Date(c.created_at), { addSuffix: true })})</p>
          {c.acknowledged_at && <p>Seen by {memberName(members, c.acknowledged_by)} · {stamp(c.acknowledged_at)}</p>}
          {c.resolved_at && <p className="text-[#105040]">Resolved by {memberName(members, c.resolved_by)} · {stamp(c.resolved_at)}{c.resolution_note ? ` — “${c.resolution_note}”` : ''}</p>}
        </div>
      </div>
      {isManager && c.status !== 'resolved' && (
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          {c.status === 'open' && <Button size="sm" variant="outline" onClick={() => updateConcern.mutate({ id: c.id, status: 'acknowledged' })}>Seen it</Button>}
          <Button size="sm" onClick={() => resolve(c)}>Resolved</Button>
        </div>
      )}
    </li>
  );

  const renderWatched = (w: typeof watch[number]) => (
    <li key={w.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <Link href={`/dashboard/herd/${w.id}`} className="font-medium text-gray-900 hover:underline">{animalLabel(w)}</Link>
        {w.care_status_note && <p className="text-sm text-gray-700">{w.care_status_note}</p>}
        <p className="text-xs text-gray-500">Since {stamp(w.care_status_since)} · by {memberName(members, w.care_status_by)}</p>
      </div>
      <div className="flex gap-2">
        {w.care_status === 'watch' ? (
          <Button size="sm" variant="outline" onClick={() => setCare.mutate({ animalId: w.id, status: 'isolated', note: w.care_status_note })}>Move to sick pen</Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setCare.mutate({ animalId: w.id, status: 'watch', note: w.care_status_note })}>Back to watch</Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => confirm(`Take ${w.name} off the list (back to normal)?`) && setCare.mutate({ animalId: w.id, status: 'normal', note: null })}>Back to normal</Button>
      </div>
    </li>
  );

  if (watchLoading || concernsLoading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sick Pen &amp; Concerns</h1>
          <p className="text-gray-500">Animals isolated or being watched, and problems the team has reported.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setAddForm({ animalId: '', status: 'watch', note: '' }); setAddOpen(true); }}>Add to watch list</Button>
          <Button leftIcon={<AlertCircle className="h-4 w-4" />} onClick={() => setReportOpen(true)}>Report a concern</Button>
        </div>
      </div>

      <Card padding="none">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-[#9B1C1C]" />
          <h2 className="font-semibold text-gray-900">Sick pen / isolated ({isolated.length})</h2>
        </div>
        {isolated.length === 0 ? <p className="px-5 py-3 text-sm text-gray-500">No animals isolated.</p> : <ul className="divide-y divide-gray-50">{isolated.map(renderWatched)}</ul>}
      </Card>

      <Card padding="none">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Eye className="h-5 w-5 text-amber-600" />
          <h2 className="font-semibold text-gray-900">Watch closely ({watching.length})</h2>
        </div>
        {watching.length === 0 ? <p className="px-5 py-3 text-sm text-gray-500">No animals on the watch list.</p> : <ul className="divide-y divide-gray-50">{watching.map(renderWatched)}</ul>}
      </Card>

      <Card padding="none">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Open concerns ({open.length})</h2>
        </div>
        {open.length === 0 ? (
          <div className="p-6"><EmptyState icon={<CheckCircle2 className="h-10 w-10" />} title="Nothing reported" description="When someone spots a problem, they tap “Report a concern”." /></div>
        ) : <ul className="divide-y divide-gray-100">{open.map(renderConcern)}</ul>}
      </Card>

      {resolved.length > 0 && (
        <Card padding="none">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Recently resolved</h2></div>
          <ul className="divide-y divide-gray-100">{resolved.slice(0, 30).map(renderConcern)}</ul>
        </Card>
      )}

      <ReportConcernModal open={reportOpen} onClose={() => setReportOpen(false)} />

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add to watch list"
        footer={<>
          <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button loading={setCare.isPending} onClick={() => {
            if (!addForm.animalId) return;
            setCare.mutate({ animalId: addForm.animalId, status: addForm.status, note: addForm.note.trim() || null }, { onSuccess: () => setAddOpen(false), onError: (e: any) => alert(e.message) });
          }}>Save</Button>
        </>}>
        <div className="space-y-3">
          <Select label="Animal" value={addForm.animalId} onChange={(e) => setAddForm({ ...addForm, animalId: e.target.value })}
            options={[{ value: '', label: 'Choose…' }, ...animals.map((a) => ({ value: a.id, label: animalLabel(a) }))]} />
          <Select label="Status" value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value as 'watch' | 'isolated' })}
            options={[{ value: 'watch', label: 'Watch closely' }, { value: 'isolated', label: 'Isolated / in the sick pen' }]} />
          <Input label="Why" value={addForm.note} onChange={(e) => setAddForm({ ...addForm, note: e.target.value })} placeholder="e.g. Off feed, temp 104.2" />
        </div>
      </Modal>
    </div>
  );
}
