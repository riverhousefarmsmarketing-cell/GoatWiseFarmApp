'use client';

import { useState, useMemo } from 'react';
import { useTodaysMilk, useMilkStats, useTopProducers, useCreateMilkRecord, useUpdateMilkRecord, useDeleteMilkRecord } from '@/hooks/useMilk';
import { useAnimals } from '@/hooks/useAnimals';
import { useActiveWithdrawals } from '@/hooks/useHealth';
import { categoryIs } from '@/lib/animalVocab';
import { Card, Button, Input, Select, Modal, StatCard, Badge, EmptyState, LoadingSpinner, AnimalLink, ErrorState } from '@/components/ui';
import { formatDate, formatWeight } from '@/lib/utils';
import { Milk, Plus, TrendingUp, TrendingDown, Droplets, Calendar, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format, subDays } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const sessionOptions = [
  { value: 'AM', label: 'Morning (AM)' },
  { value: 'PM', label: 'Evening (PM)' },
  { value: 'once_daily', label: 'Once Daily' },
];

export default function MilkPage() {
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    animal_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    session: 'AM' as const,
    amount: '',
    discarded: false,
    discard_reason: '',
  });

  const { data: todaysMilk, isLoading: todayLoading, isError: todayError, refetch: refetchToday } = useTodaysMilk();
  const { data: milkStats } = useMilkStats(7);
  const { data: topProducers } = useTopProducers(7);
  const { data: activeAnimals } = useAnimals({ status: 'active' });
  const { data: activeWithdrawals } = useActiveWithdrawals();

  // Map animal_id -> the latest active drug-withdrawal end date, so we can warn
  // before milk from a treated animal is logged/sold (a food-safety guard).
  const withdrawalByAnimal = useMemo(() => {
    const map: Record<string, string> = {};
    (activeWithdrawals as any[] | undefined)?.forEach((w) => {
      if (w.animal_id && (!map[w.animal_id] || w.withdrawalEndDate > map[w.animal_id])) {
        map[w.animal_id] = w.withdrawalEndDate;
      }
    });
    return map;
  }, [activeWithdrawals]);
  const selectedWithdrawalEnd = newRecord.animal_id ? withdrawalByAnimal[newRecord.animal_id] : undefined;
  const milkingDoes = useMemo(
    () => activeAnimals?.filter(a => categoryIs(a, 'milking_female')) || [],
    [activeAnimals]
  );
  const createRecord = useCreateMilkRecord();
  const updateRecord = useUpdateMilkRecord();
  const deleteRecord = useDeleteMilkRecord();
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Prepare chart data
  const chartLabels = Array.from({ length: 7 }, (_, i) =>
    format(subDays(new Date(), 6 - i), 'EEE')
  );
  
  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Milk Production (lbs)',
        data: Array.from({ length: 7 }, (_, i) => {
          const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
          return milkStats?.byDate[date]?.total || 0;
        }),
        fill: true,
        borderColor: 'rgb(22, 163, 74)',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Calculate today's total
  const todaysTotal = todaysMilk?.reduce((sum: number, r: any) => 
    r.discarded ? sum : sum + r.amount, 0
  ) || 0;

  const resetForm = () => {
    setNewRecord({
      animal_id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      session: 'AM',
      amount: '',
      discarded: false,
      discard_reason: '',
    });
  };

  const openCreateRecord = () => {
    setEditingRecordId(null);
    resetForm();
    setShowRecordModal(true);
  };

  const openEditRecord = (record: any) => {
    setEditingRecordId(record.id);
    setNewRecord({
      animal_id: record.animal_id ?? '',
      date: record.date ?? format(new Date(), 'yyyy-MM-dd'),
      session: (record.session ?? 'AM') as any,
      amount: String(record.amount ?? ''),
      discarded: record.discarded ?? false,
      discard_reason: record.discard_reason ?? '',
    });
    setShowRecordModal(true);
  };

  const closeRecordModal = () => {
    setShowRecordModal(false);
    setEditingRecordId(null);
  };

  const handleRecordMilk = async () => {
    if (!newRecord.animal_id || !newRecord.amount || parseFloat(newRecord.amount) <= 0) return;

    const fields = {
      animal_id: newRecord.animal_id,
      date: newRecord.date,
      session: newRecord.session,
      amount: parseFloat(newRecord.amount),
      amount_unit: 'lbs',
      discarded: newRecord.discarded,
      discard_reason: newRecord.discarded ? newRecord.discard_reason : null,
    };

    try {
      if (editingRecordId) {
        await updateRecord.mutateAsync({ id: editingRecordId, ...fields });
      } else {
        await createRecord.mutateAsync(fields);
      }
    } catch (error) {
      console.error('Error recording milk:', error);
      alert('Could not record the milk entry. Please try again.');
      return;
    }

    setShowRecordModal(false);
    setEditingRecordId(null);
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Milk Production</h1>
          <p className="text-gray-500">Track daily milk production</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateRecord}>
          Record Milking
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Total"
          value={`${todaysTotal.toFixed(1)} lbs`}
          icon={<Milk className="h-5 w-5" />}
        />
        <StatCard
          title="7-Day Average"
          value={`${milkStats?.dailyAverage.toFixed(1) || 0} lbs/day`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Weekly Total"
          value={`${milkStats?.totalAmount.toFixed(1) || 0} lbs`}
          icon={<Calendar className="h-5 w-5" />}
        />
        <StatCard
          title="Discarded"
          value={`${milkStats?.discardedAmount.toFixed(1) || 0} lbs`}
          subtitle="This week"
          icon={<Droplets className="h-5 w-5" />}
        />
      </div>

      {/* Chart & Top Producers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2 p-4">
          <h2 className="font-semibold text-gray-900 mb-4">7-Day Production</h2>
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </Card>

        {/* Top Producers */}
        <Card>
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">Top Producers</h2>
          </div>
          <div className="divide-y">
            {!topProducers?.length ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No records this week
              </div>
            ) : (
              topProducers.map((producer: any, index: number) => (
                <div key={producer.animalId} className="p-4 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    index === 0 ? 'bg-amber-100 text-amber-700' :
                    index === 1 ? 'bg-gray-200 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    {producer.animalId ? (
                      <AnimalLink 
                        animalId={producer.animalId} 
                        name={producer.name}
                        variant="subtle"
                      />
                    ) : (
                      <p className="font-medium text-gray-900">{producer.name}</p>
                    )}
                  </div>
                  <p className="font-semibold">{producer.total.toFixed(1)} lbs</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Today's Records */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">Today's Records</h2>
        </div>
        {todayLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : todayError ? (
          <ErrorState onRetry={() => refetchToday()} />
        ) : !todaysMilk?.length ? (
          <EmptyState
            icon={<Milk className="h-8 w-8" />}
            title="No records today"
            description="Start recording milk production"
            action={
              <Button onClick={openCreateRecord}>Record Milking</Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Animal</th>
                  <th className="px-4 py-3 font-medium">Session</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {todaysMilk.map((record: any) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3">
                      {record.animals ? (
                        <AnimalLink 
                          animalId={record.animal_id} 
                          name={record.animals.name}
                          variant="subtle"
                        />
                      ) : (
                        <span className="text-gray-500">Unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={record.session === 'AM' ? 'info' : 'default'}>
                        {record.session}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {record.amount.toFixed(1)} {record.amount_unit}
                    </td>
                    <td className="px-4 py-3">
                      {record.discarded ? (
                        <Badge variant="warning">Discarded</Badge>
                      ) : (
                        <Badge variant="success">Recorded</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openEditRecord(record)}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label="Edit record"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Delete this milk record?')) {
                              deleteRecord.mutate(record.id);
                            }
                          }}
                          className="text-gray-400 hover:text-red-600"
                          aria-label="Delete record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Record Modal */}
      <Modal
        open={showRecordModal}
        onClose={closeRecordModal}
        title={editingRecordId ? 'Edit Milk Record' : 'Record Milking'}
        footer={
          <>
            <Button variant="ghost" onClick={closeRecordModal}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordMilk}
              loading={editingRecordId ? updateRecord.isPending : createRecord.isPending}
            >
              {editingRecordId ? 'Save Changes' : 'Save Record'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Animal"
            options={[
              { value: '', label: 'Select animal...' },
              ...(milkingDoes?.map(a => ({ value: a.id, label: a.name })) || []),
            ]}
            value={newRecord.animal_id}
            onChange={(e) => {
              const animalId = e.target.value;
              const end = animalId ? withdrawalByAnimal[animalId] : undefined;
              // Default to discarded when the animal is under an active drug
              // withdrawal, so the milk isn't accidentally counted as saleable.
              setNewRecord(prev => end
                ? { ...prev, animal_id: animalId, discarded: true, discard_reason: prev.discard_reason || `Drug withdrawal until ${end}` }
                : { ...prev, animal_id: animalId });
            }}
            required
          />
          {selectedWithdrawalEnd && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                This animal is under a drug withdrawal until{' '}
                <strong>{formatDate(selectedWithdrawalEnd)}</strong>. Its milk should be
                discarded, not sold, until then.
              </span>
            </div>
          )}
          <Input
            label="Date"
            type="date"
            value={newRecord.date}
            onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
            required
          />
          <Select
            label="Session"
            options={sessionOptions}
            value={newRecord.session}
            onChange={(e) => setNewRecord({ ...newRecord, session: e.target.value as any })}
          />
          <Input
            label="Amount (lbs)"
            type="number"
            min="0"
            step="0.1"
            value={newRecord.amount}
            onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })}
            placeholder="e.g., 4.5"
            required
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="discarded"
              checked={newRecord.discarded}
              onChange={(e) => setNewRecord({ ...newRecord, discarded: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="discarded" className="text-sm text-gray-700">
              Milk was discarded
            </label>
          </div>
          {newRecord.discarded && (
            <Input
              label="Discard Reason"
              value={newRecord.discard_reason}
              onChange={(e) => setNewRecord({ ...newRecord, discard_reason: e.target.value })}
              placeholder="e.g., antibiotic withdrawal"
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
