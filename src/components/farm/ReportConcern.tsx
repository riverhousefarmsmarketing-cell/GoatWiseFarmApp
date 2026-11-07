'use client';

import { useState } from 'react';
import { AlertCircle, Camera } from 'lucide-react';
import { animalLabel, useReportConcern, useScheduleAnimals } from '@/hooks/useAnimalHealth';
import { notify } from '@/components/ui/toast';
import { Button, Modal, Select } from '@/components/ui';

/**
 * "Report a concern": anyone flags a problem (optionally about an animal,
 * with a photo). It lands on the Sick Pen & Concerns page for the owner and
 * managers to acknowledge and resolve.
 */
export function ReportConcernModal({ open, onClose, animalId }: { open: boolean; onClose: () => void; animalId?: string }) {
  const { data: animals = [] } = useScheduleAnimals();
  const report = useReportConcern();
  const [animal, setAnimal] = useState(animalId ?? '');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'normal' | 'urgent'>('normal');
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState('');

  const reset = () => { setAnimal(animalId ?? ''); setDescription(''); setUrgency('normal'); setPhoto(null); setError(''); };
  const close = () => { reset(); onClose(); };

  const submit = () => {
    if (!description.trim()) return setError('Say what you noticed.');
    report.mutate({ animal_id: animal || null, description, urgency, photo }, {
      onSuccess: () => { notify(urgency === 'urgent' ? 'Reported as urgent. The owner and managers have been told.' : 'Thanks, your report was sent to the owner and managers.'); close(); },
      onError: (e: any) => setError(e.message),
    });
  };

  return (
    <Modal open={open} onClose={close} title="Report a concern"
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button loading={report.isPending} onClick={submit}>Send report</Button></>}>
      <div className="space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
        <Select label="Which animal (optional)" value={animal} onChange={(e) => setAnimal(e.target.value)}
          options={[{ value: '', label: 'Not about one animal' }, ...animals.map((a) => ({ value: a.id, label: animalLabel(a) }))]} />
        <div className="space-y-1">
          <label htmlFor="concern-text" className="block text-sm font-medium text-[#384E42]">What did you notice?<span className="text-[#9B1C1C] ml-1">*</span></label>
          <textarea id="concern-text" rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Daisy is limping on her left front and didn't come up to eat"
            className="w-full rounded-lg border border-[#DDD8D4] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#105040]" />
        </div>
        <div>
          <p className="block text-sm font-medium text-[#384E42] mb-1">How urgent?</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="How urgent">
            {([['low', 'Can wait'], ['normal', 'Today'], ['urgent', 'Urgent — now']] as const).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={urgency === v} onClick={() => setUrgency(v)}
                className={`rounded-lg border px-2 py-2 text-sm ${urgency === v
                  ? v === 'urgent' ? 'border-[#9B1C1C] bg-red-50 text-[#9B1C1C] font-medium' : 'border-[#105040] bg-[#B8DCC8]/30 font-medium'
                  : 'border-[#DDD8D4] text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>
          {urgency === 'urgent' && (
            <p className="mt-2 text-xs text-[#9B1C1C] flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> If an animal is in danger, call the vet now — numbers are on the Emergency page.</p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <Camera className="h-4 w-4" />
          <span>{photo ? photo.name : 'Add a photo (optional)'}</span>
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </label>
      </div>
    </Modal>
  );
}
