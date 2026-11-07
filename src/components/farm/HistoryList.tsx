'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { memberName, type FarmMember } from '@/hooks/useFarm';
import {
  ACTION_VERBS, AuditEntry, fieldLabel, formatValue, recordName, tableLabel, visibleFields,
} from '@/lib/history';

const ACTION_ICON = {
  insert: <Plus className="h-4 w-4 text-[#105040]" />,
  update: <Pencil className="h-4 w-4 text-[#384E42]" />,
  delete: <Trash2 className="h-4 w-4 text-[#9B1C1C]" />,
};

/** One line per change, expandable to show exactly what changed. */
export function HistoryList({ entries, members }: { entries: AuditEntry[]; members: FarmMember[] | undefined }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <ul className="divide-y divide-gray-100">
      {entries.map((e) => {
        const name = recordName(e);
        const fields =
          e.action === 'update'
            ? visibleFields(e.changed_fields)
            : visibleFields(Object.keys((e.action === 'insert' ? e.new_data : e.old_data) ?? {}));
        const isOpen = open === e.id;
        return (
          <li key={e.id} className="px-5 py-3">
            <button className="w-full text-left flex items-start gap-3" onClick={() => setOpen(isOpen ? null : e.id)} aria-expanded={isOpen}>
              <span className="mt-0.5 flex-shrink-0">{ACTION_ICON[e.action]}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-gray-900">
                  <span className="font-medium">{memberName(members, e.changed_by)}</span> {ACTION_VERBS[e.action]}{' '}
                  {tableLabel(e.table_name).toLowerCase()}
                  {name ? <> &ldquo;{name}&rdquo;</> : null}
                  {e.action === 'update' && fields.length > 0 && (
                    <span className="text-gray-500"> — {fields.slice(0, 4).map(fieldLabel).join(', ').toLowerCase()}{fields.length > 4 ? '…' : ''}</span>
                  )}
                </span>
                <span className="block text-xs text-gray-500">{format(new Date(e.changed_at), "MMM d, yyyy 'at' h:mm a")}</span>
              </span>
            </button>
            {isOpen && fields.length > 0 && (
              <div className="mt-2 ml-7 overflow-x-auto">
                <table className="text-sm min-w-full">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pr-4 py-1 font-medium">Field</th>
                      {e.action !== 'insert' && <th className="pr-4 py-1 font-medium">{e.action === 'update' ? 'Before' : 'Value'}</th>}
                      {e.action !== 'delete' && <th className="py-1 font-medium">{e.action === 'update' ? 'After' : 'Value'}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f) => (
                      <tr key={f} className="align-top">
                        <td className="pr-4 py-1 text-gray-600 whitespace-nowrap">{fieldLabel(f)}</td>
                        {e.action !== 'insert' && <td className="pr-4 py-1 text-gray-900 break-words">{formatValue(e.old_data?.[f])}</td>}
                        {e.action !== 'delete' && <td className="py-1 text-gray-900 break-words">{formatValue(e.new_data?.[f])}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
