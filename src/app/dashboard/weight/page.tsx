'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  LoadingSpinner,
  Modal,
  AnimalLink,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { toCanonicalCategory } from '@/lib/animalVocab';
import { format } from 'date-fns';
import {
  Scale,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  ChevronDown,
  ChevronUp,
  Target,
  Activity,
  AlertTriangle,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

interface WeightRecord {
  id: string;
  animal_id: string;
  date: string;
  weight: number;
  weight_unit: string;
  notes?: string;
  user_id: string;
  created_at: string;
}

// Ideal weight ranges by category (in lbs)
const IDEAL_WEIGHTS: Record<string, { min: number; max: number; label: string }> = {
  'young_male': { min: 20, max: 50, label: '0-6 months' },
  'young_female': { min: 20, max: 50, label: '0-6 months' },
  'young': { min: 5, max: 30, label: '0-3 months' },
  'yearling_doe': { min: 60, max: 100, label: '6-12 months' },
  'yearling_buck': { min: 70, max: 120, label: '6-12 months' },
  'dry_female': { min: 100, max: 180, label: 'Adult' },
  'milking_female': { min: 100, max: 180, label: 'Adult' },
  'bred_female': { min: 110, max: 200, label: 'Adult (pregnant)' },
  'male': { min: 150, max: 300, label: 'Adult' },
  'castrated': { min: 100, max: 200, label: 'Adult' },
};

// Ideal ranges and all on-screen weights are expressed in lbs, so normalize any
// record entered in kg before comparing/aggregating. Without this a kg weight
// was compared against lbs thresholds (e.g. an 80 kg / 176 lb doe flagged
// "underweight" against a 100 lb minimum) and mixed-unit deltas were spurious.
const toLbs = (weight: number | null | undefined, unit: string | null | undefined): number | null =>
  weight == null ? null : unit === 'kg' ? weight * 2.20462 : weight;

export default function WeightTrackingPage() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<string>('all');
  const [editingRecord, setEditingRecord] = useState<WeightRecord | null>(null);
  const [expandedAnimal, setExpandedAnimal] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    animal_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    weight: '',
    weight_unit: 'lbs',
    notes: '',
  });

  // Bulk entry state
  const [bulkDate, setBulkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bulkWeights, setBulkWeights] = useState<Record<string, string>>({});

  // Fetch animals
  const { data: animals, isLoading: animalsLoading } = useQuery({
    queryKey: ['animals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch weight records
  const { data: weightRecords, isLoading: weightsLoading } = useQuery({
    queryKey: ['weight_records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weight_records')
        .select('*')
        .eq('user_id', user!.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as WeightRecord[];
    },
    enabled: !!user,
  });

  // Add weight record mutation
  const addWeightMutation = useMutation({
    mutationFn: async (data: Omit<WeightRecord, 'id' | 'created_at'>) => {
      const { error } = await (supabase as any)
        .from('weight_records')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight_records'] });
      setShowAddModal(false);
      resetForm();
    },
  });

  // Update weight record mutation
  const updateWeightMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<WeightRecord> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('weight_records')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight_records'] });
      setEditingRecord(null);
      resetForm();
    },
  });

  // Delete weight record mutation
  const deleteWeightMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('weight_records')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight_records'] });
    },
  });

  // Bulk add mutation
  const bulkAddMutation = useMutation({
    mutationFn: async (records: Omit<WeightRecord, 'id' | 'created_at'>[]) => {
      const { error } = await (supabase as any)
        .from('weight_records')
        .insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight_records'] });
      setShowBulkModal(false);
      setBulkWeights({});
    },
  });

  const resetForm = () => {
    setFormData({
      animal_id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      weight: '',
      weight_unit: 'lbs',
      notes: '',
    });
  };

  // Calculate stats per animal
  const animalStats = useMemo(() => {
    const animalsList = (animals as any[]) || [];
    const records = (weightRecords as WeightRecord[]) || [];
    
    const stats: Record<string, {
      animal: any;
      records: WeightRecord[];
      currentWeight: number | null;
      previousWeight: number | null;
      change: number | null;
      changePercent: number | null;
      avgGrowthRate: number | null;
      isUnderweight: boolean;
      isOverweight: boolean;
      idealRange: { min: number; max: number } | null;
    }> = {};

    animalsList.forEach((animal: any) => {
      const animalRecords = records
        .filter((r: WeightRecord) => r.animal_id === animal.id)
        .sort((a: WeightRecord, b: WeightRecord) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const currentWeight = toLbs(animalRecords[0]?.weight, animalRecords[0]?.weight_unit);
      const previousWeight = toLbs(animalRecords[1]?.weight, animalRecords[1]?.weight_unit);
      const change = currentWeight && previousWeight ? currentWeight - previousWeight : null;
      const changePercent = change && previousWeight ? (change / previousWeight) * 100 : null;

      // Calculate average growth rate (lbs per day)
      let avgGrowthRate: number | null = null;
      if (animalRecords.length >= 2) {
        const oldest = animalRecords[animalRecords.length - 1];
        const newest = animalRecords[0];
        const daysDiff = Math.max(1, (new Date(newest.date).getTime() - new Date(oldest.date).getTime()) / (1000 * 60 * 60 * 24));
        const newestLbs = toLbs(newest.weight, newest.weight_unit) ?? 0;
        const oldestLbs = toLbs(oldest.weight, oldest.weight_unit) ?? 0;
        avgGrowthRate = (newestLbs - oldestLbs) / daysDiff;
      }

      // Check ideal weight range
      const idealRange = IDEAL_WEIGHTS[toCanonicalCategory(animal.category)] || null;
      const isUnderweight = currentWeight && idealRange ? currentWeight < idealRange.min : false;
      const isOverweight = currentWeight && idealRange ? currentWeight > idealRange.max : false;

      stats[animal.id] = {
        animal,
        records: animalRecords,
        currentWeight,
        previousWeight,
        change,
        changePercent,
        avgGrowthRate,
        isUnderweight,
        isOverweight,
        idealRange,
      };
    });

    return stats;
  }, [animals, weightRecords]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const statsList = Object.values(animalStats);
    const withRecords = statsList.filter(s => s.currentWeight !== null);
    const underweight = statsList.filter(s => s.isUnderweight);
    const overweight = statsList.filter(s => s.isOverweight);
    const gaining = statsList.filter(s => s.change !== null && s.change > 0);
    const losing = statsList.filter(s => s.change !== null && s.change < 0);

    return {
      totalAnimals: statsList.length,
      withRecords: withRecords.length,
      underweight: underweight.length,
      overweight: overweight.length,
      gaining: gaining.length,
      losing: losing.length,
    };
  }, [animalStats]);

  // Filtered animals for display
  const filteredStats = useMemo(() => {
    if (selectedAnimal === 'all') {
      return Object.values(animalStats);
    }
    const stat = animalStats[selectedAnimal];
    return stat ? [stat] : [];
  }, [animalStats, selectedAnimal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const record = {
      animal_id: formData.animal_id,
      date: formData.date,
      weight: parseFloat(formData.weight),
      weight_unit: formData.weight_unit,
      notes: formData.notes || undefined,
      user_id: user!.id,
    };

    if (editingRecord) {
      updateWeightMutation.mutate({ id: editingRecord.id, ...record });
    } else {
      addWeightMutation.mutate(record);
    }
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const records = Object.entries(bulkWeights)
      .filter(([_, weight]) => weight && parseFloat(weight) > 0)
      .map(([animal_id, weight]) => ({
        animal_id,
        date: bulkDate,
        weight: parseFloat(weight),
        weight_unit: 'lbs',
        user_id: user!.id,
      }));

    if (records.length > 0) {
      bulkAddMutation.mutate(records);
    }
  };

  const openEditModal = (record: WeightRecord) => {
    setEditingRecord(record);
    setFormData({
      animal_id: record.animal_id,
      date: record.date,
      weight: record.weight.toString(),
      weight_unit: record.weight_unit,
      notes: record.notes || '',
    });
    setShowAddModal(true);
  };

  if (animalsLoading || weightsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weight & Growth Tracking</h1>
          <p className="text-gray-500">Monitor weight changes and growth rates</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowBulkModal(true)}
            leftIcon={<Scale className="h-4 w-4" />}
          >
            Bulk Weigh-In
          </Button>
          <Button
            onClick={() => { resetForm(); setEditingRecord(null); setShowAddModal(true); }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Weight
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card padding="sm" className="text-center">
          <Scale className="h-5 w-5 mx-auto mb-1 text-primary-600" />
          <p className="text-2xl font-bold">{summaryStats.withRecords}</p>
          <p className="text-xs text-gray-500">With Records</p>
        </Card>
        <Card padding="sm" className="text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-600" />
          <p className="text-2xl font-bold text-green-600">{summaryStats.gaining}</p>
          <p className="text-xs text-gray-500">Gaining</p>
        </Card>
        <Card padding="sm" className="text-center">
          <TrendingDown className="h-5 w-5 mx-auto mb-1 text-red-600" />
          <p className="text-2xl font-bold text-red-600">{summaryStats.losing}</p>
          <p className="text-xs text-gray-500">Losing</p>
        </Card>
        <Card padding="sm" className="text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
          <p className="text-2xl font-bold text-yellow-600">{summaryStats.underweight}</p>
          <p className="text-xs text-gray-500">Underweight</p>
        </Card>
        <Card padding="sm" className="text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-orange-600" />
          <p className="text-2xl font-bold text-orange-600">{summaryStats.overweight}</p>
          <p className="text-xs text-gray-500">Overweight</p>
        </Card>
        <Card padding="sm" className="text-center">
          <Activity className="h-5 w-5 mx-auto mb-1 text-gray-600" />
          <p className="text-2xl font-bold">{summaryStats.totalAnimals - summaryStats.withRecords}</p>
          <p className="text-xs text-gray-500">No Records</p>
        </Card>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Select
              label="Filter by Animal"
              options={[
                { value: 'all', label: 'All Animals' },
                ...((animals as any[]) || []).map((a: any) => ({
                  value: a.id,
                  label: `${a.name} (${a.category.replace('_', ' ')})`,
                })),
              ]}
              value={selectedAnimal}
              onChange={(e) => setSelectedAnimal(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Animal Weight Cards */}
      <div className="space-y-4">
        {filteredStats.length === 0 ? (
          <Card className="p-8 text-center">
            <Scale className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No animals found</p>
          </Card>
        ) : (
          filteredStats.map((stat) => (
            <Card key={stat.animal.id} className="overflow-hidden">
              {/* Animal Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedAnimal(expandedAnimal === stat.animal.id ? null : stat.animal.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-600">
                      {stat.animal.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <AnimalLink 
                      animalId={stat.animal.id} 
                      name={stat.animal.name}
                      variant="bold"
                    />
                    <p className="text-sm text-gray-500">
                      {stat.animal.category.replace('_', ' ')} • {stat.animal.breed || 'Unknown breed'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Current Weight */}
                  <div className="text-right">
                    {stat.currentWeight ? (
                      <>
                        <p className="text-2xl font-bold">{Math.round(stat.currentWeight)} lbs</p>
                        {stat.change !== null && (
                          <p className={`text-sm flex items-center justify-end gap-1 ${
                            stat.change > 0 ? 'text-green-600' : stat.change < 0 ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {stat.change > 0 ? <TrendingUp className="h-4 w-4" /> :
                             stat.change < 0 ? <TrendingDown className="h-4 w-4" /> :
                             <Minus className="h-4 w-4" />}
                            {stat.change > 0 ? '+' : ''}{stat.change.toFixed(1)} lbs
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-400">No records</p>
                    )}
                  </div>

                  {/* Status Badges */}
                  <div className="flex gap-2">
                    {stat.isUnderweight && (
                      <Badge variant="warning">Underweight</Badge>
                    )}
                    {stat.isOverweight && (
                      <Badge variant="danger">Overweight</Badge>
                    )}
                  </div>

                  {expandedAnimal === stat.animal.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedAnimal === stat.animal.id && (
                <div className="border-t bg-gray-50 p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Growth Stats */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Growth Statistics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Current Weight:</span>
                          <span className="font-medium">{stat.currentWeight ? `${Math.round(stat.currentWeight)} lbs` : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Previous Weight:</span>
                          <span className="font-medium">{stat.previousWeight ? `${Math.round(stat.previousWeight)} lbs` : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Change:</span>
                          <span className={`font-medium ${
                            stat.change && stat.change > 0 ? 'text-green-600' : 
                            stat.change && stat.change < 0 ? 'text-red-600' : ''
                          }`}>
                            {stat.change ? `${stat.change > 0 ? '+' : ''}${stat.change.toFixed(1)} lbs (${stat.changePercent?.toFixed(1)}%)` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Avg Growth Rate:</span>
                          <span className="font-medium">
                            {stat.avgGrowthRate ? `${stat.avgGrowthRate.toFixed(2)} lbs/day` : '-'}
                          </span>
                        </div>
                        {stat.idealRange && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Ideal Range:</span>
                            <span className="font-medium">{stat.idealRange.min}-{stat.idealRange.max} lbs</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Weight Chart */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Weight History</h4>
                      {stat.records.length > 0 ? (
                        <div className="h-32 flex items-end gap-1">
                          {stat.records.slice(0, 12).reverse().map((record, idx) => {
                            const max = Math.max(...stat.records.map(r => r.weight));
                            const min = Math.min(...stat.records.map(r => r.weight));
                            const range = max - min || 1;
                            const height = ((record.weight - min) / range) * 80 + 20;
                            
                            return (
                              <div key={record.id} className="flex-1 flex flex-col items-center group relative">
                                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                                  {formatDate(record.date)}: {record.weight} lbs
                                </div>
                                <div
                                  className="w-full bg-primary-500 rounded-t hover:bg-primary-600 transition-colors"
                                  style={{ height: `${height}%` }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">No weight records</p>
                      )}
                    </div>

                    {/* Recent Records */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-900">Recent Records</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            resetForm();
                            setFormData(prev => ({ ...prev, animal_id: stat.animal.id }));
                            setShowAddModal(true);
                          }}
                          leftIcon={<Plus className="h-3 w-3" />}
                        >
                          Add
                        </Button>
                      </div>
                      {stat.records.length > 0 ? (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {stat.records.slice(0, 5).map((record) => (
                            <div key={record.id} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                              <div>
                                <span className="font-medium">{record.weight} lbs</span>
                                <span className="text-gray-400 ml-2">{formatDate(record.date)}</span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => openEditModal(record)}
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Delete this weight record?')) {
                                      deleteWeightMutation.mutate(record.id);
                                    }
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">No records yet</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Weight Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingRecord(null); }}
        title={editingRecord ? 'Edit Weight Record' : 'Add Weight Record'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Animal"
            required
            options={[
              { value: '', label: 'Select animal...' },
              ...((animals as any[]) || []).map((a: any) => ({
                value: a.id,
                label: a.name,
              })),
            ]}
            value={formData.animal_id}
            onChange={(e) => setFormData(prev => ({ ...prev, animal_id: e.target.value }))}
          />

          <Input
            label="Date"
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Weight"
              type="number"
              step="0.1"
              required
              value={formData.weight}
              onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
            />
            <Select
              label="Unit"
              options={[
                { value: 'lbs', label: 'Pounds (lbs)' },
                { value: 'kg', label: 'Kilograms (kg)' },
              ]}
              value={formData.weight_unit}
              onChange={(e) => setFormData(prev => ({ ...prev, weight_unit: e.target.value }))}
            />
          </div>

          <Input
            label="Notes (optional)"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="e.g., Weighed before feeding"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setEditingRecord(null); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={addWeightMutation.isPending || updateWeightMutation.isPending}>
              {editingRecord ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Weigh-In Modal */}
      <Modal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Weigh-In"
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <Input
            label="Date"
            type="date"
            required
            value={bulkDate}
            onChange={(e) => setBulkDate(e.target.value)}
          />

          <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
            {((animals as any[]) || []).map((animal: any) => (
              <div key={animal.id} className="flex items-center gap-4 p-3">
                <div className="flex-1">
                  <p className="font-medium">{animal.name}</p>
                  <p className="text-sm text-gray-500">{animal.category.replace('_', ' ')}</p>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="lbs"
                    value={bulkWeights[animal.id] || ''}
                    onChange={(e) => setBulkWeights(prev => ({
                      ...prev,
                      [animal.id]: e.target.value,
                    }))}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-500">
            {Object.values(bulkWeights).filter(w => w && parseFloat(w) > 0).length} animals with weights entered
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowBulkModal(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={bulkAddMutation.isPending || Object.values(bulkWeights).filter(w => w && parseFloat(w) > 0).length === 0}
            >
              Save All
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
