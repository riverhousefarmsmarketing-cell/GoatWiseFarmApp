'use client';

import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  StatCard,
  Badge,
  EmptyState,
  LoadingSpinner,
  AnimalLink,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import {
  Baby,
  Plus,
  Calendar,
  Heart,
  Clock,
  AlertTriangle,
  ClipboardList,
  Trash2,
  Edit,
  Printer,
  FileText,
  CheckCircle,
  X,
} from 'lucide-react';
import { addDays, subDays, format, differenceInDays } from 'date-fns';
import Link from 'next/link';

const GESTATION_DAYS_STANDARD = 150;
const GESTATION_DAYS_MINI = 145;

interface BreedingRecord {
  id: string;
  doe_id: string;
  buck_id: string | null;
  breeding_date: string;
  due_date: string | null;
  status: string;
  breeding_method: string | null;
  notes: string | null;
  kidding_date: string | null;
  number_of_kids: number | null;
  kidding_notes: string | null;
  doe?: { id: string; name: string; breed?: string };
  buck?: { id: string; name: string };
}

const statusColors: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700',
  bred: 'bg-blue-100 text-blue-700',
  confirmed_pregnant: 'bg-purple-100 text-purple-700',
  kidded: 'bg-green-100 text-green-700',
  open: 'bg-gray-100 text-gray-700',
  aborted: 'bg-red-100 text-red-700',
};

export default function BreedingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();
  const printRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'pregnant' | 'planner' | 'history'>('pregnant');
  const [showBreedingModal, setShowBreedingModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showKiddingModal, setShowKiddingModal] = useState(false);
  const [kidWarnings, setKidWarnings] = useState<string[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<BreedingRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<BreedingRecord | null>(null);

  // Form states
  const [breedingForm, setBreedingForm] = useState({
    doe_id: '',
    buck_id: '',
    breeding_date: format(new Date(), 'yyyy-MM-dd'),
    breeding_method: 'natural',
    gestation_days: '150',
    notes: '',
  });

  const [planForm, setPlanForm] = useState({
    doe_id: '',
    buck_id: '',
    target_kidding_date: '',
    gestation_days: '150',
    notes: '',
  });

  const [kiddingForm, setKiddingForm] = useState({
    kidding_date: format(new Date(), 'yyyy-MM-dd'),
    kids: [
      { name: '', sex: 'doe', status: 'alive', birth_weight: '', vigor: 'strong', notes: '' },
    ] as Array<{ name: string; sex: string; status: string; birth_weight: string; vigor: string; notes: string }>,
    labor_ease: 'normal',
    assistance_required: false,
    notes: '',
  });

  // Fetch breeding records
  const { data: breedingRecords, isLoading } = useQuery({
    queryKey: ['breeding_records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('breeding_records')
        .select(`
          *,
          doe:animals!breeding_records_doe_id_fkey(id, name, breed),
          buck:animals!breeding_records_buck_id_fkey(id, name)
        `)
        .eq('user_id', user!.id)
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as BreedingRecord[];
    },
    enabled: !!user,
  });

  // Fetch animals
  const { data: animals } = useQuery({
    queryKey: ['animals_for_breeding'],
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

  const does = useMemo(() => 
    (animals as any[])?.filter(a => a.sex === 'doe' || ['milking_doe', 'dry_doe', 'doeling', 'bred_doe'].includes(a.category)) || [],
    [animals]
  );
  
  const bucks = useMemo(() => 
    (animals as any[])?.filter(a => a.sex === 'buck' || ['buck', 'buckling'].includes(a.category)) || [],
    [animals]
  );

  // Mutations
  const createBreeding = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await (supabase.from('breeding_records') as any)
        .insert({ ...data, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breeding_records'] });
      setShowBreedingModal(false);
      setShowPlanModal(false);
      resetForms();
    },
  });

  const updateBreeding = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase.from('breeding_records') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breeding_records'] });
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      setShowKiddingModal(false);
      setSelectedRecord(null);
      setEditingRecord(null);
    },
  });

  const deleteBreeding = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('breeding_records') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breeding_records'] });
    },
  });

  // Create animal records for kids
  const createKidAnimals = async (
    kids: Array<{ name: string; sex: string; status: string; birth_weight: string; vigor: string; notes: string }>,
    damId: string,
    sireId: string | null,
    birthDate: string,
    damBreed?: string
  ): Promise<{ createdCount: number; failures: string[] }> => {
    // Filter kids that should create animal records (alive, with or without name)
    const kidsToCreate = kids.filter(k => k.status === 'alive');
    let createdCount = 0;
    // Collected so the caller can tell the user. These failures used to go to
    // console.error only, which is how a hard schema error (date_of_birth) went
    // unnoticed for months: every kid silently failed while the UI reported the
    // kidding as saved.
    const failures: string[] = [];

    for (let i = 0; i < kidsToCreate.length; i++) {
      const kid = kidsToCreate[i];
      // Generate name if not provided
      const kidName = kid.name || `Kid ${i + 1} (${birthDate})`;
      
      // Build notes with health info
      const healthNotes = [
        kid.birth_weight ? `Birth weight: ${kid.birth_weight} lbs` : null,
        kid.vigor ? `Vigor at birth: ${kid.vigor}` : null,
        kid.notes || null,
      ].filter(Boolean).join('. ');
      
      try {
        const { data, error } = await (supabase.from('animals') as any).insert({
          user_id: user!.id,
          name: kidName,
          sex: kid.sex,
          category: kid.sex === 'doe' ? 'doeling' : 'buckling',
          breed: damBreed || null,
          date_of_birth: birthDate,
          dam_id: damId,
          sire_id: sireId,
          status: 'active',
          born_on_farm: true,
          notes: healthNotes || null,
        }).select().single();
        
        if (error) {
          console.error('Error creating kid animal:', error);
          failures.push(`${kidName}: ${error.message}`);
        } else {
          createdCount++;

          // If birth weight provided, create a weight record
          if (kid.birth_weight && data?.id) {
            // Column is weight_unit, not unit.
            const { error: weightError } = await (supabase.from('weight_records') as any).insert({
              user_id: user!.id,
              animal_id: data.id,
              weight: parseFloat(kid.birth_weight),
              weight_unit: 'lbs',
              date: birthDate,
              notes: 'Birth weight',
            });
            if (weightError) {
              console.error('Error creating birth weight record:', weightError);
              failures.push(`${kidName} birth weight: ${weightError.message}`);
            }
          }
        }
      } catch (err: any) {
        console.error('Exception creating kid animal:', err);
        failures.push(`${kidName}: ${err?.message ?? 'unexpected error'}`);
      }
    }

    return { createdCount, failures };
  };

  const resetForms = () => {
    setBreedingForm({
      doe_id: '',
      buck_id: '',
      breeding_date: format(new Date(), 'yyyy-MM-dd'),
      breeding_method: 'natural',
      gestation_days: '150',
      notes: '',
    });
    setPlanForm({
      doe_id: '',
      buck_id: '',
      target_kidding_date: '',
      gestation_days: '150',
      notes: '',
    });
    setKiddingForm({
      kidding_date: format(new Date(), 'yyyy-MM-dd'),
      kids: [{ name: '', sex: 'doe', status: 'alive', birth_weight: '', vigor: 'strong', notes: '' }],
      labor_ease: 'normal',
      assistance_required: false,
      notes: '',
    });
  };

  // Filtered lists
  const pregnantDoes = useMemo(() => 
    breedingRecords?.filter(r => r.status === 'bred' || r.status === 'confirmed_pregnant')
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }) || [],
    [breedingRecords]
  );

  const plannedBreedings = useMemo(() => 
    breedingRecords?.filter(r => r.status === 'planned')
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }) || [],
    [breedingRecords]
  );

  const kiddingHistory = useMemo(() => 
    breedingRecords?.filter(r => r.status === 'kidded')
      .sort((a, b) => {
        if (!a.kidding_date) return 1;
        if (!b.kidding_date) return -1;
        return new Date(b.kidding_date).getTime() - new Date(a.kidding_date).getTime();
      }) || [],
    [breedingRecords]
  );

  // Stats
  const stats = useMemo(() => {
    const thisYear = new Date().getFullYear();
    const kiddedThisYear = breedingRecords?.filter(r => {
      if (r.status !== 'kidded' || !r.kidding_date) return false;
      return new Date(r.kidding_date).getFullYear() === thisYear;
    }) || [];

    return {
      pregnant: pregnantDoes.length,
      planned: plannedBreedings.length,
      kiddedThisYear: kiddedThisYear.length,
      kidsBornThisYear: kiddedThisYear.reduce((sum, r) => sum + (r.number_of_kids || 0), 0),
    };
  }, [breedingRecords, pregnantDoes, plannedBreedings]);

  // Handlers
  const handleRecordBreeding = async () => {
    if (!breedingForm.doe_id) return;
    
    const dueDate = format(
      addDays(new Date(breedingForm.breeding_date), parseInt(breedingForm.gestation_days)),
      'yyyy-MM-dd'
    );

    await createBreeding.mutateAsync({
      doe_id: breedingForm.doe_id,
      buck_id: breedingForm.buck_id || null,
      breeding_date: breedingForm.breeding_date,
      due_date: dueDate,
      breeding_method: breedingForm.breeding_method,
      notes: breedingForm.notes || null,
      status: 'bred',
    });
  };

  const handleCreatePlan = async () => {
    if (!planForm.doe_id || !planForm.target_kidding_date) return;
    
    const breedingDate = format(
      subDays(new Date(planForm.target_kidding_date), parseInt(planForm.gestation_days)),
      'yyyy-MM-dd'
    );

    await createBreeding.mutateAsync({
      doe_id: planForm.doe_id,
      buck_id: planForm.buck_id || null,
      breeding_date: breedingDate,
      due_date: planForm.target_kidding_date,
      notes: planForm.notes || null,
      status: 'planned',
    });
  };

  const handleRecordKidding = async () => {
    if (!selectedRecord) return;

    // Count kids
    const aliveKids = kiddingForm.kids.filter(k => k.status === 'alive').length;
    const totalKids = kiddingForm.kids.length;

    // Create animal records for live kids
    const { failures } = await createKidAnimals(
      kiddingForm.kids,
      selectedRecord.doe_id,
      selectedRecord.buck_id,
      kiddingForm.kidding_date,
      selectedRecord.doe?.breed
    );
    setKidWarnings(failures);

    // Build comprehensive kidding notes
    const laborNotes = [
      `Labor: ${kiddingForm.labor_ease}`,
      kiddingForm.assistance_required ? 'Assistance required' : null,
      kiddingForm.notes || null,
    ].filter(Boolean).join('. ');

    // Update breeding record
    await updateBreeding.mutateAsync({
      id: selectedRecord.id,
      status: 'kidded',
      kidding_date: kiddingForm.kidding_date,
      number_of_kids: totalKids,
      assistance_required: kiddingForm.assistance_required,
      labor_duration: kiddingForm.labor_ease, // Using this field for labor ease
      kidding_notes: laborNotes || null,
    });

    // Refresh animals list
    queryClient.invalidateQueries({ queryKey: ['animals'] });
    queryClient.invalidateQueries({ queryKey: ['animals_for_breeding'] });
  };

  const addKidRow = () => {
    setKiddingForm(prev => ({
      ...prev,
      kids: [...prev.kids, { name: '', sex: 'doe', status: 'alive', birth_weight: '', vigor: 'strong', notes: '' }],
    }));
  };

  const removeKidRow = (index: number) => {
    setKiddingForm(prev => ({
      ...prev,
      kids: prev.kids.filter((_, i) => i !== index),
    }));
  };

  const updateKid = (index: number, field: string, value: string) => {
    setKiddingForm(prev => ({
      ...prev,
      kids: prev.kids.map((k, i) => i === index ? { ...k, [field]: value } : k),
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const openKiddingModal = (record: BreedingRecord) => {
    setSelectedRecord(record);
    setKiddingForm({
      kidding_date: format(new Date(), 'yyyy-MM-dd'),
      kids: [{ name: '', sex: 'doe', status: 'alive', birth_weight: '', vigor: 'strong', notes: '' }],
      labor_ease: 'normal',
      assistance_required: false,
      notes: '',
    });
    setShowKiddingModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Kid-creation failures. The kidding record itself saves via a separate
          mutation that closes the modal, so a failure here has to surface at
          page level or it is invisible -- which is exactly what happened. */}
      {kidWarnings.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 print:hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-900">
                The kidding was saved, but {kidWarnings.length} kid record
                {kidWarnings.length === 1 ? '' : 's'} could not be created:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-800 list-disc list-inside">
                {kidWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setKidWarnings([])}
              className="text-amber-700 hover:text-amber-900 text-sm font-medium shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Breeding & Kidding</h1>
          <p className="text-gray-500">Track breedings, pregnancies, and births</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary"
            leftIcon={<ClipboardList className="h-4 w-4" />} 
            onClick={() => { resetForms(); setShowPlanModal(true); }}
          >
            Plan Breeding
          </Button>
          <Button 
            leftIcon={<Plus className="h-4 w-4" />} 
            onClick={() => { resetForms(); setShowBreedingModal(true); }}
          >
            Record Breeding
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
        <StatCard title="Currently Pregnant" value={stats.pregnant} icon={<Heart className="h-5 w-5" />} />
        <StatCard title="Planned Breedings" value={stats.planned} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard title="Kiddings This Year" value={stats.kiddedThisYear} icon={<Baby className="h-5 w-5" />} />
        <StatCard title="Kids Born This Year" value={stats.kidsBornThisYear} icon={<Baby className="h-5 w-5" />} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 print:hidden">
        <nav className="flex gap-4">
          {[
            { id: 'pregnant', label: `Pregnant Does (${stats.pregnant})`, icon: Heart },
            { id: 'planner', label: `Breeding Plans (${stats.planned})`, icon: ClipboardList },
            { id: 'history', label: 'Kidding History', icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* PREGNANT DOES TAB */}
      {activeTab === 'pregnant' && (
        <div className="space-y-4">
          {/* Print Button */}
          <div className="flex justify-end print:hidden">
            <Button variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
              Print Due Date List
            </Button>
          </div>

          {/* Printable Header */}
          <div className="hidden print:block mb-4">
            <h1 className="text-xl font-bold">Due Date List</h1>
            <p className="text-sm text-gray-500">Generated {format(new Date(), 'MMMM d, yyyy')}</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12 print:hidden">
              <LoadingSpinner />
            </div>
          ) : !pregnantDoes.length ? (
            <Card className="print:hidden">
              <EmptyState
                icon={<Heart className="h-12 w-12" />}
                title="No pregnant does"
                description="Record a breeding to start tracking pregnancies"
                action={<Button onClick={() => setShowBreedingModal(true)}>Record Breeding</Button>}
              />
            </Card>
          ) : (
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Doe</th>
                      <th className="px-4 py-3 font-medium">Sire</th>
                      <th className="px-4 py-3 font-medium">Bred Date</th>
                      <th className="px-4 py-3 font-medium">Due Date</th>
                      <th className="px-4 py-3 font-medium">Days Until Due</th>
                      <th className="px-4 py-3 font-medium print:hidden">Status</th>
                      <th className="px-4 py-3 font-medium print:hidden">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pregnantDoes.map((record) => {
                      const daysUntil = record.due_date 
                        ? differenceInDays(new Date(record.due_date), new Date())
                        : null;
                      const isOverdue = daysUntil !== null && daysUntil < 0;
                      const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7;

                      return (
                        <tr key={record.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-amber-50' : ''}`}>
                          <td className="px-4 py-3 font-medium">
                            <span className="print:hidden">
                              {record.doe ? (
                                <AnimalLink animalId={record.doe_id} name={record.doe.name} variant="bold" />
                              ) : 'Unknown'}
                            </span>
                            <span className="hidden print:inline">{record.doe?.name || 'Unknown'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="print:hidden">
                              {record.buck ? (
                                <AnimalLink animalId={record.buck_id!} name={record.buck.name} variant="subtle" />
                              ) : 'Unknown'}
                            </span>
                            <span className="hidden print:inline">{record.buck?.name || 'Unknown'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm">{formatDate(record.breeding_date)}</td>
                          <td className="px-4 py-3 text-sm font-medium">{record.due_date ? formatDate(record.due_date) : '—'}</td>
                          <td className="px-4 py-3">
                            {daysUntil !== null && (
                              <span className={`font-medium ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : ''}`}>
                                {isOverdue ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days`}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 print:hidden">
                            <Badge className={statusColors[record.status]}>{record.status}</Badge>
                          </td>
                          <td className="px-4 py-3 print:hidden">
                            <div className="flex gap-2">
                              {record.status === 'bred' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateBreeding.mutate({ id: record.id, status: 'confirmed_pregnant' })}
                                >
                                  Confirm
                                </Button>
                              )}
                              <Button size="sm" onClick={() => openKiddingModal(record)}>
                                Record Kidding
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateBreeding.mutate({ id: record.id, status: 'open' })}
                              >
                                Not Pregnant
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* PLANNER TAB */}
      {activeTab === 'planner' && (
        <div className="space-y-4">
          {/* Print Button */}
          <div className="flex justify-end print:hidden">
            <Button variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
              Print Breeding Plan
            </Button>
          </div>

          {/* Printable Header */}
          <div className="hidden print:block mb-4">
            <h1 className="text-xl font-bold">Breeding Plan</h1>
            <p className="text-sm text-gray-500">Generated {format(new Date(), 'MMMM d, yyyy')}</p>
          </div>

          {!plannedBreedings.length ? (
            <Card className="print:hidden">
              <EmptyState
                icon={<ClipboardList className="h-12 w-12" />}
                title="No breeding plans"
                description="Plan your breeding season by setting target kidding dates"
                action={<Button onClick={() => setShowPlanModal(true)}>Plan a Breeding</Button>}
              />
            </Card>
          ) : (
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Doe</th>
                      <th className="px-4 py-3 font-medium">Sire</th>
                      <th className="px-4 py-3 font-medium">Breed By</th>
                      <th className="px-4 py-3 font-medium">Target Kidding</th>
                      <th className="px-4 py-3 font-medium">Notes</th>
                      <th className="px-4 py-3 font-medium print:hidden">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {plannedBreedings.map((record) => {
                      const daysUntilBreed = differenceInDays(new Date(record.breeding_date), new Date());
                      const isOverdue = daysUntilBreed < 0;
                      const isSoon = daysUntilBreed >= 0 && daysUntilBreed <= 14;

                      return (
                        <tr key={record.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : isSoon ? 'bg-amber-50' : ''}`}>
                          <td className="px-4 py-3 font-medium">
                            <span className="print:hidden">
                              {record.doe ? (
                                <AnimalLink animalId={record.doe_id} name={record.doe.name} variant="bold" />
                              ) : 'Unknown'}
                            </span>
                            <span className="hidden print:inline">{record.doe?.name || 'Unknown'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="print:hidden">
                              {record.buck ? (
                                <AnimalLink animalId={record.buck_id!} name={record.buck.name} variant="subtle" />
                              ) : <span className="text-gray-400">TBD</span>}
                            </span>
                            <span className="hidden print:inline">{record.buck?.name || 'TBD'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={isOverdue ? 'text-red-600 font-medium' : isSoon ? 'text-amber-600 font-medium' : ''}>
                              {formatDate(record.breeding_date)}
                            </span>
                            {isOverdue && <span className="text-xs text-red-500 ml-1">(overdue)</span>}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">{record.due_date ? formatDate(record.due_date) : '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-48 truncate">{record.notes || '—'}</td>
                          <td className="px-4 py-3 print:hidden">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  updateBreeding.mutate({
                                    id: record.id,
                                    status: 'bred',
                                    breeding_date: format(new Date(), 'yyyy-MM-dd'),
                                  });
                                }}
                              >
                                Mark Bred
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Delete this breeding plan?')) {
                                    deleteBreeding.mutate(record.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-end print:hidden">
            <Button variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
              Print History
            </Button>
          </div>

          <div className="hidden print:block mb-4">
            <h1 className="text-xl font-bold">Kidding History</h1>
            <p className="text-sm text-gray-500">Generated {format(new Date(), 'MMMM d, yyyy')}</p>
          </div>

          {!kiddingHistory.length ? (
            <Card className="print:hidden">
              <EmptyState
                icon={<Clock className="h-12 w-12" />}
                title="No kidding history"
                description="Recorded kiddings will appear here"
              />
            </Card>
          ) : (
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Dam</th>
                      <th className="px-4 py-3 font-medium">Sire</th>
                      <th className="px-4 py-3 font-medium">Kidding Date</th>
                      <th className="px-4 py-3 font-medium"># Kids</th>
                      <th className="px-4 py-3 font-medium">Notes</th>
                      <th className="px-4 py-3 font-medium print:hidden">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {kiddingHistory.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">
                          <span className="print:hidden">
                            {record.doe ? (
                              <AnimalLink animalId={record.doe_id} name={record.doe.name} variant="bold" />
                            ) : 'Unknown'}
                          </span>
                          <span className="hidden print:inline">{record.doe?.name || 'Unknown'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="print:hidden">
                            {record.buck ? (
                              <AnimalLink animalId={record.buck_id!} name={record.buck.name} variant="subtle" />
                            ) : 'Unknown'}
                          </span>
                          <span className="hidden print:inline">{record.buck?.name || 'Unknown'}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">{record.kidding_date ? formatDate(record.kidding_date) : '—'}</td>
                        <td className="px-4 py-3 font-medium">{record.number_of_kids || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-48 truncate">{record.kidding_notes || '—'}</td>
                        <td className="px-4 py-3 print:hidden">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Delete this record?')) {
                                deleteBreeding.mutate(record.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* RECORD BREEDING MODAL */}
      <Modal
        open={showBreedingModal}
        onClose={() => setShowBreedingModal(false)}
        title="Record Breeding"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowBreedingModal(false)}>Cancel</Button>
            <Button onClick={handleRecordBreeding} loading={createBreeding.isPending}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Doe"
            required
            options={[{ value: '', label: 'Select doe...' }, ...does.map(a => ({ value: a.id, label: a.name }))]}
            value={breedingForm.doe_id}
            onChange={(e) => setBreedingForm(prev => ({ ...prev, doe_id: e.target.value }))}
          />
          <Select
            label="Buck"
            options={[{ value: '', label: 'Unknown' }, ...bucks.map(a => ({ value: a.id, label: a.name }))]}
            value={breedingForm.buck_id}
            onChange={(e) => setBreedingForm(prev => ({ ...prev, buck_id: e.target.value }))}
          />
          <Input
            label="Breeding Date"
            type="date"
            required
            value={breedingForm.breeding_date}
            onChange={(e) => setBreedingForm(prev => ({ ...prev, breeding_date: e.target.value }))}
          />
          <Select
            label="Gestation"
            options={[
              { value: '150', label: 'Standard (150 days)' },
              { value: '145', label: 'Mini (145 days)' },
            ]}
            value={breedingForm.gestation_days}
            onChange={(e) => setBreedingForm(prev => ({ ...prev, gestation_days: e.target.value }))}
          />
          {breedingForm.breeding_date && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <span className="font-medium text-blue-800">Due Date: </span>
              <span className="text-blue-700">
                {format(addDays(new Date(breedingForm.breeding_date), parseInt(breedingForm.gestation_days)), 'MMMM d, yyyy')}
              </span>
            </div>
          )}
          <Input
            label="Notes"
            value={breedingForm.notes}
            onChange={(e) => setBreedingForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Optional notes..."
          />
        </div>
      </Modal>

      {/* PLAN BREEDING MODAL */}
      <Modal
        open={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        title="Plan a Breeding"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowPlanModal(false)}>Cancel</Button>
            <Button onClick={handleCreatePlan} loading={createBreeding.isPending}>Save Plan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Doe"
            required
            options={[{ value: '', label: 'Select doe...' }, ...does.map(a => ({ value: a.id, label: a.name }))]}
            value={planForm.doe_id}
            onChange={(e) => setPlanForm(prev => ({ ...prev, doe_id: e.target.value }))}
          />
          <Select
            label="Buck (can decide later)"
            options={[{ value: '', label: 'To be determined' }, ...bucks.map(a => ({ value: a.id, label: a.name }))]}
            value={planForm.buck_id}
            onChange={(e) => setPlanForm(prev => ({ ...prev, buck_id: e.target.value }))}
          />
          <Input
            label="Target Kidding Date"
            type="date"
            required
            value={planForm.target_kidding_date}
            onChange={(e) => setPlanForm(prev => ({ ...prev, target_kidding_date: e.target.value }))}
          />
          <Select
            label="Gestation"
            options={[
              { value: '150', label: 'Standard (150 days)' },
              { value: '145', label: 'Mini (145 days)' },
            ]}
            value={planForm.gestation_days}
            onChange={(e) => setPlanForm(prev => ({ ...prev, gestation_days: e.target.value }))}
          />
          {planForm.target_kidding_date && (
            <div className="p-3 bg-green-50 rounded-lg text-sm">
              <span className="font-medium text-green-800">Breed By: </span>
              <span className="text-green-700">
                {format(subDays(new Date(planForm.target_kidding_date), parseInt(planForm.gestation_days)), 'MMMM d, yyyy')}
              </span>
            </div>
          )}
          <Input
            label="Breeding Goals / Notes"
            value={planForm.notes}
            onChange={(e) => setPlanForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="e.g., Improve milk production..."
          />
        </div>
      </Modal>

      {/* RECORD KIDDING MODAL */}
      <Modal
        open={showKiddingModal}
        onClose={() => { setShowKiddingModal(false); setSelectedRecord(null); }}
        title={`Record Kidding - ${selectedRecord?.doe?.name}`}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowKiddingModal(false)}>Cancel</Button>
            <Button onClick={handleRecordKidding} loading={updateBreeding.isPending}>
              Save Kidding & Create Kids
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Kidding Date"
            type="date"
            required
            value={kiddingForm.kidding_date}
            onChange={(e) => setKiddingForm(prev => ({ ...prev, kidding_date: e.target.value }))}
          />

          {/* Labor Info */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Labor Ease"
              options={[
                { value: 'easy', label: 'Easy - No assistance' },
                { value: 'normal', label: 'Normal' },
                { value: 'difficult', label: 'Difficult' },
                { value: 'assisted', label: 'Required assistance' },
                { value: 'vet', label: 'Veterinary intervention' },
              ]}
              value={kiddingForm.labor_ease}
              onChange={(e) => setKiddingForm(prev => ({ ...prev, labor_ease: e.target.value }))}
            />
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={kiddingForm.assistance_required}
                  onChange={(e) => setKiddingForm(prev => ({ ...prev, assistance_required: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Assistance Required</span>
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Kids Born</label>
              <Button size="sm" variant="secondary" onClick={addKidRow} leftIcon={<Plus className="h-3 w-3" />}>
                Add Kid
              </Button>
            </div>
            
            <div className="space-y-3 border rounded-lg p-3 bg-gray-50">
              {kiddingForm.kids.map((kid, index) => (
                <div key={index} className="p-3 bg-white rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Kid #{index + 1}</span>
                    {kiddingForm.kids.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => removeKidRow(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Row 1: Name, Sex, Status */}
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Name (optional)"
                      value={kid.name}
                      onChange={(e) => updateKid(index, 'name', e.target.value)}
                    />
                    <Select
                      options={[
                        { value: 'doe', label: 'Doeling' },
                        { value: 'buck', label: 'Buckling' },
                      ]}
                      value={kid.sex}
                      onChange={(e) => updateKid(index, 'sex', e.target.value)}
                    />
                    <Select
                      options={[
                        { value: 'alive', label: 'Alive' },
                        { value: 'stillborn', label: 'Stillborn' },
                        { value: 'deceased', label: 'Died' },
                      ]}
                      value={kid.status}
                      onChange={(e) => updateKid(index, 'status', e.target.value)}
                    />
                  </div>
                  
                  {/* Row 2: Weight, Vigor */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Input
                        placeholder="Birth weight"
                        type="number"
                        step="0.1"
                        value={kid.birth_weight}
                        onChange={(e) => updateKid(index, 'birth_weight', e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">lbs</span>
                    </div>
                    <Select
                      options={[
                        { value: 'strong', label: 'Strong - stood quickly' },
                        { value: 'normal', label: 'Normal' },
                        { value: 'weak', label: 'Weak - slow to stand' },
                        { value: 'critical', label: 'Critical - needed help' },
                      ]}
                      value={kid.vigor}
                      onChange={(e) => updateKid(index, 'vigor', e.target.value)}
                    />
                  </div>
                  
                  {/* Row 3: Notes */}
                  <Input
                    placeholder="Notes (coloring, markings, concerns...)"
                    value={kid.notes}
                    onChange={(e) => updateKid(index, 'notes', e.target.value)}
                  />
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-2">
                Kids marked as "Alive" will be automatically added to your herd with lineage. Birth weight will create a weight record.
              </p>
            </div>
          </div>

          <Input
            label="Kidding Notes"
            value={kiddingForm.notes}
            onChange={(e) => setKiddingForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Overall labor details, complications, etc."
          />
        </div>
      </Modal>
    </div>
  );
}
