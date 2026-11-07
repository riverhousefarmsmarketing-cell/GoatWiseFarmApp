'use client';

import { format } from 'date-fns';
import { CheckCircle2, Circle, XCircle, Undo2 } from 'lucide-react';
import { memberName, type FarmMember } from '@/hooks/useFarm';
import type { CourseDose, TreatmentCourse } from '@/hooks/useAnimalHealth';
import { formatSlot } from '@/lib/chores';

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** One scheduled dose of a treatment course: given, skipped, late or still to do. */
export function DoseCell({ course, date, slot, dose, onGive, onSkip, onUndo, canUndo, members, today }: {
  course: TreatmentCourse; date: string; slot: string; dose: CourseDose | undefined; today: string;
  onGive: () => void; onSkip: () => void; onUndo: () => void; canUndo: boolean; members: FarmMember[] | undefined;
}) {
  const late = !dose && (date < today || (date === today && slot < nowHHMM()));
  if (dose) {
    return (
      <div className={`flex items-start gap-2 rounded-lg px-2 py-1.5 ${dose.skipped ? 'bg-gray-100' : 'bg-[#B8DCC8]/30'}`}>
        {dose.skipped ? <XCircle className="h-5 w-5 text-gray-500 flex-shrink-0" /> : <CheckCircle2 className="h-5 w-5 text-[#105040] flex-shrink-0" />}
        <div className="text-xs flex-1 min-w-0">
          <p className="font-medium text-gray-900">{formatSlot(slot)} {dose.skipped ? 'skipped' : 'given'}</p>
          <p className="text-gray-600">
            {memberName(members, dose.user_id)} · {format(new Date(dose.given_at), "MMM d 'at' h:mm a")}
            {(dose as any).pending ? ' · waiting for signal to send' : ''}
            {dose.amount != null && !dose.skipped ? ` · ${dose.amount} ${dose.dose_unit ?? course.dose_unit ?? ''}` : ''}
          </p>
          {dose.note && <p className="text-gray-600 italic">“{dose.note}”</p>}
        </div>
        {canUndo && (
          <button className="p-0.5 text-gray-400 hover:text-gray-700" aria-label="Undo" onClick={onUndo}><Undo2 className="h-3.5 w-3.5" /></button>
        )}
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border ${late ? 'border-[#9B1C1C]/40 bg-red-50' : 'border-[#DDD8D4]'}`}>
      <button onClick={onGive} className="flex items-center gap-2 flex-1 text-left" aria-label={`Give ${formatSlot(slot)} dose`}>
        <Circle className={`h-5 w-5 flex-shrink-0 ${late ? 'text-[#9B1C1C]' : 'text-gray-300'}`} />
        <span className="text-xs">
          <span className="font-medium text-gray-900">{formatSlot(slot)}</span>
          {late && <span className="text-[#9B1C1C] font-medium"> · {date < today ? 'missed' : 'late'}</span>}
        </span>
      </button>
      <button onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-700">Skip</button>
    </div>
  );
}

