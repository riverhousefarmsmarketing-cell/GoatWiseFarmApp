'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useHerds } from '@/hooks/useHerds';
import {
  Card, Button, Input, Select, Modal, StatCard, Badge, EmptyState, LoadingSpinner,
} from '@/components/ui';
import { formatDate, calculateAge } from '@/lib/utils';
import { Shield, Plus, Star, AlertTriangle, Heart, Syringe, ChevronRight, Camera, X, Pencil, Trash2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

const PREDATION_PHOTO_CATEGORIES = [
  { value: 'injury', label: 'Injury/Attack' },
  { value: 'predator_evidence', label: 'Predator Evidence' },
  { value: 'fence_damage', label: 'Fence Damage' },
  { value: 'deceased', label: 'Deceased Animal' },
  { value: 'other', label: 'Other' },
];

const guardianTypes = [
  { value: 'lgd', label: 'Livestock Guardian Dog (LGD)', icon: '🐕', color: 'bg-amber-100 text-amber-700' },
  { value: 'llama', label: 'Llama', icon: '🦙', color: 'bg-purple-100 text-purple-700' },
  { value: 'alpaca', label: 'Alpaca', icon: '🦙', color: 'bg-pink-100 text-pink-700' },
  { value: 'donkey', label: 'Donkey', icon: '🫏', color: 'bg-blue-100 text-blue-700' },
];

const trainingStatusOptions = [
  { value: 'in_training', label: 'In Training' },
  { value: 'fully_trained', label: 'Fully Trained' },
  { value: 'needs_supervision', label: 'Needs Supervision' },
  { value: 'not_recommended', label: 'Not Recommended' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'retired', label: 'Retired' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'sold', label: 'Sold' },
];

const healthRecordTypes = [
  { value: 'vaccination', label: 'Vaccination', icon: '💉' },
  { value: 'deworming', label: 'Deworming', icon: '💊' },
  { value: 'vet_visit', label: 'Vet Visit', icon: '🩺' },
  { value: 'treatment', label: 'Treatment', icon: '🏥' },
  { value: 'injury', label: 'Injury', icon: '🩹' },
  { value: 'illness', label: 'Illness', icon: '🤒' },
  { value: 'other', label: 'Other', icon: '📋' },
];

const commonVaccines = [
  { value: 'rabies', label: 'Rabies' },
  { value: 'dhpp', label: 'DHPP' },
  { value: 'bordetella', label: 'Bordetella' },
  { value: 'leptospirosis', label: 'Leptospirosis' },
  { value: 'cdt', label: 'CDT' },
  { value: 'other', label: 'Other' },
];

const predatorTypes = [
  { value: 'coyote', label: 'Coyote' },
  { value: 'wolf', label: 'Wolf' },
  { value: 'mountain_lion', label: 'Mountain Lion' },
  { value: 'bear', label: 'Bear' },
  { value: 'fox', label: 'Fox' },
  { value: 'domestic_dog', label: 'Domestic Dog' },
  { value: 'unknown', label: 'Unknown' },
];

function RatingStars({ rating, onChange }: { rating: number; onChange?: (r: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange?.(star)} disabled={!onChange}
          className={`${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}>
          <Star className={`h-5 w-5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700', retired: 'bg-amber-100 text-amber-700',
    deceased: 'bg-gray-100 text-gray-700', sold: 'bg-blue-100 text-blue-700',
    in_training: 'bg-blue-100 text-blue-700', fully_trained: 'bg-green-100 text-green-700',
    needs_supervision: 'bg-amber-100 text-amber-700', not_recommended: 'bg-red-100 text-red-700',
  };
  return <Badge className={colors[status] || 'bg-gray-100 text-gray-700'}>{status.replace('_', ' ')}</Badge>;
}

export default function GuardiansPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();
  const { data: herds } = useHerds();

  const [activeTab, setActiveTab] = useState<'guardians' | 'health' | 'incidents'>('guardians');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showVaccineModal, setShowVaccineModal] = useState(false);
  const [showPredationModal, setShowPredationModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedGuardian, setSelectedGuardian] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingGuardianId, setEditingGuardianId] = useState<string | null>(null);
  const [editingHealthRecordId, setEditingHealthRecordId] = useState<string | null>(null);
  const [editingVaccineId, setEditingVaccineId] = useState<string | null>(null);
  const [editingPredationId, setEditingPredationId] = useState<string | null>(null);

  const [predationPhotos, setPredationPhotos] = useState<File[]>([]);
  const [predationPhotoCategory, setPredationPhotoCategory] = useState('injury');
  const [guardianPhotos, setGuardianPhotos] = useState<File[]>([]);
  const [guardianPhotoCaption, setGuardianPhotoCaption] = useState('');
  const [isUploadingGuardianPhoto, setIsUploadingGuardianPhoto] = useState(false);

  const [newGuardian, setNewGuardian] = useState({
    name: '', type: 'lgd', breed: '', sex: 'male', birth_date: '',
    acquired_date: format(new Date(), 'yyyy-MM-dd'), effectiveness_rating: 3,
    training_status: 'in_training', status: 'active', herd_id: '', weight: '', notes: '',
  });

  const [newHealthRecord, setNewHealthRecord] = useState({
    guardian_id: '', type: 'vaccination', date: format(new Date(), 'yyyy-MM-dd'),
    description: '', medication: '', dosage: '', vet_name: '', follow_up_date: '', cost: '', notes: '',
  });

  const [newVaccine, setNewVaccine] = useState({
    guardian_id: '', vaccine_name: '', date_given: format(new Date(), 'yyyy-MM-dd'),
    next_due_date: '', administered_by: '', notes: '',
  });

  const [newPredation, setNewPredation] = useState({
    date: format(new Date(), 'yyyy-MM-dd'), predator_type: '', outcome: 'deterred',
    location: '', description: '', animals_lost: '0', animals_injured: '0',
  });

  const { data: guardians, isLoading } = useQuery<any>({
    queryKey: ['guardians', typeFilter],
    queryFn: async () => {
      let query = supabase.from('guardians').select('*').order('name');
      if (typeFilter !== 'all') query = query.eq('type', typeFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: healthRecords } = useQuery({
    queryKey: ['guardian_health_records'],
    queryFn: async () => {
      const { data, error } = await supabase.from('guardian_health_records')
        .select('*, guardian:guardians(id, name, type)').order('date', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: vaccinations } = useQuery({
    queryKey: ['guardian_vaccinations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('guardian_vaccinations')
        .select('*, guardian:guardians(id, name, type)').order('next_due_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: predationEvents } = useQuery({
    queryKey: ['predation_events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('predation_events').select('*').order('date', { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createGuardian = useMutation({
    mutationFn: async (g: any) => {
      const { data, error } = await (supabase.from('guardians') as any).insert([{ ...g, user_id: user?.id }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardians'] }),
  });

  const updateGuardian = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('guardians') as any).update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardians'] }),
  });

  const deleteGuardian = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('guardians').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['guardian_health_records'] });
      queryClient.invalidateQueries({ queryKey: ['guardian_vaccinations'] });
    },
  });

  const createHealthRecord = useMutation({
    mutationFn: async (r: any) => {
      const { data, error } = await (supabase.from('guardian_health_records') as any).insert([{ ...r, user_id: user?.id }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardian_health_records'] }),
  });

  const updateHealthRecord = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('guardian_health_records') as any).update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardian_health_records'] }),
  });

  const deleteHealthRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('guardian_health_records').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardian_health_records'] }),
  });

  const createVaccination = useMutation({
    mutationFn: async (v: any) => {
      const { data, error } = await (supabase.from('guardian_vaccinations') as any).insert([{ ...v, user_id: user?.id }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardian_vaccinations'] }),
  });

  const updateVaccination = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('guardian_vaccinations') as any).update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardian_vaccinations'] }),
  });

  const deleteVaccination = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('guardian_vaccinations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardian_vaccinations'] }),
  });

  const createPredation = useMutation({
    mutationFn: async (e: any) => {
      const { data, error } = await (supabase.from('predation_events') as any).insert([{ ...e, user_id: user?.id }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['predation_events'] }),
  });

  const updatePredation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('predation_events') as any).update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['predation_events'] }),
  });

  const deletePredation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('predation_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['predation_events'] }),
  });

  const activeGuardians = guardians?.filter((g: any) => g.status === 'active').length || 0;

  // Fetch photos for selected guardian
  const { data: selectedGuardianPhotos } = useQuery<any[]>({
    queryKey: ['guardian_photos', selectedGuardian?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('guardian_id', selectedGuardian?.id)
        .order('date_taken', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!selectedGuardian?.id,
  });

  const handleGuardianPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setGuardianPhotos(prev => [...prev, ...files].slice(0, 5));
  };

  const handleGuardianPhotoUpload = async () => {
    if (guardianPhotos.length === 0 || !user || !selectedGuardian) return;
    setIsUploadingGuardianPhoto(true);
    try {
      for (const file of guardianPhotos) {
        const ext = file.name.split('.').pop();
        const filename = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filename, file, { cacheControl: '3600', upsert: false });
        if (uploadError) { console.error('Upload error:', uploadError); continue; }
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filename);
        await (supabase as any).from('photos').insert({
          user_id: user.id,
          guardian_id: selectedGuardian.id,
          category: 'guardian_profile',
          caption: guardianPhotoCaption || null,
          filename,
          url: urlData.publicUrl,
          date_taken: new Date().toISOString().split('T')[0],
        });
      }
      queryClient.invalidateQueries({ queryKey: ['guardian_photos', selectedGuardian.id] });
      setGuardianPhotos([]);
      setGuardianPhotoCaption('');
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploadingGuardianPhoto(false);
    }
  };

  const handleDeleteGuardianPhoto = async (photoId: string, filename: string) => {
    try {
      await supabase.storage.from('photos').remove([filename]);
      await supabase.from('photos').delete().eq('id', photoId);
      queryClient.invalidateQueries({ queryKey: ['guardian_photos', selectedGuardian?.id] });
    } catch (error) {
      console.error('Delete photo error:', error);
    }
  };

  const vaccinesDueSoon = vaccinations?.filter((v: any) => {
    if (!v.next_due_date) return false;
    const due = new Date(v.next_due_date);
    return due <= addDays(new Date(), 30) && due >= new Date();
  }).length || 0;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPredationPhotos(prev => [...prev, ...files].slice(0, 5));
  };

  const removePhoto = (index: number) => {
    setPredationPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPredationPhotos = async (predationEventId: string) => {
    if (predationPhotos.length === 0 || !user) return;

    for (const file of predationPhotos) {
      const ext = file.name.split('.').pop();
      const filename = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filename, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filename);

      // Link to the predation event via its own FK. This used to write
      // inspection_id (a FK to inspections), which violated the constraint and
      // silently dropped every predation photo while leaving an orphaned file.
      await (supabase as any).from('photos').insert({
        user_id: user.id,
        predation_event_id: predationEventId,
        category: predationPhotoCategory,
        filename,
        url: urlData.publicUrl,
        date_taken: newPredation.date,
      });
    }

    queryClient.invalidateQueries({ queryKey: ['photos'] });
  };

  const openCreateGuardian = () => {
    setEditingGuardianId(null);
    setNewGuardian({
      name: '', type: 'lgd', breed: '', sex: 'male', birth_date: '',
      acquired_date: format(new Date(), 'yyyy-MM-dd'), effectiveness_rating: 3,
      training_status: 'in_training', status: 'active', herd_id: '', weight: '', notes: '',
    });
    setShowAddModal(true);
  };

  const openEditGuardian = (g: any) => {
    setEditingGuardianId(g.id);
    setNewGuardian({
      name: g.name || '', type: g.type || 'lgd', breed: g.breed || '', sex: g.sex || 'male',
      birth_date: g.birth_date ? String(g.birth_date).slice(0, 10) : '',
      acquired_date: g.acquired_date ? String(g.acquired_date).slice(0, 10) : format(new Date(), 'yyyy-MM-dd'),
      effectiveness_rating: g.effectiveness_rating ?? 3,
      training_status: g.training_status || 'in_training', status: g.status || 'active',
      herd_id: g.herd_id || '', weight: g.weight != null ? String(g.weight) : '', notes: g.notes || '',
    });
    setShowAddModal(true);
  };

  const handleCreateGuardian = async () => {
    if (!newGuardian.name) return;
    const fields = {
      ...newGuardian, birth_date: newGuardian.birth_date || null, herd_id: newGuardian.herd_id || null,
      weight: newGuardian.weight ? parseFloat(newGuardian.weight) : null, notes: newGuardian.notes || null,
    };
    if (editingGuardianId) {
      await updateGuardian.mutateAsync({ id: editingGuardianId, ...fields });
    } else {
      await createGuardian.mutateAsync(fields);
    }
    setEditingGuardianId(null);
    setShowAddModal(false);
  };

  const openCreateHealthRecord = () => {
    setEditingHealthRecordId(null);
    setNewHealthRecord({
      guardian_id: '', type: 'vaccination', date: format(new Date(), 'yyyy-MM-dd'),
      description: '', medication: '', dosage: '', vet_name: '', follow_up_date: '', cost: '', notes: '',
    });
    setShowHealthModal(true);
  };

  const openEditHealthRecord = (r: any) => {
    setEditingHealthRecordId(r.id);
    setNewHealthRecord({
      guardian_id: r.guardian_id || r.guardian?.id || '', type: r.type || 'vaccination',
      date: r.date ? String(r.date).slice(0, 10) : format(new Date(), 'yyyy-MM-dd'),
      description: r.description || '', medication: r.medication || '',
      dosage: r.dosage != null ? String(r.dosage) : '', vet_name: r.vet_name || '',
      follow_up_date: r.follow_up_date ? String(r.follow_up_date).slice(0, 10) : '',
      cost: r.cost != null ? String(r.cost) : '', notes: r.notes || '',
    });
    setShowHealthModal(true);
  };

  const handleCreateHealthRecord = async () => {
    if (!newHealthRecord.guardian_id) return;
    const fields = {
      ...newHealthRecord, dosage: newHealthRecord.dosage ? parseFloat(newHealthRecord.dosage) : null,
      cost: newHealthRecord.cost ? parseFloat(newHealthRecord.cost) : null,
      follow_up_date: newHealthRecord.follow_up_date || null,
    };
    if (editingHealthRecordId) {
      await updateHealthRecord.mutateAsync({ id: editingHealthRecordId, ...fields });
    } else {
      await createHealthRecord.mutateAsync(fields);
    }
    setEditingHealthRecordId(null);
    setShowHealthModal(false);
  };

  const openCreateVaccination = () => {
    setEditingVaccineId(null);
    setNewVaccine({
      guardian_id: '', vaccine_name: '', date_given: format(new Date(), 'yyyy-MM-dd'),
      next_due_date: '', administered_by: '', notes: '',
    });
    setShowVaccineModal(true);
  };

  const openEditVaccination = (v: any) => {
    setEditingVaccineId(v.id);
    setNewVaccine({
      guardian_id: v.guardian_id || v.guardian?.id || '', vaccine_name: v.vaccine_name || '',
      date_given: v.date_given ? String(v.date_given).slice(0, 10) : format(new Date(), 'yyyy-MM-dd'),
      next_due_date: v.next_due_date ? String(v.next_due_date).slice(0, 10) : '',
      administered_by: v.administered_by || '', notes: v.notes || '',
    });
    setShowVaccineModal(true);
  };

  const handleCreateVaccination = async () => {
    if (!newVaccine.guardian_id || !newVaccine.vaccine_name) return;
    const fields = { ...newVaccine, next_due_date: newVaccine.next_due_date || null };
    if (editingVaccineId) {
      await updateVaccination.mutateAsync({ id: editingVaccineId, ...fields });
    } else {
      await createVaccination.mutateAsync(fields);
    }
    setEditingVaccineId(null);
    setShowVaccineModal(false);
  };

  const openCreatePredation = () => {
    setEditingPredationId(null);
    resetPredationForm();
    setShowPredationModal(true);
  };

  const openEditPredation = (e: any) => {
    setEditingPredationId(e.id);
    setNewPredation({
      date: e.date ? String(e.date).slice(0, 10) : format(new Date(), 'yyyy-MM-dd'),
      predator_type: e.predator_type || '', outcome: e.outcome || 'deterred',
      location: e.location || '', description: e.description || '',
      animals_lost: e.animals_lost != null ? String(e.animals_lost) : '0',
      animals_injured: e.animals_injured != null ? String(e.animals_injured) : '0',
    });
    setPredationPhotos([]);
    setPredationPhotoCategory('injury');
    setShowPredationModal(true);
  };

  const handleCreatePredation = async () => {
    if (!newPredation.predator_type) return;

    const fields = {
      ...newPredation, animals_lost: parseInt(newPredation.animals_lost) || 0,
      animals_injured: parseInt(newPredation.animals_injured) || 0,
    };

    setIsSubmitting(true);
    try {
      if (editingPredationId) {
        await updatePredation.mutateAsync({ id: editingPredationId, ...fields });
      } else {
        const result = await createPredation.mutateAsync(fields);
        if (predationPhotos.length > 0 && result?.id) {
          await uploadPredationPhotos(result.id);
        }
      }

      setEditingPredationId(null);
      setShowPredationModal(false);
      resetPredationForm();
    } catch (error) {
      console.error('Error saving predation event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPredationForm = () => {
    setNewPredation({
      date: format(new Date(), 'yyyy-MM-dd'), predator_type: '', outcome: 'deterred',
      location: '', description: '', animals_lost: '0', animals_injured: '0',
    });
    setPredationPhotos([]);
    setPredationPhotoCategory('injury');
  };

  const getIcon = (type: string) => guardianTypes.find(t => t.value === type)?.icon || '🐕';
  const getColor = (type: string) => guardianTypes.find(t => t.value === type)?.color || 'bg-gray-100';

  const tabs = [
    { id: 'guardians', label: 'Guardians', icon: Shield },
    { id: 'health', label: 'Health', icon: Heart, badge: vaccinesDueSoon },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guardian Animals</h1>
          <p className="text-gray-500">Manage LGDs, llamas, donkeys and track activity</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'guardians' && <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateGuardian}>Add Guardian</Button>}
          {activeTab === 'health' && (
            <>
              <Button variant="secondary" leftIcon={<Syringe className="h-4 w-4" />} onClick={openCreateVaccination}>Add Vaccine</Button>
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateHealthRecord}>Add Record</Button>
            </>
          )}
          {activeTab === 'incidents' && <Button variant="secondary" leftIcon={<AlertTriangle className="h-4 w-4" />} onClick={openCreatePredation}>Log Incident</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Active" value={activeGuardians} icon={<Shield className="h-5 w-5" />} />
        <StatCard title="Vaccines Due" value={vaccinesDueSoon} icon={<Syringe className="h-5 w-5" />} className={vaccinesDueSoon > 0 ? 'border-amber-200 bg-amber-50' : ''} />
      </div>

      <div className="border-b flex gap-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 ${activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>
            <tab.icon className="h-4 w-4" />{tab.label}
            {tab.badge ? <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">{tab.badge}</span> : null}
          </button>
        ))}
      </div>

      {activeTab === 'guardians' && (
        <Card padding="none">
         {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner className="h-8 w-8" /></div> :
           !guardians?.length ? <EmptyState icon={<Shield className="h-12 w-12" />} title="No guardians" action={<Button onClick={openCreateGuardian}>Add Guardian</Button>} /> : (
            <div className="divide-y">
              {guardians.map((g: any) => (
                <div key={g.id} className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                  onClick={() => { setSelectedGuardian(g); setShowDetailModal(true); }}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${getColor(g.type)}`}>{getIcon(g.type)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{g.name}</p>
                        <StatusBadge status={g.status} />
                        <StatusBadge status={g.training_status} />
                      </div>
                      <p className="text-sm text-gray-500">{g.breed}{g.birth_date && ` • ${calculateAge(g.birth_date)}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <RatingStars rating={g.effectiveness_rating || 0} />
                    <div className="flex items-center gap-1">
                      <button type="button" className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded"
                        onClick={(e) => { e.stopPropagation(); openEditGuardian(g); }}><Pencil className="h-4 w-4" /></button>
                      <button type="button" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
                        onClick={(e) => { e.stopPropagation(); if (confirm('Delete this guardian? This cannot be undone.')) deleteGuardian.mutate(g.id); }}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'health' && (
        <Card padding="none">
          {!healthRecords?.length ? <EmptyState icon={<Heart className="h-8 w-8" />} title="No health records" action={<Button onClick={openCreateHealthRecord}>Add Record</Button>} /> : (
            <div className="divide-y">
              {healthRecords.map((r: any) => (
                <div key={r.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                      {healthRecordTypes.find(t => t.value === r.type)?.icon || '📋'}
                    </div>
                    <div>
                      <p className="font-medium">{r.guardian?.name}</p>
                      <p className="text-sm text-gray-500">{healthRecordTypes.find(t => t.value === r.type)?.label}{r.description && ` - ${r.description}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm">{formatDate(r.date)}</p>
                    <div className="flex items-center gap-1">
                      <button type="button" className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded"
                        onClick={() => openEditHealthRecord(r)}><Pencil className="h-4 w-4" /></button>
                      <button type="button" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
                        onClick={() => { if (confirm('Delete this health record?')) deleteHealthRecord.mutate(r.id); }}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'incidents' && (
        <Card padding="none">
          {!predationEvents?.length ? <EmptyState icon={<AlertTriangle className="h-8 w-8" />} title="No incidents" action={<Button onClick={openCreatePredation}>Log Incident</Button>} /> : (
            <div className="divide-y">
              {predationEvents.map((e: any) => (
                <div key={e.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge className={e.outcome === 'deterred' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{e.outcome}</Badge>
                      <span className="text-sm text-gray-500">{formatDate(e.date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded"
                        onClick={() => openEditPredation(e)}><Pencil className="h-4 w-4" /></button>
                      <button type="button" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
                        onClick={() => { if (confirm('Delete this incident?')) deletePredation.mutate(e.id); }}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <p className="font-medium">{predatorTypes.find(p => p.value === e.predator_type)?.label}</p>
                  <p className="text-sm text-gray-600">{e.description}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Add Guardian Modal */}
      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setEditingGuardianId(null); }} title={editingGuardianId ? 'Edit Guardian' : 'Add Guardian'}
        footer={<><Button variant="ghost" onClick={() => { setShowAddModal(false); setEditingGuardianId(null); }}>Cancel</Button><Button onClick={handleCreateGuardian} loading={editingGuardianId ? updateGuardian.isPending : createGuardian.isPending}>{editingGuardianId ? 'Save Changes' : 'Add'}</Button></>}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <Input label="Name" value={newGuardian.name} onChange={e => setNewGuardian({...newGuardian, name: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" options={guardianTypes.map(t => ({value: t.value, label: t.label}))} value={newGuardian.type} onChange={e => setNewGuardian({...newGuardian, type: e.target.value})} />
            <Select label="Sex" options={[{value:'male',label:'Male'},{value:'female',label:'Female'}]} value={newGuardian.sex} onChange={e => setNewGuardian({...newGuardian, sex: e.target.value})} />
          </div>
          <Input label="Breed" value={newGuardian.breed} onChange={e => setNewGuardian({...newGuardian, breed: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Birth Date" type="date" value={newGuardian.birth_date} onChange={e => setNewGuardian({...newGuardian, birth_date: e.target.value})} />
            <Input label="Acquired Date" type="date" value={newGuardian.acquired_date} onChange={e => setNewGuardian({...newGuardian, acquired_date: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" options={statusOptions} value={newGuardian.status} onChange={e => setNewGuardian({...newGuardian, status: e.target.value})} />
            <Select label="Training" options={trainingStatusOptions} value={newGuardian.training_status} onChange={e => setNewGuardian({...newGuardian, training_status: e.target.value})} />
          </div>
          <Select label="Assigned Herd" options={[{value:'',label:'None'},...(herds?.map(h=>({value:h.id,label:h.name}))||[])]} value={newGuardian.herd_id} onChange={e => setNewGuardian({...newGuardian, herd_id: e.target.value})} />
          <Input label="Weight (lbs)" type="number" value={newGuardian.weight} onChange={e => setNewGuardian({...newGuardian, weight: e.target.value})} />
          <div><label className="block text-sm font-medium mb-2">Effectiveness</label><RatingStars rating={newGuardian.effectiveness_rating} onChange={r => setNewGuardian({...newGuardian, effectiveness_rating: r})} /></div>
        </div>
      </Modal>

      {/* Health Record Modal */}
      <Modal open={showHealthModal} onClose={() => { setShowHealthModal(false); setEditingHealthRecordId(null); }} title={editingHealthRecordId ? 'Edit Health Record' : 'Add Health Record'}
        footer={<><Button variant="ghost" onClick={() => { setShowHealthModal(false); setEditingHealthRecordId(null); }}>Cancel</Button><Button onClick={handleCreateHealthRecord} loading={editingHealthRecordId ? updateHealthRecord.isPending : createHealthRecord.isPending}>{editingHealthRecordId ? 'Save Changes' : 'Save'}</Button></>}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <Select label="Guardian" options={[{value:'',label:'Select...'},...(guardians?.map((g: any)=>({value:g.id,label:g.name}))||[])]} value={newHealthRecord.guardian_id} onChange={e => setNewHealthRecord({...newHealthRecord, guardian_id: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" options={healthRecordTypes.map(t=>({value:t.value,label: `${t.icon} ${t.label}`}))} value={newHealthRecord.type} onChange={e => setNewHealthRecord({...newHealthRecord, type: e.target.value})} />
            <Input label="Date" type="date" value={newHealthRecord.date} onChange={e => setNewHealthRecord({...newHealthRecord, date: e.target.value})} />
          </div>
          <Input label="Description" value={newHealthRecord.description} onChange={e => setNewHealthRecord({...newHealthRecord, description: e.target.value})} />
          <Input label="Medication" value={newHealthRecord.medication} onChange={e => setNewHealthRecord({...newHealthRecord, medication: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Dosage" type="number" value={newHealthRecord.dosage} onChange={e => setNewHealthRecord({...newHealthRecord, dosage: e.target.value})} />
            <Input label="Vet Name" value={newHealthRecord.vet_name} onChange={e => setNewHealthRecord({...newHealthRecord, vet_name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Follow-up Date" type="date" value={newHealthRecord.follow_up_date} onChange={e => setNewHealthRecord({...newHealthRecord, follow_up_date: e.target.value})} />
            <Input label="Cost ($)" type="number" value={newHealthRecord.cost} onChange={e => setNewHealthRecord({...newHealthRecord, cost: e.target.value})} />
          </div>
          <div><label className="block text-sm font-medium mb-1">Notes</label><textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} value={newHealthRecord.notes} onChange={e => setNewHealthRecord({...newHealthRecord, notes: e.target.value})} /></div>
        </div>
      </Modal>

      {/* Vaccine Modal */}
      <Modal open={showVaccineModal} onClose={() => { setShowVaccineModal(false); setEditingVaccineId(null); }} title={editingVaccineId ? 'Edit Vaccination' : 'Add Vaccination'}
        footer={<><Button variant="ghost" onClick={() => { setShowVaccineModal(false); setEditingVaccineId(null); }}>Cancel</Button><Button onClick={handleCreateVaccination} loading={editingVaccineId ? updateVaccination.isPending : createVaccination.isPending}>{editingVaccineId ? 'Save Changes' : 'Save'}</Button></>}>
        <div className="space-y-4">
          <Select label="Guardian" options={[{value:'',label:'Select...'},...(guardians?.map((g: any)=>({value:g.id,label:g.name}))||[])]} value={newVaccine.guardian_id} onChange={e => setNewVaccine({...newVaccine, guardian_id: e.target.value})} required />
          <Select label="Vaccine" options={[{value:'',label:'Select...'},...commonVaccines]} value={newVaccine.vaccine_name} onChange={e => setNewVaccine({...newVaccine, vaccine_name: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date Given" type="date" value={newVaccine.date_given} onChange={e => setNewVaccine({...newVaccine, date_given: e.target.value})} />
            <Input label="Next Due" type="date" value={newVaccine.next_due_date} onChange={e => setNewVaccine({...newVaccine, next_due_date: e.target.value})} />
          </div>
          <Input label="Administered By" value={newVaccine.administered_by} onChange={e => setNewVaccine({...newVaccine, administered_by: e.target.value})} />
        </div>
      </Modal>

      {/* Predation Modal - WITH PHOTO UPLOAD */}
      <Modal open={showPredationModal} onClose={() => { setShowPredationModal(false); setEditingPredationId(null); resetPredationForm(); }} title={editingPredationId ? 'Edit Predation Incident' : 'Log Predation Incident'}
        footer={<><Button variant="ghost" onClick={() => { setShowPredationModal(false); setEditingPredationId(null); resetPredationForm(); }}>Cancel</Button><Button onClick={handleCreatePredation} loading={isSubmitting || (editingPredationId ? updatePredation.isPending : createPredation.isPending)}>{editingPredationId ? 'Save Changes' : 'Save'}</Button></>}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="date" value={newPredation.date} onChange={e => setNewPredation({...newPredation, date: e.target.value})} />
            <Select label="Predator" options={[{value:'',label:'Select...'},...predatorTypes]} value={newPredation.predator_type} onChange={e => setNewPredation({...newPredation, predator_type: e.target.value})} />
          </div>
          <Select label="Outcome" options={[{value:'deterred',label:'Deterred'},{value:'partial',label:'Partial Loss'},{value:'kill',label:'Kill'}]} value={newPredation.outcome} onChange={e => setNewPredation({...newPredation, outcome: e.target.value})} />
          <Input label="Location" value={newPredation.location} onChange={e => setNewPredation({...newPredation, location: e.target.value})} placeholder="e.g., North pasture near creek" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Animals Lost" type="number" value={newPredation.animals_lost} onChange={e => setNewPredation({...newPredation, animals_lost: e.target.value})} />
            <Input label="Animals Injured" type="number" value={newPredation.animals_injured} onChange={e => setNewPredation({...newPredation, animals_injured: e.target.value})} />
          </div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={3} value={newPredation.description} onChange={e => setNewPredation({...newPredation, description: e.target.value})} placeholder="Describe what happened..." required /></div>

          {/* Photo Upload Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                <Camera className="h-4 w-4 inline mr-2" />
                Photos (optional)
              </label>
              <span className="text-xs text-gray-500">{predationPhotos.length}/5 max</span>
            </div>

            {predationPhotos.length > 0 && (
              <Select
                label="Photo Category"
                options={PREDATION_PHOTO_CATEGORIES}
                value={predationPhotoCategory}
                onChange={(e) => setPredationPhotoCategory(e.target.value)}
              />
            )}

            {predationPhotos.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-3">
                {predationPhotos.map((file, index) => (
                  <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {predationPhotos.length < 5 && (
              <label className="block mt-3">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer">
                  <Camera className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {predationPhotos.length === 0 ? 'Add photos' : 'Add more photos'}
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </Modal>

      {/* Guardian Detail Modal */}
      <Modal open={showDetailModal} onClose={() => { setShowDetailModal(false); setSelectedGuardian(null); setGuardianPhotos([]); setGuardianPhotoCaption(''); }} title={selectedGuardian?.name || 'Details'} size="lg">
        {selectedGuardian && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {selectedGuardianPhotos?.length ? (
                <img src={selectedGuardianPhotos[0].url} alt={selectedGuardian.name} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl ${getColor(selectedGuardian.type)}`}>{getIcon(selectedGuardian.type)}</div>
              )}
              <div>
                <h2 className="text-xl font-bold">{selectedGuardian.name}</h2>
                <p className="text-gray-500">{selectedGuardian.breed}</p>
                <div className="flex gap-2 mt-1"><StatusBadge status={selectedGuardian.status} /><StatusBadge status={selectedGuardian.training_status} /></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Age</p><p className="font-semibold">{selectedGuardian.birth_date ? calculateAge(selectedGuardian.birth_date) : '—'}</p></div>
              <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Weight</p><p className="font-semibold">{selectedGuardian.weight || '—'} lbs</p></div>
              <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Rating</p><RatingStars rating={selectedGuardian.effectiveness_rating || 0} /></div>
            </div>

            {/* Photos Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Camera className="h-4 w-4" /> Photos</h3>
                <span className="text-xs text-gray-500">{selectedGuardianPhotos?.length || 0} photo{(selectedGuardianPhotos?.length || 0) !== 1 ? 's' : ''}</span>
              </div>
              {selectedGuardianPhotos?.length ? (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {selectedGuardianPhotos.map((photo: any) => (
                    <div key={photo.id} className="relative group aspect-square">
                      <img src={photo.url} alt={photo.caption || selectedGuardian.name} className="w-full h-full object-cover rounded-lg" />
                      <button
                        onClick={() => handleDeleteGuardianPhoto(photo.id, photo.filename)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {photo.caption && <p className="text-xs text-gray-500 mt-1 truncate">{photo.caption}</p>}
                    </div>
                  ))}
                </div>
              ) : null}
              {/* Upload area */}
              {guardianPhotos.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {guardianPhotos.map((file, i) => (
                      <div key={i} className="relative">
                        <img src={URL.createObjectURL(file)} alt="" className="w-16 h-16 rounded object-cover" />
                        <button onClick={() => setGuardianPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                  <Input placeholder="Caption (optional)" value={guardianPhotoCaption} onChange={(e) => setGuardianPhotoCaption(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleGuardianPhotoUpload} loading={isUploadingGuardianPhoto}>Upload</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setGuardianPhotos([]); setGuardianPhotoCaption(''); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary-400 transition-colors">
                  <Camera className="h-5 w-5 mx-auto mb-1 text-gray-400" />
                  <span className="text-sm text-gray-500">Add photos</span>
                  <input type="file" multiple accept="image/*" onChange={handleGuardianPhotoSelect} className="hidden" />
                </label>
              )}
            </div>

            {/* Vaccinations Section */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><Syringe className="h-4 w-4" /> Vaccinations</h3>
              {vaccinations?.filter((v: any) => (v.guardian_id || v.guardian?.id) === selectedGuardian.id).length ? (
                <div className="divide-y">
                  {vaccinations.filter((v: any) => (v.guardian_id || v.guardian?.id) === selectedGuardian.id).map((v: any) => (
                    <div key={v.id} className="py-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{commonVaccines.find(c => c.value === v.vaccine_name)?.label || v.vaccine_name}</p>
                        <p className="text-xs text-gray-500">Given {formatDate(v.date_given)}{v.next_due_date && ` • Due ${formatDate(v.next_due_date)}`}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded"
                          onClick={() => { setShowDetailModal(false); openEditVaccination(v); }}><Pencil className="h-4 w-4" /></button>
                        <button type="button" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
                          onClick={() => { if (confirm('Delete this vaccination record?')) deleteVaccination.mutate(v.id); }}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-500">No vaccinations recorded.</p>}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="secondary" className="flex-1" onClick={() => { setEditingHealthRecordId(null); setNewHealthRecord({...newHealthRecord, guardian_id: selectedGuardian.id}); setShowDetailModal(false); setShowHealthModal(true); }}><Plus className="h-4 w-4 mr-2" />Add Health Record</Button>
              <Button variant="secondary" className="flex-1" onClick={() => { setEditingVaccineId(null); setNewVaccine({...newVaccine, guardian_id: selectedGuardian.id}); setShowDetailModal(false); setShowVaccineModal(true); }}><Syringe className="h-4 w-4 mr-2" />Add Vaccine</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
