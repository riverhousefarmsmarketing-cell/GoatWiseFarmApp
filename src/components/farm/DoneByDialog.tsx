'use client';

import { useEffect, useState } from 'react';
import { useMyPerson, usePeople } from '@/hooks/usePeople';
import { Button, Input, Modal, Select } from '@/components/ui';

export interface DoneByResult {
  /** The person who did it (farm_people.id), or null for "me" when I have no profile. */
  personId: string | null;
  note: string;
  amount?: string;
}

/**
 * "Who did it?" when ticking something off. Defaults to me; pick someone else
 * when entering a paper sheet for family or helpers who don't use the app.
 */
export function DoneByDialog({ open, title, confirmLabel = 'Done', amountLabel, defaultAmount, onConfirm, onClose, busy }: {
  open: boolean;
  title: string;
  confirmLabel?: string;
  /** Show an amount field (e.g. dose given). */
  amountLabel?: string;
  defaultAmount?: string;
  onConfirm: (r: DoneByResult) => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const { data: people = [] } = usePeople();
  const { data: me } = useMyPerson();
  const [personId, setPersonId] = useState('');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (open) {
      setPersonId(me?.id ?? '');
      setNote('');
      setAmount(defaultAmount ?? '');
    }
  }, [open, me?.id, defaultAmount]);

  const others = people.filter((p) => p.active && p.id !== me?.id);

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={busy} onClick={() => onConfirm({ personId: personId || null, note, amount })}>{confirmLabel}</Button>
      </>}>
      <div className="space-y-3">
        {others.length > 0 && (
          <Select label="Who did it?" value={personId} onChange={(e) => setPersonId(e.target.value)}
            options={[
              { value: me?.id ?? '', label: 'Me' },
              ...others.map((p) => ({ value: p.id, label: p.user_id ? p.name : `${p.name} (paper sheet)` })),
            ]} />
        )}
        {amountLabel && <Input label={amountLabel} type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />}
        <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}
