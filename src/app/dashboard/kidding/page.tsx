'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  Badge,
  EmptyState,
  LoadingSpinner,
  AnimalLink,
} from '@/components/ui';
import { formatDate, calculateAge } from '@/lib/utils';
import {
  Baby,
  Plus,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Scale,
  Heart,
  Edit,
  Trash2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

interface BreedingRecord {
  id: string;
  doe_id: string;
  buck_id: string | null;
  breeding_date: string;
  due_date: string | null;
  status: string;
  kidding_date: string | null;
  number_of_kids: number | null;
  kidding_notes: string | null;
  labor_duration: string | null;
  assistance_required: boolean;
  assistance_notes: string | null;
  doe?: { id: string; name: string; breed: string | null };
  buck?: { id: string; name: string; breed: string | null };
}

interface KidRecord {
  id: string;
  breeding_record_id: string;
  animal_id: string | null;
  name: string;
  sex: string;
  birth_weight: number | null;
  birth_weight_unit: string;
  birth_order: number | null;
  presentation: string | null;
  vigor_score: number | null;
  colostrum_time: string | null;
  retained: boolean;
  notes: string | null;
  animal?: { id: string; name: string };
}

const statusColors: Record<string, string> = {
  bred: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed_pregnant: 'bg-purple-100 text-purple-700',
  kidded: 'bg-green-100 text-green-700',
  open: 'bg-red-100 text-red-700',
  aborted: 'bg-red-100 text-red-700',
};

const presentationOptions = [
  { value: 'normal', label: 'Normal (anterior)' },
  { value: 'posterior', label: 'Posterior (backwards)' },
  { value: 'breech', label: 'Breech' },
  { value: 'transverse', label: 'Transverse' },
  { value: 'head_back', label: 'Head back' },
  { value: 'leg_back', label: 'Leg(s) back' },
];

export default function KiddingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'kids'>('upcoming');
  const [showKiddingModal, setShowKiddingModal] = useState(false);
  const [showKidModal, setShowKidModal] = useState(false);
  const [selectedBreeding, setSelectedBreeding] = useState<BreedingRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Kidding form state
  const [kiddingForm, setKiddingForm] = useState({
    kidding_date: new Date().toISOString().split('T')[0],
    number_of_kids: 1,
    labor_duration: '',
    assistance_required: false,
    assistance_notes: '',
    kidding_notes: '',
  });

  // Kid form state
  const [kidForm, setKidForm] = useState({
    name: '',
    sex: 'doe',
    birth_weight: '',
    birth_weight_unit: 'lbs',
    birth_order: 1,
    presentation: 'normal',
    vigor_score: 5,
    colostrum_time: '',
    retained: true,
    notes: '',
    create_animal: true,
  });

  // Fetch breeding records
  const { data: breedingRecords, isLoading: breedingLoading } = useQuery({
    queryKey: ['breeding_records_with_details'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('breeding_records')
        .select(`
          *,
          doe:animals!breeding_records_doe_id_fkey(id, name, breed),
          buck:animals!breeding_records_buck_id_fkey(id, name, breed)
        `)
        .eq('user_id', user!.id)
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as BreedingRecord[];
    },
    enabled: !!user,
  });

  // Fetch kid records
  const { data: kidRecords, isLoading: kidsLoading } = useQuery({
    queryKey: ['kid_records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kid_records')
        .select(`
          *,
          animal:animals(id, name)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as KidRecord[];
    },
    enabled: !!user,
  });

  // Fetch animals for creating new animal records
  const { data: animals } = useQuery({
    queryKey: ['animals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Update breeding record with kidding info
  const updateKidding = useMutation({
  mutationFn: async (params: { id: string; kidding_date: string; number_of_kids: number; labor_duration: string | null; assistance_required: boolean; assistance_notes: string | null; kidding_notes: string | null }) => {
    const { data, error } = await (supabase
      .from('breeding_records') as any)
      .update({
        kidding_date: params.kidding_date,
        number_of_kids: params.number_of_kids,
        labor_duration: params.labor_duration,
        assistance_required: params.assistance_required,
        assistance_notes: params.assistance_notes,
        kidding_notes: params.kidding_notes,
        status: 'kidded',
      })
      .eq('id', params.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breeding_records_with_details'] });
      setShowKiddingModal(false);
      setSelectedBreeding(null);
    },
  });

  // Create kid record and optionally animal
  const createKid = useMutation({
    mutationFn: async (data: {
      breeding_record_id: string;
      dam_id: string;
      sire_id: string | null;
      kidForm: typeof kidForm;
    }) => {
      let animalId = null;

      // Create animal record if requested
      if (data.kidForm.create_animal) {
        const dam = (animals as any)?.find((a: any) => a.id === data.dam_id);
        const { data: newAnimal, error: animalError } = await (supabase as any)
          .from('animals')
          .insert({
            user_id: user!.id,
            name: data.kidForm.name,
            sex: data.kidForm.sex,
            category: data.kidForm.sex === 'doe' ? 'doeling' : 'buckling',
            breed: dam?.breed || null,
            birth_date: selectedBreeding?.kidding_date || new Date().toISOString().split('T')[0],
            dam_id: data.dam_id,
            sire_id: data.sire_id,
            status: data.kidForm.retained ? 'active' : 'sold',
            notes: data.kidForm.notes || null,
          })
          .select()
          .single();
        if (animalError) throw animalError;
        animalId = newAnimal.id;
      }

      // Create kid record
      const { data: kidRecord, error: kidError } = await (supabase as any)
        .from('kid_records')
        .insert({
          user_id: user!.id,
          breeding_record_id: data.breeding_record_id,
          animal_id: animalId,
          name: data.kidForm.name,
          sex: data.kidForm.sex,
          birth_weight: data.kidForm.birth_weight ? parseFloat(data.kidForm.birth_weight) : null,
          birth_weight_unit: data.kidForm.birth_weight_unit,
          birth_order: data.kidForm.birth_order,
          presentation: data.kidForm.presentation,
          vigor_score: data.kidForm.vigor_score,
          colostrum_time: data.kidForm.colostrum_time || null,
          retained: data.kidForm.retained,
          notes: data.kidForm.notes || null,
        })
        .select()
        .single();
      if (kidError) throw kidError;

      return kidRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kid_records'] });
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      setShowKidModal(false);
      resetKidForm();
    },
  });

  const resetKidForm = () => {
    setKidForm({
      name: '',
      sex: 'doe',
      birth_weight: '',
      birth_weight_unit: 'lbs',
      birth_order: (kidRecords?.filter(k => k.breeding_record_id === selectedBreeding?.id).length || 0) + 1,
      presentation: 'normal',
      vigor_score: 5,
      colostrum_time: '',
      retained: true,
      notes: '',
      create_animal: true,
    });
  };

  const handleRecordKidding = () => {
    if (!selectedBreeding) return;
    updateKidding.mutate({
      id: selectedBreeding.id,
      kidding_date: kiddingForm.kidding_date,
      number_of_kids: kiddingForm.number_of_kids,
      labor_duration: kiddingForm.labor_duration || null,
      assistance_required: kiddingForm.assistance_required,
      assistance_notes: kiddingForm.assistance_notes || null,
      kidding_notes: kiddingForm.kidding_notes || null,
    });
  };

  const handleAddKid = () => {
    if (!selectedBreeding || !kidForm.name) return;
    createKid.mutate({
      breeding_record_id: selectedBreeding.id,
      dam_id: selectedBreeding.doe_id,
      sire_id: selectedBreeding.buck_id,
      kidForm,
    });
  };

  // Filter records
  const upcomingDues = breedingRecords?.filter(r => 
    r.status === 'confirmed_pregnant' || r.status === 'bred' || r.status === 'pending'
  ).sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  }) || [];

  const kiddingHistory = breedingRecords?.filter(r => 
    statusFilter === 'all' ? r.status === 'kidded' : r.status === statusFilter
  ) || [];

  // Calculate days until due
  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kidding Management</h1>
          <p className="text-gray-500">Track pregnancies, births, and kids</p>
        </div>
        <Link href="/dashboard/breeding">
          <Button variant="secondary" leftIcon={<Plus className="h-4 w-4" />}>
            New Breeding
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="text-center">
          <p className="text-sm text-gray-500">Due This Month</p>
          <p className="text-2xl font-semibold text-purple-600">
            {upcomingDues.filter(r => {
              const days = getDaysUntilDue(r.due_date);
              return days !== null && days >= 0 && days <= 30;
            }).length}
          </p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-sm text-gray-500">Confirmed Pregnant</p>
          <p className="text-2xl font-semibold text-blue-600">
            {breedingRecords?.filter(r => r.status === 'confirmed_pregnant' || r.status === 'confirmed').length || 0}
          </p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-sm text-gray-500">Kidded This Year</p>
          <p className="text-2xl font-semibold text-green-600">
            {breedingRecords?.filter(r => {
              if (r.status !== 'kidded' || !r.kidding_date) return false;
              return new Date(r.kidding_date).getFullYear() === new Date().getFullYear();
            }).length || 0}
          </p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-sm text-gray-500">Kids Born This Year</p>
          <p className="text-2xl font-semibold text-cyan-600">
            {breedingRecords?.filter(r => {
              if (r.status !== 'kidded' || !r.kidding_date) return false;
              return new Date(r.kidding_date).getFullYear() === new Date().getFullYear();
            }).reduce((sum, r) => sum + (r.number_of_kids || 0), 0) || 0}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 -mb-px">
          {[
            { id: 'upcoming', label: 'Upcoming Due Dates', icon: Calendar },
            { id: 'history', label: 'Kidding History', icon: CheckCircle },
            { id: 'kids', label: 'Kid Records', icon: Baby },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {breedingLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : upcomingDues.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Calendar className="h-12 w-12" />}
                title="No upcoming due dates"
                description="Add breeding records to track pregnancies"
                action={
                  <Link href="/dashboard/breeding">
                    <Button>Add Breeding</Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingDues.map(record => {
                const daysUntil = getDaysUntilDue(record.due_date);
                const isOverdue = daysUntil !== null && daysUntil < 0;
                const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7;

                return (
                  <Card key={record.id} className={`p-4 ${isOverdue ? 'border-red-300 bg-red-50' : isDueSoon ? 'border-yellow-300 bg-yellow-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isOverdue ? 'bg-red-200 text-red-700' : 
                          isDueSoon ? 'bg-yellow-200 text-yellow-700' : 
                          'bg-purple-100 text-purple-700'
                        }`}>
                          <Baby className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {record.doe ? (
                              <AnimalLink 
                                animalId={record.doe_id} 
                                name={record.doe.name}
                                variant="bold"
                              />
                            ) : (
                              'Unknown Doe'
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Bred to {record.buck ? (
                              <AnimalLink 
                                animalId={record.buck_id!} 
                                name={record.buck.name}
                                variant="subtle"
                              />
                            ) : (
                              'Unknown'
                            )} on {formatDate(record.breeding_date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {record.due_date && (
                            <>
                              <p className="font-medium">
                                {isOverdue ? (
                                  <span className="text-red-600">Overdue by {Math.abs(daysUntil!)} days</span>
                                ) : (
                                  <span className={isDueSoon ? 'text-yellow-600' : ''}>
                                    {daysUntil} days until due
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-gray-500">Due: {formatDate(record.due_date)}</p>
                            </>
                          )}
                        </div>
                        <Badge className={statusColors[record.status] || 'bg-gray-100'}>
                          {record.status.replace('_', ' ')}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedBreeding(record);
                            setKiddingForm({
                              kidding_date: new Date().toISOString().split('T')[0],
                              number_of_kids: 1,
                              labor_duration: '',
                              assistance_required: false,
                              assistance_notes: '',
                              kidding_notes: '',
                            });
                            setShowKiddingModal(true);
                          }}
                        >
                          Record Kidding
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Select
              options={[
                { value: 'all', label: 'All Kiddings' },
                { value: 'kidded', label: 'Successful' },
                { value: 'aborted', label: 'Aborted' },
                { value: 'open', label: 'Open (not pregnant)' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            />
          </div>

          {kiddingHistory.length === 0 ? (
            <Card>
              <EmptyState
                icon={<CheckCircle className="h-12 w-12" />}
                title="No kidding history"
                description="Recorded kiddings will appear here"
              />
            </Card>
          ) : (
            <Card padding="none">
              <div className="divide-y">
                {kiddingHistory.map(record => (
                  <div key={record.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {record.doe ? (
                          <AnimalLink 
                            animalId={record.doe_id} 
                            name={record.doe.name}
                            variant="bold"
                          />
                        ) : (
                          <span className="font-semibold text-gray-500">Unknown</span>
                        )}
                        <Badge className={statusColors[record.status]}>
                          {record.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {record.kidding_date && formatDate(record.kidding_date)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Sire:</span>{' '}
                        {record.buck ? (
                          <AnimalLink 
                            animalId={record.buck_id!} 
                            name={record.buck.name}
                            variant="subtle"
                          />
                        ) : (
                          <span className="font-medium">Unknown</span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-500">Kids:</span>{' '}
                        <span className="font-medium">{record.number_of_kids || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Labor:</span>{' '}
                        <span className="font-medium">{record.labor_duration || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Assistance:</span>{' '}
                        <span className={`font-medium ${record.assistance_required ? 'text-yellow-600' : 'text-green-600'}`}>
                          {record.assistance_required ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    {record.kidding_notes && (
                      <p className="text-sm text-gray-500 mt-2">{record.kidding_notes}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedBreeding(record);
                          resetKidForm();
                          setShowKidModal(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Kid Record
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'kids' && (
        <div>
          {kidsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : !kidRecords?.length ? (
            <Card>
              <EmptyState
                icon={<Baby className="h-12 w-12" />}
                title="No kid records"
                description="Add kid records when does give birth"
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kidRecords.map(kid => (
                <Card key={kid.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{kid.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{kid.sex}</p>
                    </div>
                    <Badge className={kid.retained ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                      {kid.retained ? 'Retained' : 'Sold/Placed'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    {kid.birth_weight && (
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-gray-400" />
                        <span>{kid.birth_weight} {kid.birth_weight_unit}</span>
                      </div>
                    )}
                    {kid.vigor_score && (
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-gray-400" />
                        <span>Vigor: {kid.vigor_score}/10</span>
                      </div>
                    )}
                    {kid.presentation && kid.presentation !== 'normal' && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="capitalize">{kid.presentation.replace('_', ' ')}</span>
                      </div>
                    )}
                  </div>
                  {kid.animal_id && kid.animal && (
                    <div className="mt-3">
                      <AnimalLink 
                        animalId={kid.animal_id} 
                        name={kid.animal.name}
                        variant="subtle"
                      />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Record Kidding Modal */}
      <Modal
        open={showKiddingModal}
        onClose={() => {
          setShowKiddingModal(false);
          setSelectedBreeding(null);
        }}
        title={`Record Kidding - ${selectedBreeding?.doe?.name}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowKiddingModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordKidding} loading={updateKidding.isPending}>
              Save Kidding
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Kidding Date"
            type="date"
            value={kiddingForm.kidding_date}
            onChange={(e) => setKiddingForm({ ...kiddingForm, kidding_date: e.target.value })}
            required
          />
          <Input
            label="Number of Kids"
            type="number"
            min="0"
            max="6"
            value={kiddingForm.number_of_kids}
            onChange={(e) => setKiddingForm({ ...kiddingForm, number_of_kids: parseInt(e.target.value) || 0 })}
            required
          />
          <Input
            label="Labor Duration"
            value={kiddingForm.labor_duration}
            onChange={(e) => setKiddingForm({ ...kiddingForm, labor_duration: e.target.value })}
            placeholder="e.g., 2 hours, 30 minutes"
          />
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="assistance"
              checked={kiddingForm.assistance_required}
              onChange={(e) => setKiddingForm({ ...kiddingForm, assistance_required: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="assistance" className="text-sm font-medium text-gray-700">
              Assistance Required
            </label>
          </div>
          {kiddingForm.assistance_required && (
            <Input
              label="Assistance Notes"
              value={kiddingForm.assistance_notes}
              onChange={(e) => setKiddingForm({ ...kiddingForm, assistance_notes: e.target.value })}
              placeholder="Describe assistance provided..."
            />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kidding Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              value={kiddingForm.kidding_notes}
              onChange={(e) => setKiddingForm({ ...kiddingForm, kidding_notes: e.target.value })}
              placeholder="Any additional notes about the birth..."
            />
          </div>
          <p className="text-sm text-gray-500">
            After saving, you can add individual kid records with weights and details.
          </p>
        </div>
      </Modal>

      {/* Add Kid Modal */}
      <Modal
        open={showKidModal}
        onClose={() => {
          setShowKidModal(false);
        }}
        title={`Add Kid - ${selectedBreeding?.doe?.name}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowKidModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddKid} loading={createKid.isPending}>
              Add Kid
            </Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <Input
            label="Name"
            value={kidForm.name}
            onChange={(e) => setKidForm({ ...kidForm, name: e.target.value })}
            placeholder="e.g., Daisy's Doeling #1"
            required
          />
          <Select
            label="Sex"
            options={[
              { value: 'doe', label: 'Doe (Doeling)' },
              { value: 'buck', label: 'Buck (Buckling)' },
            ]}
            value={kidForm.sex}
            onChange={(e) => setKidForm({ ...kidForm, sex: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Birth Weight"
              type="number"
              step="0.1"
              value={kidForm.birth_weight}
              onChange={(e) => setKidForm({ ...kidForm, birth_weight: e.target.value })}
              placeholder="e.g., 3.5"
            />
            <Select
              label="Unit"
              options={[
                { value: 'lbs', label: 'Pounds' },
                { value: 'kg', label: 'Kilograms' },
                { value: 'oz', label: 'Ounces' },
              ]}
              value={kidForm.birth_weight_unit}
              onChange={(e) => setKidForm({ ...kidForm, birth_weight_unit: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Birth Order"
              type="number"
              min="1"
              max="6"
              value={kidForm.birth_order}
              onChange={(e) => setKidForm({ ...kidForm, birth_order: parseInt(e.target.value) || 1 })}
            />
            <Select
              label="Presentation"
              options={presentationOptions}
              value={kidForm.presentation}
              onChange={(e) => setKidForm({ ...kidForm, presentation: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vigor Score (1-10)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={kidForm.vigor_score}
              onChange={(e) => setKidForm({ ...kidForm, vigor_score: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Weak (1)</span>
              <span className="font-medium">{kidForm.vigor_score}</span>
              <span>Strong (10)</span>
            </div>
          </div>
          <Input
            label="First Colostrum Time"
            type="time"
            value={kidForm.colostrum_time}
            onChange={(e) => setKidForm({ ...kidForm, colostrum_time: e.target.value })}
          />
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="retained"
              checked={kidForm.retained}
              onChange={(e) => setKidForm({ ...kidForm, retained: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="retained" className="text-sm font-medium text-gray-700">
              Retained in Herd
            </label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="create_animal"
              checked={kidForm.create_animal}
              onChange={(e) => setKidForm({ ...kidForm, create_animal: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="create_animal" className="text-sm font-medium text-gray-700">
              Create Animal Record (with lineage)
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={2}
              value={kidForm.notes}
              onChange={(e) => setKidForm({ ...kidForm, notes: e.target.value })}
              placeholder="Any notes about this kid..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
