'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { FlaskConical, Plus, Trash2 } from 'lucide-react';
import { useFarmMembers, memberName } from '@/hooks/useFarm';
import {
  LAB_TEST_LABELS, LabResult, LabTest, LabTestType, animalLabel, useDeleteLabTest, useLabTests, useSaveLabTest, useScheduleAnimals,
} from '@/hooks/useAnimalHealth';
import { localISODate } from '@/lib/chores';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal, Select } from '@/components/ui';

const RESULT_LABELS: Record<LabResult, string> = { pending: 'Pending', negative: 'Negative', positive: 'Positive', inconclusive: 'Inconclusive', value: 'Number' };
const RESULT_VARIANT: Record<LabResult, 'default' | 'success' | 'danger' | 'warning' | 'info'> = {
  pending: 'default', negative: 'success', positive: 'danger', inconclusive: 'warning', value: 'info',
};
/** Disease screening tests buyers ask about. */
const HERD_STATUS_TESTS: LabTestType[] = ['cae', 'cl', 'johnes'];

type Form = {
  id?: string; animal_ids: string[]; test_type: LabTestType; test_name: string; sample_date: string; result_date: string;
  result: LabResult; value: string; value_unit: string; lab_name: string; notes: string;
};

export default function LabTestsPage() {
  const today = localISODate();
  const { data: members } = useFarmMembers();
  const { data: tests = [], isLoading } = useLabTests();
  const { data: animals = [] } = useScheduleAnimals();
  const save = useSaveLabTest();
  const remove = useDeleteLabTest();

  const [typeFilter, setTypeFilter] = useState('');
  const [animalFilter, setAnimalFilter] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState('');

  const yearAgo = useMemo(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); }, []);

  // Herd status: latest result per animal per screening test, over active animals.
  const herdStatus = useMemo(() => HERD_STATUS_TESTS.map((type) => {
    const latest = new Map<string, LabTest>();
    tests.filter((t) => t.test_type === type && t.result !== 'pending').forEach((t) => {
      const have = latest.get(t.animal_id);
      if (!have || t.sample_date > have.sample_date) latest.set(t.animal_id, t);
    });
    const active = animals.map((a) => latest.get(a.id)).filter(Boolean) as LabTest[];
    return {
      type,
      tested: active.filter((t) => t.sample_date >= yearAgo).length,
      positive: active.filter((t) => t.result === 'positive').length,
      lastDate: active.reduce<string | null>((m, t) => (!m || t.sample_date > m ? t.sample_date : m), null),
    };
  }), [tests, animals, yearAgo]);

  const shown = tests.filter((t) => (!typeFilter || t.test_type === typeFilter) && (!animalFilter || t.animal_id === animalFilter));

  const openNew = () => {
    setError('');
    setForm({ animal_ids: [], test_type: 'fecal_egg_count', test_name: '', sample_date: today, result_date: '', result: 'pending', value: '', value_unit: 'epg', lab_name: '', notes: '' });
  };
  const openEdit = (t: LabTest) => {
    setError('');
    setForm({ id: t.id, animal_ids: [t.animal_id], test_type: t.test_type, test_name: t.test_name ?? '', sample_date: t.sample_date,
      result_date: t.result_date ?? '', result: t.result, value: t.value?.toString() ?? '', value_unit: t.value_unit ?? '', lab_name: t.lab_name ?? '', notes: t.notes ?? '' });
  };
  const submit = () => {
    if (!form) return;
    if (form.animal_ids.length === 0) return setError('Choose at least one animal.');
    if (form.result === 'value' && form.value === '') return setError('Enter the number.');
    save.mutate({
      id: form.id, animal_id: form.animal_ids[0], animal_ids: form.id ? undefined : form.animal_ids, test_type: form.test_type,
      test_name: form.test_name.trim() || null, sample_date: form.sample_date, result_date: form.result_date || null, result: form.result,
      value: form.value === '' ? null : Number(form.value), value_unit: form.value_unit.trim() || null, lab_name: form.lab_name.trim() || null,
      notes: form.notes.trim() || null,
    }, { onSuccess: () => setForm(null), onError: (e: any) => setError(e.message) });
  };

  if (isLoading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lab Tests</h1>
          <p className="text-gray-500">Disease screening, fecal egg counts and other lab results.</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openNew}>Add results</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {herdStatus.map((s) => (
          <Card key={s.type}>
            <p className="text-sm text-gray-500">{LAB_TEST_LABELS[s.type]} — herd status</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {s.tested} of {animals.length} tested <span className="text-sm font-normal text-gray-500">in the last 12 months</span>
            </p>
            <p className={`text-sm ${s.positive ? 'text-[#9B1C1C] font-medium' : 'text-gray-600'}`}>
              {s.positive ? `${s.positive} positive` : 'No positives'}{s.lastDate ? ` · last test ${format(parseISO(s.lastDate), 'MMM d, yyyy')}` : ''}
            </p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="sm:w-56">
          <Select aria-label="Test" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            options={[{ value: '', label: 'All tests' }, ...(Object.keys(LAB_TEST_LABELS) as LabTestType[]).map((t) => ({ value: t, label: LAB_TEST_LABELS[t] }))]} />
        </div>
        <div className="sm:w-64">
          <Select aria-label="Animal" value={animalFilter} onChange={(e) => setAnimalFilter(e.target.value)}
            options={[{ value: '', label: 'All animals' }, ...animals.map((a) => ({ value: a.id, label: animalLabel(a) }))]} />
        </div>
      </div>

      <Card padding="none">
        {shown.length === 0 ? (
          <div className="p-6"><EmptyState icon={<FlaskConical className="h-10 w-10" />} title="No lab results" description="Add results when they come back from the lab." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-2 font-medium">Animal</th>
                  <th className="px-3 py-2 font-medium">Test</th>
                  <th className="px-3 py-2 font-medium">Sampled</th>
                  <th className="px-3 py-2 font-medium">Result</th>
                  <th className="px-3 py-2 font-medium hidden md:table-cell">Lab</th>
                  <th className="px-3 py-2 font-medium hidden md:table-cell">Entered by</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shown.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(t)}>
                    <td className="px-5 py-2">
                      <Link href={`/dashboard/herd/${t.animal_id}`} className="text-gray-900 hover:underline" onClick={(e) => e.stopPropagation()}>{animalLabel(t.animals)}</Link>
                    </td>
                    <td className="px-3 py-2">{t.test_type === 'other' && t.test_name ? t.test_name : LAB_TEST_LABELS[t.test_type]}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{format(parseISO(t.sample_date), 'MMM d, yyyy')}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {t.result === 'value' ? <span className="font-medium">{t.value} {t.value_unit}</span> : <Badge variant={RESULT_VARIANT[t.result]}>{RESULT_LABELS[t.result]}</Badge>}
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">{t.lab_name ?? '—'}</td>
                    <td className="px-3 py-2 hidden md:table-cell">{memberName(members, t.user_id)}</td>
                    <td className="px-3 py-2 text-right">
                      <button className="p-1 text-gray-400 hover:text-red-700" aria-label="Delete result"
                        onClick={(e) => { e.stopPropagation(); remove.mutate({ id: t.id, label: `${LAB_TEST_LABELS[t.test_type]} for ${t.animals?.name ?? 'animal'} (${t.sample_date})` }, { onError: (err: any) => alert(err.message) }); }}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit lab result' : 'Add lab results'} size="lg"
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save</Button></>}>
        {form && (
          <div className="space-y-3">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
            {form.id ? (
              <p className="text-sm text-gray-700">{animalLabel(animals.find((a) => a.id === form.animal_ids[0]) ?? tests.find((t) => t.id === form.id)?.animals)}</p>
            ) : (
              <fieldset>
                <legend className="text-sm font-medium text-[#384E42] mb-1">Animals <span className="font-normal text-gray-500">(same test for several at once)</span></legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                  {animals.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm rounded-lg border border-[#DDD8D4] px-3 py-1.5 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" className="rounded" checked={form.animal_ids.includes(a.id)}
                        onChange={() => setForm({ ...form, animal_ids: form.animal_ids.includes(a.id) ? form.animal_ids.filter((x) => x !== a.id) : [...form.animal_ids, a.id] })} />
                      <span className="truncate">{animalLabel(a)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Test" value={form.test_type} onChange={(e) => {
                const t = e.target.value as LabTestType;
                setForm({ ...form, test_type: t, value_unit: t === 'fecal_egg_count' ? 'epg' : form.value_unit, result: t === 'fecal_egg_count' && form.result === 'pending' ? 'value' : form.result });
              }} options={(Object.keys(LAB_TEST_LABELS) as LabTestType[]).map((t) => ({ value: t, label: LAB_TEST_LABELS[t] }))} />
              {form.test_type === 'other' && <Input label="Test name" value={form.test_name} onChange={(e) => setForm({ ...form, test_name: e.target.value })} />}
              <Input label="Sample date" type="date" value={form.sample_date} onChange={(e) => setForm({ ...form, sample_date: e.target.value })} />
              <Input label="Result date" type="date" value={form.result_date} onChange={(e) => setForm({ ...form, result_date: e.target.value })} />
              <Select label="Result" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value as LabResult })}
                options={(Object.keys(RESULT_LABELS) as LabResult[]).map((r) => ({ value: r, label: RESULT_LABELS[r] }))} />
              {form.result === 'value' && (
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Value" type="number" step="any" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                  <Input label="Unit" value={form.value_unit} onChange={(e) => setForm({ ...form, value_unit: e.target.value })} />
                </div>
              )}
              <Input label="Lab" value={form.lab_name} onChange={(e) => setForm({ ...form, lab_name: e.target.value })} placeholder="e.g. WADDL, state lab" />
            </div>
            <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        )}
      </Modal>
    </div>
  );
}
