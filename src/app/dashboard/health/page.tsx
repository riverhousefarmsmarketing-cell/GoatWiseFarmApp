'use client';

import { useState, useMemo } from 'react';
import {
  useHealthRecords,
  useFollowUpsDue,
  useActiveWithdrawals,
  useInspections,
  useLatestInspections,
  useCreateHealthRecord,
  useCreateInspection,
  useMarkFollowUpComplete,
} from '@/hooks/useHealth';
import { useAnimals } from '@/hooks/useAnimals';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
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
import { formatDate, getFamachaColor, getFamachaStatus } from '@/lib/utils';
import {
  Heart,
  Plus,
  AlertTriangle,
  Clock,
  Syringe,
  Bug,
  Stethoscope,
  ClipboardCheck,
  Calendar,
  CheckCircle,
  XCircle,
  ChevronRight,
  Activity,
  Thermometer,
  Scale,
  Eye,
  Camera,
  X,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Filter,
} from 'lucide-react';

// Photo categories for health records
const HEALTH_PHOTO_CATEGORIES = [
  { value: 'wound', label: 'Wound/Injury' },
  { value: 'before_treatment', label: 'Before Treatment' },
  { value: 'after_treatment', label: 'After Treatment' },
  { value: 'skin_condition', label: 'Skin Condition' },
  { value: 'eye_issue', label: 'Eye Issue' },
  { value: 'hoof_problem', label: 'Hoof Problem' },
  { value: 'abscess', label: 'Abscess' },
  { value: 'other', label: 'Other' },
];

// ==========================================
// OPTIONS
// ==========================================

const healthTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'deworming', label: 'Deworming' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'vet_visit', label: 'Vet Visit' },
  { value: 'hoof_trim', label: 'Hoof Trim' },
  { value: 'injury', label: 'Injury' },
  { value: 'illness', label: 'Illness' },
  { value: 'other', label: 'Other' },
];

const dateRangeOptions = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last year' },
  { value: 'all', label: 'All time' },
];

const routeOptions = [
  { value: '', label: 'Select route...' },
  { value: 'oral', label: 'Oral' },
  { value: 'sq', label: 'Subcutaneous (SQ)' },
  { value: 'im', label: 'Intramuscular (IM)' },
  { value: 'iv', label: 'Intravenous (IV)' },
  { value: 'topical', label: 'Topical' },
  { value: 'pour_on', label: 'Pour-On' },
];

const famachaOptions = [
  { value: '1', label: '1 - Optimal (Red)' },
  { value: '2', label: '2 - Acceptable (Red-Pink)' },
  { value: '3', label: '3 - Borderline (Pink)' },
  { value: '4', label: '4 - Anemic (Pink-White)' },
  { value: '5', label: '5 - Severe (White)' },
];

const bcsOptions = [
  { value: '1', label: '1 - Emaciated' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: '2 - Thin' },
  { value: '2.5', label: '2.5' },
  { value: '3', label: '3 - Ideal' },
  { value: '3.5', label: '3.5' },
  { value: '4', label: '4 - Overweight' },
  { value: '4.5', label: '4.5' },
  { value: '5', label: '5 - Obese' },
];

const appetiteOptions = [
  { value: '', label: 'Select...' },
  { value: 'normal', label: 'Normal' },
  { value: 'decreased', label: 'Decreased' },
  { value: 'none', label: 'Not Eating' },
  { value: 'increased', label: 'Increased' },
];

const attitudeOptions = [
  { value: '', label: 'Select...' },
  { value: 'bright', label: 'Bright, Alert, Responsive' },
  { value: 'quiet', label: 'Quiet but Responsive' },
  { value: 'depressed', label: 'Depressed' },
  { value: 'lethargic', label: 'Lethargic' },
];

// ==========================================
// SORTABLE TABLE HEADER
// ==========================================

type SortDirection = 'asc' | 'desc' | null;

function SortableHeader({ label, sortKey, currentSort, currentDirection, onSort }: {
  label: string; sortKey: string; currentSort: string | null; currentDirection: SortDirection; onSort: (key: string) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <th className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 select-none transition-colors" onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (currentDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-primary-600" /> : <ArrowDown className="h-3 w-3 text-primary-600" />) : <ArrowUpDown className="h-3 w-3 text-gray-300" />}
      </div>
    </th>
  );
}

// ==========================================
// FAMACHA CARD COMPONENT
// ==========================================

function FamachaCard({ score, count, onClick, isSelected }: { score: number; count: number; onClick: () => void; isSelected?: boolean }) {
  const colors: Record<number, string> = {
    1: 'bg-red-600',
    2: 'bg-red-400',
    3: 'bg-pink-400',
    4: 'bg-pink-200',
    5: 'bg-pink-50 border border-gray-300',
  };

  const labels: Record<number, string> = {
    1: 'Optimal',
    2: 'Acceptable',
    3: 'Borderline',
    4: 'Anemic',
    5: 'Severe',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors w-full text-left ${isSelected ? 'ring-2 ring-primary-500 border-primary-300 bg-primary-50' : 'hover:bg-gray-50'}`}
    >
      <div className={`w-8 h-8 rounded-full ${colors[score]}`} />
      <div className="flex-1">
        <p className="font-medium text-gray-900">FAMACHA {score}</p>
        <p className="text-sm text-gray-500">{labels[score]}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-gray-900">{count}</p>
        <p className="text-xs text-gray-500">animals</p>
      </div>
    </button>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================

export default function HealthPage() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'inspections'>('overview');
  const [typeFilter, setTypeFilter] = useState('all');
  const [animalFilter, setAnimalFilter] = useState('all');
  const [dateRange, setDateRange] = useState('90');
  const [searchQuery, setSearchQuery] = useState('');
  const [famachaFilter, setFamachaFilter] = useState<number | null>(null);
  const [recordSort, setRecordSort] = useState<string | null>(null);
  const [recordSortDir, setRecordSortDir] = useState<SortDirection>(null);
  const [inspectionSort, setInspectionSort] = useState<string | null>(null);
  const [inspectionSortDir, setInspectionSortDir] = useState<SortDirection>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showFollowUpResolve, setShowFollowUpResolve] = useState<any>(null);
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Photo state for health records
  const [healthPhotos, setHealthPhotos] = useState<File[]>([]);
  const [healthPhotoCategory, setHealthPhotoCategory] = useState('wound');

  // New record state
  const [newRecord, setNewRecord] = useState({
    animal_id: '',
    type: 'vaccination' as const,
    date: new Date().toISOString().split('T')[0],
    treatment: '',
    medication: '',
    dosage: '',
    dosage_unit: 'ml',
    route: '',
    withdrawal_days: '',
    cost: '',
    follow_up_date: '',
    notes: '',
  });

  // New inspection state
  const [newInspection, setNewInspection] = useState({
    animal_id: '',
    date: new Date().toISOString().split('T')[0],
    famacha: '',
    body_condition_score: '',
    weight: '',
    temperature: '',
    respiration: '',
    heart_rate: '',
    appetite: '',
    attitude: '',
    action_required: false,
    action_taken: '',
    notes: '',
  });

  // Data hooks
  const { data: healthRecords, isLoading: recordsLoading } = useHealthRecords({ type: typeFilter, days: dateRange === 'all' ? 9999 : parseInt(dateRange) });
  const { data: followUps } = useFollowUpsDue();
  const { data: withdrawals } = useActiveWithdrawals();
  const { data: latestInspections } = useLatestInspections();
  const { data: animals } = useAnimals({ status: 'active' });

  // Mutations
  const createRecord = useCreateHealthRecord();
  const createInspection = useCreateInspection();
  const markComplete = useMarkFollowUpComplete();

  // Calculate FAMACHA distribution from latest inspections
  const famachaDistribution = latestInspections?.reduce((acc: Record<number, number>, insp: any) => {
    if (insp.famacha) {
      acc[insp.famacha] = (acc[insp.famacha] || 0) + 1;
    }
    return acc;
  }, {}) || {};

  // Animals needing attention (FAMACHA 4-5: Anemic or Severe)
  const animalsNeedingAttention = latestInspections?.filter(
    (insp: any) => insp.famacha && insp.famacha >= 4
  ) || [];

  // Sort handlers
  const handleRecordSort = (key: string) => {
    if (recordSort === key) { setRecordSortDir(recordSortDir === 'asc' ? 'desc' : recordSortDir === 'desc' ? null : 'asc'); if (recordSortDir === 'desc') setRecordSort(null); }
    else { setRecordSort(key); setRecordSortDir('asc'); }
  };
  const handleInspectionSort = (key: string) => {
    if (inspectionSort === key) { setInspectionSortDir(inspectionSortDir === 'asc' ? 'desc' : inspectionSortDir === 'desc' ? null : 'asc'); if (inspectionSortDir === 'desc') setInspectionSort(null); }
    else { setInspectionSort(key); setInspectionSortDir('asc'); }
  };
  const handleFamachaClick = (score: number) => { if (famachaFilter === score) setFamachaFilter(null); else { setFamachaFilter(score); setActiveTab('inspections'); } };
  const handleAlertClick = (type: string) => { if (type === 'followups' || type === 'withdrawals') setActiveTab('overview'); else if (type === 'deworming') { setFamachaFilter(4); setActiveTab('inspections'); } };
  const handleDeleteRecord = async (id: string) => { try { await supabase.from('health_records').delete().eq('id', id); queryClient.invalidateQueries({ queryKey: ['health-records'] }); queryClient.invalidateQueries({ queryKey: ['follow-ups-due'] }); setShowDeleteConfirm(null); } catch(e) { console.error(e); } };
  const animalOptions = useMemo(() => { const o = [{ value: 'all', label: 'All Animals' }]; if (animals) animals.forEach((a: any) => o.push({ value: a.id, label: a.name })); return o; }, [animals]);
  const filteredRecords = useMemo(() => {
    let recs = healthRecords || [];
    if (animalFilter !== 'all') recs = recs.filter((r: any) => r.animal_id === animalFilter);
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); recs = recs.filter((r: any) => (r.animals?.name||'').toLowerCase().includes(q)||(r.treatment||'').toLowerCase().includes(q)||(r.medication||'').toLowerCase().includes(q)||(r.notes||'').toLowerCase().includes(q)||(r.type||'').toLowerCase().includes(q)); }
    if (recordSort && recordSortDir) { recs = [...recs].sort((a: any, b: any) => { let aV:any, bV:any; switch(recordSort) { case 'date': aV=a.date||''; bV=b.date||''; break; case 'animal': aV=a.animals?.name||''; bV=b.animals?.name||''; break; case 'type': aV=a.type||''; bV=b.type||''; break; case 'cost': aV=a.cost||0; bV=b.cost||0; break; default: return 0; } if (typeof aV==='number') return recordSortDir==='asc'?aV-bV:bV-aV; return recordSortDir==='asc'?String(aV).localeCompare(String(bV)):String(bV).localeCompare(String(aV)); }); }
    return recs;
  }, [healthRecords, animalFilter, searchQuery, recordSort, recordSortDir]);
  const filteredInspections = useMemo(() => {
    let ins = latestInspections || [];
    if (famachaFilter !== null) { if (famachaFilter === 4) ins = ins.filter((i: any) => i.famacha && i.famacha >= 4); else ins = ins.filter((i: any) => i.famacha === famachaFilter); }
    if (inspectionSort && inspectionSortDir) { ins = [...ins].sort((a: any, b: any) => { let aV:any, bV:any; switch(inspectionSort) { case 'date': aV=a.date||''; bV=b.date||''; break; case 'animal': aV=a.animals?.name||''; bV=b.animals?.name||''; break; case 'famacha': aV=a.famacha||0; bV=b.famacha||0; break; case 'bcs': aV=a.body_condition_score||0; bV=b.body_condition_score||0; break; case 'weight': aV=a.weight||0; bV=b.weight||0; break; case 'temp': aV=a.temperature||0; bV=b.temperature||0; break; default: return 0; } if (typeof aV==='number') return inspectionSortDir==='asc'?aV-bV:bV-aV; return inspectionSortDir==='asc'?String(aV).localeCompare(String(bV)):String(bV).localeCompare(String(aV)); }); }
    return ins;
  }, [latestInspections, famachaFilter, inspectionSort, inspectionSortDir]);

  // Upload photos helper
  const uploadPhotos = async (healthRecordId: string) => {
    if (healthPhotos.length === 0 || !user) return;

    for (const file of healthPhotos) {
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
        animal_id: newRecord.animal_id || null,
        health_record_id: healthRecordId,
        category: healthPhotoCategory,
        filename,
        url: urlData.publicUrl,
        date_taken: newRecord.date,
      });
    }

    queryClient.invalidateQueries({ queryKey: ['photos'] });
  };

  // Handle form submissions
  const handleAddRecord = async () => {
    if (!newRecord.animal_id || !newRecord.type) return;

    setIsSubmitting(true);
    try {
      const result = await createRecord.mutateAsync({
        animal_id: newRecord.animal_id,
        type: newRecord.type,
        date: newRecord.date,
        treatment: newRecord.treatment || null,
        medication: newRecord.medication || null,
        dosage: newRecord.dosage ? parseFloat(newRecord.dosage) : null,
        dosage_unit: newRecord.dosage_unit || null,
        route: newRecord.route || null,
        withdrawal_days: newRecord.withdrawal_days ? parseInt(newRecord.withdrawal_days) : null,
        cost: newRecord.cost ? parseFloat(newRecord.cost) : null,
        follow_up_date: newRecord.follow_up_date || null,
        notes: newRecord.notes || null,
      });

      // Upload photos if any
      if (healthPhotos.length > 0 && result?.id) {
        await uploadPhotos(result.id);
      }

      setShowAddRecordModal(false);
      resetRecordForm();
    } catch (error) {
      console.error('Error creating record:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInspection = async () => {
    if (!newInspection.animal_id) return;

    await createInspection.mutateAsync({
      animal_id: newInspection.animal_id,
      date: newInspection.date,
      famacha: newInspection.famacha ? parseInt(newInspection.famacha) : null,
      body_condition_score: newInspection.body_condition_score ? parseFloat(newInspection.body_condition_score) : null,
      weight: newInspection.weight ? parseFloat(newInspection.weight) : null,
      weight_unit: 'lbs',
      temperature: newInspection.temperature ? parseFloat(newInspection.temperature) : null,
      temperature_unit: 'F',
      respiration: newInspection.respiration ? parseInt(newInspection.respiration) : null,
      heart_rate: newInspection.heart_rate ? parseInt(newInspection.heart_rate) : null,
      appetite: newInspection.appetite || null,
      attitude: newInspection.attitude || null,
      action_required: newInspection.action_required,
      action_taken: newInspection.action_taken || null,
      notes: newInspection.notes || null,
    });

    setShowInspectionModal(false);
    resetInspectionForm();
  };

  const resetRecordForm = () => {
    setNewRecord({
      animal_id: '',
      type: 'vaccination',
      date: new Date().toISOString().split('T')[0],
      treatment: '',
      medication: '',
      dosage: '',
      dosage_unit: 'ml',
      route: '',
      withdrawal_days: '',
      cost: '',
      follow_up_date: '',
      notes: '',
    });
    setHealthPhotos([]);
    setHealthPhotoCategory('wound');
  };

  const resetInspectionForm = () => {
    setNewInspection({
      animal_id: '',
      date: new Date().toISOString().split('T')[0],
      famacha: '',
      body_condition_score: '',
      weight: '',
      temperature: '',
      respiration: '',
      heart_rate: '',
      appetite: '',
      attitude: '',
      action_required: false,
      action_taken: '',
      notes: '',
    });
  };

  // Photo handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setHealthPhotos(prev => [...prev, ...files].slice(0, 5));
  };

  const removePhoto = (index: number) => {
    setHealthPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'vaccination': return <Syringe className="h-4 w-4" />;
      case 'deworming': return <Bug className="h-4 w-4" />;
      case 'vet_visit': return <Stethoscope className="h-4 w-4" />;
      default: return <Heart className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'vaccination': return 'bg-blue-100 text-blue-700';
      case 'deworming': return 'bg-purple-100 text-purple-700';
      case 'treatment': return 'bg-amber-100 text-amber-700';
      case 'vet_visit': return 'bg-green-100 text-green-700';
      case 'injury': return 'bg-red-100 text-red-700';
      case 'illness': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health & Care Center</h1>
          <p className="text-gray-500">Monitor health, track treatments, and manage inspections</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            leftIcon={<ClipboardCheck className="h-4 w-4" />}
            onClick={() => setShowInspectionModal(true)}
          >
            New Inspection
          </Button>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowAddRecordModal(true)}
          >
            Add Record
          </Button>
        </div>
      </div>

      {/* Alert Cards */}
      {((followUps?.length || 0) > 0 || (withdrawals?.length || 0) > 0 || animalsNeedingAttention.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Follow-ups Due */}
          {(followUps?.length || 0) > 0 && (
            <Card className="border-amber-200 bg-amber-50 p-4 hover:bg-amber-100 cursor-pointer" onClick={() => handleAlertClick('followups')}>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800">Follow-ups Due</h3>
                  <p className="text-2xl font-bold text-amber-900">{followUps?.length}</p>
                  <p className="text-sm text-amber-700">Click to review →</p>
                </div>
              </div>
            </Card>
          )}

          {/* Active Withdrawals */}
          {(withdrawals?.length || 0) > 0 && (
            <Card className="border-red-200 bg-red-50 p-4 hover:bg-red-100 cursor-pointer" onClick={() => handleAlertClick('withdrawals')}>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800">Active Withdrawals</h3>
                  <p className="text-2xl font-bold text-red-900">{withdrawals?.length}</p>
                  <p className="text-sm text-red-700">Click to review →</p>
                </div>
              </div>
            </Card>
          )}

          {/* Animals Needing Attention */}
          {animalsNeedingAttention.length > 0 && (
            <Card className="border-orange-200 bg-orange-50 p-4 hover:bg-orange-100 cursor-pointer" onClick={() => handleAlertClick('deworming')}>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-800">Need Deworming</h3>
                  <p className="text-2xl font-bold text-orange-900">{animalsNeedingAttention.length}</p>
                  <p className="text-sm text-orange-700">Click to filter inspections →</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: 'overview', label: 'Overview', icon: Heart },
            { id: 'records', label: 'Health Records', icon: Syringe },
            { id: 'inspections', label: 'Inspections', icon: ClipboardCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
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

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FAMACHA Distribution */}
          <Card>
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900">FAMACHA Distribution</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">Based on latest inspections</p>
              <p className="text-xs text-gray-400 mt-0.5">Click a score to filter inspections</p>
            </div>
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <FamachaCard
                  key={score}
                  score={score}
                  count={famachaDistribution[score] || 0}
                  onClick={() => handleFamachaClick(score)}
                  isSelected={famachaFilter === score}
                />
              ))}
            </div>
          </Card>

          {/* Follow-ups Due */}
          <Card>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <h2 className="font-semibold text-gray-900">Follow-ups Due</h2>
                </div>
                <Badge variant="warning">{followUps?.length || 0}</Badge>
              </div>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {!followUps?.length ? (
                <div className="p-8 text-center text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>All follow-ups complete!</p>
                </div>
              ) : (
                followUps.map((record: any) => (
                  <div key={record.id} className="p-4 flex items-center justify-between">
                    <div>
                      {record.animals ? (
                        <AnimalLink 
                          animalId={record.animal_id} 
                          name={record.animals.name}
                          variant="bold"
                        />
                      ) : (
                        <p className="font-medium text-gray-500">Unknown</p>
                      )}
                      <p className="text-sm text-gray-500">{record.treatment || record.type}</p>
                      <p className="text-xs text-amber-600">Due: {formatDate(record.follow_up_date)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markComplete.mutate(record.id)}
                      loading={markComplete.isPending}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Active Withdrawals */}
          <Card>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-gray-400" />
                  <h2 className="font-semibold text-gray-900">Active Withdrawals</h2>
                </div>
                <Badge variant="danger">{withdrawals?.length || 0}</Badge>
              </div>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {!withdrawals?.length ? (
                <div className="p-8 text-center text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>No active withdrawals</p>
                </div>
              ) : (
                withdrawals.map((record: any) => (
                  <div key={record.id} className="p-4">
                    <div className="flex items-center justify-between">
                      {record.animals ? (
                        <AnimalLink 
                          animalId={record.animal_id} 
                          name={record.animals.name}
                          variant="bold"
                        />
                      ) : (
                        <span className="font-medium text-gray-500">Unknown</span>
                      )}
                      <Badge variant="danger">
                        Until {formatDate(record.withdrawalEndDate)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {record.medication} • {record.withdrawal_days} days
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900">Recent Activity</h2>
              </div>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {recordsLoading ? (
                <div className="p-8 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : !filteredRecords?.length ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No recent health records</p>
                </div>
              ) : (
                healthRecords.slice(0, 10).map((record: any) => (
                  <div key={record.id} className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(record.type)}`}>
                      {getTypeIcon(record.type)}
                    </div>
                    <div className="flex-1">
                      {record.animals ? (
                        <AnimalLink 
                          animalId={record.animal_id} 
                          name={record.animals.name}
                          variant="subtle"
                        />
                      ) : (
                        <p className="font-medium text-gray-500">Unknown</p>
                      )}
                      <p className="text-sm text-gray-500">
                        {record.treatment || record.type.replace('_', ' ')}
                      </p>
                    </div>
                    <p className="text-sm text-gray-400">{formatDate(record.date)}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card padding="sm">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder="Search records..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <Select options={animalOptions} value={animalFilter} onChange={(e) => setAnimalFilter(e.target.value)} className="w-44" />
              <Select options={healthTypeOptions} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-40" />
              <Select options={dateRangeOptions} value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-40" />
              {(searchQuery || animalFilter !== 'all' || typeFilter !== 'all' || dateRange !== '90') && (
                <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setAnimalFilter('all'); setTypeFilter('all'); setDateRange('90'); }}>
                  <X className="h-3 w-3 mr-1" /> Clear filters
                </Button>
              )}
            </div>
          </Card>

          {/* Records Table */}
          <Card padding="none">
            {recordsLoading ? (
              <div className="p-8 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : !healthRecords?.length ? (
              <EmptyState
                icon={<Heart className="h-12 w-12" />}
                title={searchQuery || animalFilter !== 'all' ? "No matching records" : "No health records"}
                description={searchQuery || animalFilter !== 'all' ? "Try adjusting your filters" : "Start tracking your herd's health"}
                action={<Button onClick={() => setShowAddRecordModal(true)}>Add Record</Button>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-500">
                    <tr>
                      <SortableHeader label="Date" sortKey="date" currentSort={recordSort} currentDirection={recordSortDir} onSort={handleRecordSort} />
                      <SortableHeader label="Animal" sortKey="animal" currentSort={recordSort} currentDirection={recordSortDir} onSort={handleRecordSort} />
                      <SortableHeader label="Type" sortKey="type" currentSort={recordSort} currentDirection={recordSortDir} onSort={handleRecordSort} />
                      <th className="px-4 py-3 font-medium">Treatment</th>
                      <SortableHeader label="Cost" sortKey="cost" currentSort={recordSort} currentDirection={recordSortDir} onSort={handleRecordSort} />
                      <th className="px-4 py-3 font-medium">Follow-up</th>
                      <th className="px-4 py-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRecords.map((record: any) => (
                      <tr key={record.id} className="group hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{formatDate(record.date)}</td>
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
                          <Badge className={getTypeColor(record.type)}>
                            {record.type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {record.treatment || record.medication || '—'}
                          {record.dosage && ` (${record.dosage} ${record.dosage_unit})`}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {record.cost ? `$${record.cost.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {record.follow_up_date ? (
                            record.follow_up_completed ? (
                              <Badge variant="success">Complete</Badge>
                            ) : (
                              <button onClick={() => setShowFollowUpResolve(record)}><Badge variant="warning" className="cursor-pointer hover:bg-amber-200">{formatDate(record.follow_up_date)}</Badge></button>
                            )
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-1">
                          <button onClick={() => setShowDeleteConfirm(record.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all" title="Delete record">
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
        </div>
      )}

      {activeTab === 'inspections' && (
        <div className="space-y-4">
          {famachaFilter !== null && (
            <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg px-4 py-2">
              <p className="text-sm text-primary-700"><Filter className="h-4 w-4 inline mr-1" />Showing FAMACHA score {famachaFilter === 4 ? '4-5' : famachaFilter} only</p>
              <Button variant="ghost" size="sm" onClick={() => setFamachaFilter(null)}><X className="h-3 w-3 mr-1" /> Clear</Button>
            </div>
          )}
          <Card padding="none">
            {!filteredInspections?.length ? (
              <EmptyState
                icon={<ClipboardCheck className="h-12 w-12" />}
                title="No inspections recorded"
                description="Regular inspections help monitor your herd's health"
                action={<Button onClick={() => setShowInspectionModal(true)}>New Inspection</Button>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-500">
                    <tr>
                      <SortableHeader label="Date" sortKey="date" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <SortableHeader label="Animal" sortKey="animal" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <SortableHeader label="FAMACHA" sortKey="famacha" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <SortableHeader label="BCS" sortKey="bcs" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <SortableHeader label="Weight" sortKey="weight" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <SortableHeader label="Temp" sortKey="temp" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredInspections.map((insp: any) => {
                      const famachaStatus = insp.famacha ? getFamachaStatus(insp.famacha) : null;
                      return (
                        <tr key={insp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{formatDate(insp.date)}</td>
                          <td className="px-4 py-3">
                            {insp.animals ? (
                              <AnimalLink 
                                animalId={insp.animal_id} 
                                name={insp.animals.name}
                                variant="subtle"
                              />
                            ) : (
                              <span className="text-gray-500">Unknown</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {insp.famacha ? (
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full ${getFamachaColor(insp.famacha)}`} />
                                <span className={famachaStatus?.color}>{insp.famacha}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {insp.body_condition_score || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {insp.weight ? `${insp.weight} ${insp.weight_unit}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {insp.temperature ? `${insp.temperature}°${insp.temperature_unit}` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {insp.action_required ? (
                              <Badge variant="warning">Required</Badge>
                            ) : (
                              <Badge variant="success">None</Badge>
                            )}
                          </td>
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

      {/* Delete Confirmation Modal */}
      <Modal open={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Delete Health Record" size="sm"
        footer={<><Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button><Button variant="danger" onClick={() => showDeleteConfirm && handleDeleteRecord(showDeleteConfirm)}>Delete</Button></>}>
        <p className="text-gray-600">Are you sure you want to delete this health record? This cannot be undone.</p>
      </Modal>

      {/* Follow-Up Resolve Modal */}
      <Modal open={!!showFollowUpResolve} onClose={() => setShowFollowUpResolve(null)} title="Resolve Follow-Up" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowFollowUpResolve(null)}>Cancel</Button>
          <Button variant="ghost" onClick={() => { if (showFollowUpResolve) { setShowFollowUpResolve(null); setNewRecord(prev => ({ ...prev, animal_id: showFollowUpResolve.animal_id })); setShowAddRecordModal(true); } }}>Add New Record</Button>
          <Button onClick={() => { if (showFollowUpResolve) { markComplete.mutate(showFollowUpResolve.id); setShowFollowUpResolve(null); } }} loading={markComplete.isPending}>Mark Complete</Button>
        </>}>
        {showFollowUpResolve && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="font-medium text-amber-800">{showFollowUpResolve.animals?.name || 'Unknown'} — {showFollowUpResolve.type?.replace('_', ' ')}</p>
              <p className="text-sm text-amber-700 mt-1">{showFollowUpResolve.treatment || showFollowUpResolve.medication || 'No details'}</p>
              <p className="text-xs text-amber-600 mt-1">Original: {formatDate(showFollowUpResolve.date)} • Due: {formatDate(showFollowUpResolve.follow_up_date)}</p>
            </div>
            <p className="text-sm text-gray-600">Mark this follow-up as complete, or add a new health record for this animal.</p>
          </div>
        )}
      </Modal>

      {/* Add Health Record Modal */}
      <Modal
        open={showAddRecordModal}
        onClose={() => setShowAddRecordModal(false)}
        title="Add Health Record"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddRecordModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRecord} loading={isSubmitting || createRecord.isPending}>
              Save Record
            </Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <Select
            label="Animal"
            options={[
              { value: '', label: 'Select animal...' },
              ...(animals?.map((a) => ({ value: a.id, label: a.name })) || []),
            ]}
            value={newRecord.animal_id}
            onChange={(e) => setNewRecord({ ...newRecord, animal_id: e.target.value })}
            required
          />
          <Select
            label="Type"
            options={healthTypeOptions.filter((o) => o.value !== 'all')}
            value={newRecord.type}
            onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value as any })}
            required
          />
          <Input
            label="Date"
            type="date"
            value={newRecord.date}
            onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
            required
          />
          <Input
            label="Treatment/Procedure"
            value={newRecord.treatment}
            onChange={(e) => setNewRecord({ ...newRecord, treatment: e.target.value })}
            placeholder="e.g., CDT Vaccination, Ivermectin"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Medication"
              value={newRecord.medication}
              onChange={(e) => setNewRecord({ ...newRecord, medication: e.target.value })}
              placeholder="e.g., Ivomec"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Dosage"
                type="number"
                step="0.1"
                value={newRecord.dosage}
                onChange={(e) => setNewRecord({ ...newRecord, dosage: e.target.value })}
                placeholder="2.5"
              />
              <Select
                label="Unit"
                options={[
                  { value: 'ml', label: 'ml' },
                  { value: 'cc', label: 'cc' },
                  { value: 'mg', label: 'mg' },
                  { value: 'g', label: 'g' },
                ]}
                value={newRecord.dosage_unit}
                onChange={(e) => setNewRecord({ ...newRecord, dosage_unit: e.target.value })}
              />
            </div>
          </div>
          <Select
            label="Route"
            options={routeOptions}
            value={newRecord.route}
            onChange={(e) => setNewRecord({ ...newRecord, route: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Withdrawal Days"
              type="number"
              value={newRecord.withdrawal_days}
              onChange={(e) => setNewRecord({ ...newRecord, withdrawal_days: e.target.value })}
              placeholder="14"
            />
            <Input
              label="Cost ($)"
              type="number"
              step="0.01"
              value={newRecord.cost}
              onChange={(e) => setNewRecord({ ...newRecord, cost: e.target.value })}
              placeholder="25.00"
            />
          </div>
          <Input
            label="Follow-up Date"
            type="date"
            value={newRecord.follow_up_date}
            onChange={(e) => setNewRecord({ ...newRecord, follow_up_date: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              value={newRecord.notes}
              onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
              placeholder="Additional notes..."
            />
          </div>

          {/* Photo Upload Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                <Camera className="h-4 w-4 inline mr-2" />
                Photos (optional)
              </label>
              <span className="text-xs text-gray-500">{healthPhotos.length}/5 max</span>
            </div>

            {healthPhotos.length > 0 && (
              <Select
                label="Photo Category"
                options={HEALTH_PHOTO_CATEGORIES}
                value={healthPhotoCategory}
                onChange={(e) => setHealthPhotoCategory(e.target.value)}
              />
            )}

            {healthPhotos.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-3">
                {healthPhotos.map((file, index) => (
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

            {healthPhotos.length < 5 && (
              <label className="block mt-3">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer">
                  <Camera className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {healthPhotos.length === 0 ? 'Add photos' : 'Add more photos'}
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

      {/* New Inspection Modal */}
      <Modal
        open={showInspectionModal}
        onClose={() => setShowInspectionModal(false)}
        title="New Health Inspection"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowInspectionModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddInspection} loading={createInspection.isPending}>
              Save Inspection
            </Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <Select
            label="Animal"
            options={[
              { value: '', label: 'Select animal...' },
              ...(animals?.map((a) => ({ value: a.id, label: a.name })) || []),
            ]}
            value={newInspection.animal_id}
            onChange={(e) => setNewInspection({ ...newInspection, animal_id: e.target.value })}
            required
          />
          <Input
            label="Date"
            type="date"
            value={newInspection.date}
            onChange={(e) => setNewInspection({ ...newInspection, date: e.target.value })}
            required
          />

          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" /> FAMACHA & Body Condition
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="FAMACHA Score"
                options={[{ value: '', label: 'Select...' }, ...famachaOptions]}
                value={newInspection.famacha}
                onChange={(e) => setNewInspection({ ...newInspection, famacha: e.target.value })}
              />
              <Select
                label="Body Condition Score"
                options={[{ value: '', label: 'Select...' }, ...bcsOptions]}
                value={newInspection.body_condition_score}
                onChange={(e) => setNewInspection({ ...newInspection, body_condition_score: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Thermometer className="h-4 w-4" /> Vitals
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Weight (lbs)"
                type="number"
                step="0.1"
                value={newInspection.weight}
                onChange={(e) => setNewInspection({ ...newInspection, weight: e.target.value })}
                placeholder="125.5"
              />
              <Input
                label="Temperature (°F)"
                type="number"
                step="0.1"
                value={newInspection.temperature}
                onChange={(e) => setNewInspection({ ...newInspection, temperature: e.target.value })}
                placeholder="102.5"
              />
              <Input
                label="Respiration (breaths/min)"
                type="number"
                value={newInspection.respiration}
                onChange={(e) => setNewInspection({ ...newInspection, respiration: e.target.value })}
                placeholder="20"
              />
              <Input
                label="Heart Rate (bpm)"
                type="number"
                value={newInspection.heart_rate}
                onChange={(e) => setNewInspection({ ...newInspection, heart_rate: e.target.value })}
                placeholder="80"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Behavior
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Appetite"
                options={appetiteOptions}
                value={newInspection.appetite}
                onChange={(e) => setNewInspection({ ...newInspection, appetite: e.target.value })}
              />
              <Select
                label="Attitude"
                options={attitudeOptions}
                value={newInspection.attitude}
                onChange={(e) => setNewInspection({ ...newInspection, attitude: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="action_required"
                checked={newInspection.action_required}
                onChange={(e) => setNewInspection({ ...newInspection, action_required: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="action_required" className="font-medium text-gray-900">
                Action Required
              </label>
            </div>
            {newInspection.action_required && (
              <Input
                label="Action Taken"
                value={newInspection.action_taken}
                onChange={(e) => setNewInspection({ ...newInspection, action_taken: e.target.value })}
                placeholder="e.g., Administered dewormer"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              value={newInspection.notes}
              onChange={(e) => setNewInspection({ ...newInspection, notes: e.target.value })}
              placeholder="Additional observations..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
