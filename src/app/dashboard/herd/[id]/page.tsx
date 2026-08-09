'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { type Species, getSpeciesConfig } from '@/lib/speciesConfig';
import { BREEDS } from '@/lib/breedData';
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  Badge,
  LoadingSpinner,
  AnimalLink,
} from '@/components/ui';
import {
  formatDate,
  formatCurrency,
  calculateAge,
  getCategoryDisplay,
  getStatusColor,
  getFamachaColor,
} from '@/lib/utils';
import { isFemale, toCanonicalCategory, getCategoryOptions } from '@/lib/animalVocab';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Heart,
  Baby,
  Milk,
  Scale,
  Calendar,
  Users,
  FileText,
  Activity,
  Syringe,
  Stethoscope,
  DollarSign,
  Clock,
  ChevronRight,
  Plus,
  Camera,
  X,
  ZoomIn,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

// Photo categories for animal profile
const ANIMAL_PHOTO_CATEGORIES = [
  { value: 'conformation', label: 'Conformation' },
  { value: 'udder', label: 'Udder' },
  { value: 'for_sale', label: 'For Sale' },
  { value: 'show', label: 'Show' },
  { value: 'progress', label: 'Progress/Growth' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'culled', label: 'Culled' },
];

export default function AnimalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();
  const animalId = params.id as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'breeding' | 'milk' | 'lineage' | 'photos'>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // Photo state
  const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoCategory, setPhotoCategory] = useState('general');
  const [photoCaption, setPhotoCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Fetch animal details
  const { data: animal, isLoading } = useQuery({
    queryKey: ['animal', animalId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('animals') as any)
        .select(`
          *,
          sire:sire_id(id, name),
          dam:dam_id(id, name)
        `)
        .eq('id', animalId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!animalId,
  });

  // Fetch photos for this animal
  const { data: animalPhotos } = useQuery<any[]>({
    queryKey: ['animal_photos', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('animal_id', animalId)
        .order('date_taken', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!animalId,
  });

  // Fetch health records for this animal
  const { data: healthRecords } = useQuery({
    queryKey: ['animal_health', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('animal_id', animalId)
        .order('date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!animalId,
  });

  // Fetch inspections for this animal
  const { data: inspections } = useQuery<any>({
    queryKey: ['animal_inspections', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('animal_id', animalId)
        .order('date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!animalId,
  });

  // Fetch breeding records (as doe or buck)
  const { data: breedingRecords } = useQuery({
    queryKey: ['animal_breeding', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('breeding_records')
        .select(`
          *,
          doe:doe_id(id, name),
          buck:buck_id(id, name)
        `)
        .or(`doe_id.eq.${animalId},buck_id.eq.${animalId}`)
        .order('breeding_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!animalId,
  });

  // Fetch milk records
  const { data: milkRecords } = useQuery({
    queryKey: ['animal_milk', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_records')
        .select('*')
        .eq('animal_id', animalId)
        .order('date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!animalId,
  });

  // Fetch offspring
  const { data: offspring } = useQuery({
    queryKey: ['animal_offspring', animalId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('animals') as any)
        .select('id, name, sex, date_of_birth, status, category')
        .or(`sire_id.eq.${animalId},dam_id.eq.${animalId}`)
        .order('date_of_birth', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!animalId,
  });

  // Fetch groups this animal belongs to
  const { data: animalGroups } = useQuery({
    queryKey: ['animal_groups_membership', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animal_groups')
        .select('*, groups(id, name, color, type)')
        .eq('animal_id', animalId);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!animalId,
  });

  // Update animal mutation
  const updateAnimal = useMutation({
    mutationFn: async (updates: any) => {
      const { data, error } = await (supabase
        .from('animals') as any)
        .update(updates)
        .eq('id', animalId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animal', animalId] });
      setShowEditModal(false);
    },
  });

  // Delete animal mutation
  const deleteAnimal = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('animals') as any).delete().eq('id', animalId);
      if (error) throw error;
    },
    onSuccess: () => {
      router.push('/dashboard/herd');
    },
  });

  // Delete photo mutation
  const deletePhoto = useMutation({
    mutationFn: async (photo: any) => {
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([photo.filename]);
      if (storageError) console.error('Storage delete error:', storageError);

      const { error: dbError } = await (supabase as any)
        .from('photos')
        .delete()
        .eq('id', photo.id);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animal_photos', animalId] });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });

  const handleEdit = () => {
    setEditData({
      name: animal?.name || '',
      breed: animal?.breed || '',
      // Normalize to the neutral category value so it matches an option in the
      // (species-aware) category dropdown even for animals stored with goat words.
      category: toCanonicalCategory(animal?.category) || '',
      status: animal?.status || 'active',
      date_of_birth: animal?.date_of_birth || '',
      tag_number: animal?.tag_number || '',
      registration_number: animal?.registration_number || '',
      microchip_id: animal?.microchip_id || '',
      notes: animal?.notes || '',
    });
    setShowEditModal(true);
  };

  // Species-aware breed options for edit modal
  const animalSpecies: Species = ((animal as any)?.species as Species) || 'goat';
  const animalSpeciesConfig = useMemo(() => getSpeciesConfig(animalSpecies), [animalSpecies]);
  const editBreedOptions = useMemo(() => [
    { value: '', label: 'Select breed...' },
    ...BREEDS[animalSpecies].map((b: any) => ({ value: b.name, label: b.name })),
    { value: 'Mixed/Grade', label: 'Mixed/Grade' },
    { value: 'Other', label: 'Other' },
  ], [animalSpecies]);

  const handleSaveEdit = async () => {
    await updateAnimal.mutateAsync(editData);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${animal?.name}? This cannot be undone.`)) {
      deleteAnimal.mutate();
    }
  };

  // Photo handlers
  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotoFiles(prev => [...prev, ...files].slice(0, 5));
  };

  const removePhotoFile = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = async () => {
    if (photoFiles.length === 0 || !user) return;

    setIsUploading(true);
    try {
      for (const file of photoFiles) {
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

        await (supabase as any).from('photos').insert({
          user_id: user.id,
          animal_id: animalId,
          category: photoCategory,
          caption: photoCaption || null,
          filename,
          url: urlData.publicUrl,
          date_taken: new Date().toISOString().split('T')[0],
        });
      }

      queryClient.invalidateQueries({ queryKey: ['animal_photos', animalId] });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      setShowPhotoUploadModal(false);
      setPhotoFiles([]);
      setPhotoCaption('');
      setPhotoCategory('general');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading photos. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  const nextPhoto = () => {
    const photos = animalPhotos || [];
    setLightboxIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    const photos = animalPhotos || [];
    setLightboxIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  // Calculate stats
  const totalMilk = milkRecords?.reduce((sum: number, r: any) => sum + (r.amount || 0), 0) || 0;
  const avgMilk = milkRecords?.length ? totalMilk / milkRecords.length : 0;
  const latestInspection: any = inspections?.[0];
  const totalOffspring = offspring?.length || 0;
  const photoCount = animalPhotos?.length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Animal not found</p>
        <Link href="/dashboard/herd">
          <Button className="mt-4">Back to Herd</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/dashboard/herd"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Herd
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar - show first photo or default */}
          <div className="w-20 h-20 rounded-xl bg-primary-100 flex items-center justify-center text-4xl overflow-hidden">
            {animalPhotos && animalPhotos.length > 0 ? (
              <img src={animalPhotos[0].url} alt={animal.name} className="w-full h-full object-cover" />
            ) : (
              '🐐'
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{animal.name}</h1>
              <Badge className={getStatusColor(animal.status)}>{animal.status}</Badge>
            </div>
            <p className="text-gray-500 mt-1">
              {animal.breed} • {getCategoryDisplay(animal.category, animal.species)}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              {animal.date_of_birth && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {calculateAge(animal.date_of_birth)} old
                </span>
              )}
              {animal.tag_number && (
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Tag: {animal.tag_number}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<Edit className="h-4 w-4" />} onClick={handleEdit}>
            Edit
          </Button>
          <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Heart className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">FAMACHA</p>
              <div className="flex items-center gap-2">
                {latestInspection?.famacha ? (
                  <>
                    <div className={`w-4 h-4 rounded-full ${getFamachaColor(latestInspection.famacha)}`} />
                    <span className="font-semibold">{latestInspection.famacha}</span>
                  </>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Scale className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Weight</p>
              <p className="font-semibold">
                {latestInspection?.weight ? `${latestInspection.weight} lbs` : '—'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Milk className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Milk</p>
              <p className="font-semibold">
                {avgMilk > 0 ? `${avgMilk.toFixed(1)} lbs` : '—'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Baby className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Offspring</p>
              <p className="font-semibold">{totalOffspring}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Camera className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Photos</p>
              <p className="font-semibold">{photoCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Groups */}
      {animalGroups && animalGroups.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Groups</h3>
          <div className="flex flex-wrap gap-2">
            {animalGroups.map((ag: any) => (
              <Link
                key={ag.id}
                href="/dashboard/groups"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: `${ag.groups?.color}20`,
                  color: ag.groups?.color,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ag.groups?.color }}
                />
                {ag.groups?.name}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'health', label: 'Health Records', icon: Heart },
            { id: 'breeding', label: 'Breeding', icon: Baby },
            { id: 'milk', label: 'Milk Production', icon: Milk },
            { id: 'lineage', label: 'Lineage', icon: Users },
            { id: 'photos', label: 'Photos', icon: Camera, badge: photoCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Details */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Details</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium">{animal.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Breed</dt>
                <dd className="font-medium">{animal.breed || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Sex</dt>
                <dd className="font-medium capitalize">{animal.sex}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Birth Date</dt>
                <dd className="font-medium">
                  {animal.date_of_birth ? formatDate(animal.date_of_birth) : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Tag Number</dt>
                <dd className="font-medium">{animal.tag_number || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Registration #</dt>
                <dd className="font-medium">{animal.registration_number || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Microchip ID</dt>
                <dd className="font-medium">{animal.microchip_id || '—'}</dd>
              </div>
            </dl>
          </Card>

          {/* Notes */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Notes</h3>
            {animal.notes ? (
              <p className="text-gray-600 whitespace-pre-wrap">{animal.notes}</p>
            ) : (
              <p className="text-gray-400 italic">No notes added</p>
            )}
          </Card>

          {/* Recent Activity */}
          <Card className="p-4 md:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {healthRecords?.slice(0, 3).map((record: any) => (
                <div key={record.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Syringe className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{record.type}</p>
                    <p className="text-sm text-gray-500">{record.treatment || record.notes}</p>
                  </div>
                  <span className="text-sm text-gray-400">{formatDate(record.date)}</span>
                </div>
              ))}
              {inspections?.slice(0, 2).map((inspection: any) => (
                <div key={inspection.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Stethoscope className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Health Inspection</p>
                    <p className="text-sm text-gray-500">
                      FAMACHA: {inspection.famacha}, BCS: {inspection.body_condition_score}
                    </p>
                  </div>
                  <span className="text-sm text-gray-400">{formatDate(inspection.date)}</span>
                </div>
              ))}
              {(!healthRecords?.length && !inspections?.length) && (
                <p className="text-gray-400 text-center py-4">No recent activity</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'health' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Health Records</h3>
            <Link href="/dashboard/health">
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Add Record
              </Button>
            </Link>
          </div>

          {/* Latest Inspection */}
          {latestInspection && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="font-medium text-blue-900 mb-3">Latest Inspection - {formatDate(latestInspection.date)}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-blue-700">FAMACHA</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-4 h-4 rounded-full ${getFamachaColor(latestInspection.famacha)}`} />
                    <span className="font-semibold text-blue-900">{latestInspection.famacha}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Body Condition</p>
                  <p className="font-semibold text-blue-900">{latestInspection.body_condition_score}/5</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Weight</p>
                  <p className="font-semibold text-blue-900">{latestInspection.weight || '—'} lbs</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Temperature</p>
                  <p className="font-semibold text-blue-900">{latestInspection.temperature || '—'}°F</p>
                </div>
              </div>
            </Card>
          )}

          {/* Health Records Table */}
          <Card padding="none">
            {!healthRecords?.length ? (
              <div className="p-8 text-center text-gray-500">
                No health records found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Treatment</th>
                      <th className="px-4 py-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {healthRecords.map((record: any) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{formatDate(record.date)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="default">{record.type}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">{record.treatment || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{record.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'breeding' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Breeding History</h3>
            <Link href="/dashboard/breeding">
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Record Breeding
              </Button>
            </Link>
          </div>

          <Card padding="none">
            {!breedingRecords?.length ? (
              <div className="p-8 text-center text-gray-500">
                No breeding records found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Partner</th>
                      <th className="px-4 py-3 font-medium">Due Date</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Kids</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {breedingRecords.map((record: any) => {
                      const partner = record.doe_id === animalId ? record.buck : record.doe;
                      const partnerId = record.doe_id === animalId ? record.buck_id : record.doe_id;
                      const role = record.doe_id === animalId ? 'Dam' : 'Sire';
                      return (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{formatDate(record.breeding_date)}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-400 mr-1">{role === 'Dam' ? '♂' : '♀'}</span>
                            {partner && partnerId ? (
                              <AnimalLink 
                                animalId={partnerId} 
                                name={partner.name}
                                variant="subtle"
                              />
                            ) : (
                              <span className="text-gray-500">Unknown</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">{formatDate(record.due_date)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={
                              record.status === 'kidded' ? 'success' :
                              record.status === 'confirmed' ? 'info' :
                              record.status === 'open' ? 'default' : 'warning'
                            }>
                              {record.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">{record.number_of_kids || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'milk' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Milk Production</h3>
            <Link href="/dashboard/milk">
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Record Milking
              </Button>
            </Link>
          </div>

          {/* Milk Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <p className="text-sm text-gray-500">Total Recorded</p>
              <p className="text-2xl font-bold text-gray-900">{totalMilk.toFixed(1)} lbs</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-sm text-gray-500">Average per Session</p>
              <p className="text-2xl font-bold text-gray-900">{avgMilk.toFixed(2)} lbs</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-sm text-gray-500">Records</p>
              <p className="text-2xl font-bold text-gray-900">{milkRecords?.length || 0}</p>
            </Card>
          </div>

          <Card padding="none">
            {!milkRecords?.length ? (
              <div className="p-8 text-center text-gray-500">
                No milk records found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Session</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {milkRecords.map((record: any) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{formatDate(record.date)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="default">{record.session}</Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">{record.amount} {record.amount_unit}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {record.discarded ? `Discarded: ${record.discard_reason}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'lineage' && (
        <div className="space-y-6">
          {/* Parents */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Parents</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4">
                <p className="text-sm text-gray-500 mb-2">Sire (Father)</p>
                {animal.sire ? (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-2xl">🐐</span>
                    <AnimalLink 
                      animalId={animal.sire.id} 
                      name={animal.sire.name}
                      variant="bold"
                    />
                  </div>
                ) : (
                  <p className="text-gray-400 italic p-3">Unknown</p>
                )}
              </Card>
              <Card className="p-4">
                <p className="text-sm text-gray-500 mb-2">Dam (Mother)</p>
                {animal.dam ? (
                  <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                    <span className="text-2xl">🐐</span>
                    <AnimalLink 
                      animalId={animal.dam.id} 
                      name={animal.dam.name}
                      variant="bold"
                    />
                  </div>
                ) : (
                  <p className="text-gray-400 italic p-3">Unknown</p>
                )}
              </Card>
            </div>
          </div>

          {/* Offspring */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Offspring ({totalOffspring})</h3>
            {!offspring?.length ? (
              <Card className="p-8 text-center text-gray-500">
                No offspring recorded
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {offspring.map((kid: any) => (
                  <Card key={kid.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{isFemale({ sex: kid.sex }) ? '♀' : '♂'}</span>
                      <div className="flex-1 min-w-0">
                        <AnimalLink 
                          animalId={kid.id} 
                          name={kid.name}
                          variant="bold"
                        />
                        <p className="text-sm text-gray-500">
                          {kid.date_of_birth ? calculateAge(kid.date_of_birth) : '—'}
                        </p>
                      </div>
                      <Badge className={getStatusColor(kid.status)}>{kid.status}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photos Tab */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Photos ({photoCount})</h3>
            <Button
              size="sm"
              leftIcon={<Camera className="h-4 w-4" />}
              onClick={() => setShowPhotoUploadModal(true)}
            >
              Add Photo
            </Button>
          </div>

          {!animalPhotos?.length ? (
            <Card className="p-12 text-center">
              <Camera className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-4">No photos yet for {animal.name}</p>
              <Button
                variant="outline"
                leftIcon={<Upload className="h-4 w-4" />}
                onClick={() => setShowPhotoUploadModal(true)}
              >
                Upload First Photo
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {animalPhotos.map((photo: any, index: number) => (
                <div
                  key={photo.id}
                  className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => openLightbox(index)}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Photo'}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="h-8 w-8 text-white" />
                    </div>
                  </div>

                  <div className="absolute bottom-2 left-2">
                    <Badge variant="default" className="text-xs">
                      {ANIMAL_PHOTO_CATEGORIES.find(c => c.value === photo.category)?.label || photo.category}
                    </Badge>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this photo?')) {
                        deletePhoto.mutate(photo);
                      }
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit ${animal.name}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} loading={updateAnimal.isPending}>
              Save Changes
            </Button>
          </>
        }
      >
        {editData && (
          <div className="space-y-4">
            <Input
              label="Name"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              required
            />
            <Select
              label="Breed"
              options={editBreedOptions}
              value={editData.breed}
              onChange={(e) => setEditData({ ...editData, breed: e.target.value })}
            />
            <Select
              label="Category"
              options={getCategoryOptions(animal?.species)}
              value={editData.category}
              onChange={(e) => setEditData({ ...editData, category: e.target.value })}
            />
            <Select
              label="Status"
              options={statusOptions}
              value={editData.status}
              onChange={(e) => setEditData({ ...editData, status: e.target.value })}
            />
            <Input
              label="Birth Date"
              type="date"
              value={editData.date_of_birth}
              onChange={(e) => setEditData({ ...editData, date_of_birth: e.target.value })}
            />
            <Input
              label="Tag Number"
              value={editData.tag_number}
              onChange={(e) => setEditData({ ...editData, tag_number: e.target.value })}
            />
            <Input
              label="Registration Number"
              value={editData.registration_number}
              onChange={(e) => setEditData({ ...editData, registration_number: e.target.value })}
            />
            <Input
              label="Microchip ID"
              value={editData.microchip_id}
              onChange={(e) => setEditData({ ...editData, microchip_id: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={4}
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Photo Upload Modal */}
      <Modal
        open={showPhotoUploadModal}
        onClose={() => { setShowPhotoUploadModal(false); setPhotoFiles([]); setPhotoCaption(''); }}
        title={`Add Photos - ${animal.name}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowPhotoUploadModal(false); setPhotoFiles([]); setPhotoCaption(''); }} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handlePhotoUpload} disabled={isUploading || photoFiles.length === 0} loading={isUploading}>
              Upload {photoFiles.length > 0 ? `${photoFiles.length} Photo${photoFiles.length !== 1 ? 's' : ''}` : ''}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Photos
            </label>
            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer">
                {photoFiles.length > 0 ? (
                  <div>
                    <Camera className="h-8 w-8 mx-auto mb-2 text-primary-600" />
                    <p className="font-medium text-gray-900">{photoFiles.length} photo(s) selected</p>
                    <p className="text-sm text-gray-500">Click to change</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="font-medium text-gray-700">Click to select photos</p>
                    <p className="text-sm text-gray-500">JPG, PNG, or WebP</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoFileSelect}
                className="hidden"
              />
            </label>
          </div>

          {photoFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {photoFiles.map((file, index) => (
                <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhotoFile(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Select
            label="Category"
            options={ANIMAL_PHOTO_CATEGORIES}
            value={photoCategory}
            onChange={(e) => setPhotoCategory(e.target.value)}
          />

          <Input
            label="Caption (optional)"
            value={photoCaption}
            onChange={(e) => setPhotoCaption(e.target.value)}
            placeholder="Add a description..."
          />
        </div>
      </Modal>

      {/* Lightbox */}
      {showLightbox && animalPhotos && animalPhotos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 z-10"
          >
            <X className="h-8 w-8" />
          </button>

          {animalPhotos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-4 p-2 text-white hover:text-gray-300 z-10"
              >
                <ChevronRight className="h-10 w-10 rotate-180" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-4 p-2 text-white hover:text-gray-300 z-10"
              >
                <ChevronRight className="h-10 w-10" />
              </button>
            </>
          )}

          <img
            src={animalPhotos[lightboxIndex].url}
            alt={animalPhotos[lightboxIndex].caption || 'Photo'}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />

          <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div>
                <p className="font-medium">{animal.name}</p>
                {animalPhotos[lightboxIndex].caption && (
                  <p className="text-gray-300 text-sm">{animalPhotos[lightboxIndex].caption}</p>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>{formatDate(animalPhotos[lightboxIndex].date_taken)}</span>
                <Badge variant="default" className="bg-white/20">
                  {ANIMAL_PHOTO_CATEGORIES.find(c => c.value === animalPhotos[lightboxIndex].category)?.label || animalPhotos[lightboxIndex].category}
                </Badge>
                <span>{lightboxIndex + 1} / {animalPhotos.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
