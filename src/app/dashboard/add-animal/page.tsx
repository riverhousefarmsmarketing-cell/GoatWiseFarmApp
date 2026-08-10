'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAnimals } from '@/hooks/useAnimals';
import { useHerds } from '@/hooks/useHerds';
import { useGroups } from '@/hooks/useGroups';
import {
  Card,
  Button,
  Input,
  Select,
} from '@/components/ui';
import {
  ArrowLeft,
  Save,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { type Species, getSpeciesConfig } from '@/lib/speciesConfig';
import { isFemale, isIntactMale } from '@/lib/animalVocab';
import { BREEDS } from '@/lib/breedData';

// ==========================================
// STATIC OPTIONS (species-independent)
// ==========================================

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'deceased', label: 'Deceased' },
];

const healthStatusOptions = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'under_treatment', label: 'Under Treatment' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'critical', label: 'Critical' },
  { value: 'pregnant', label: 'Pregnant' },
];

const polledGeneOptions = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'PP', label: 'PP (Homozygous Polled)' },
  { value: 'Pp', label: 'Pp (Heterozygous Polled)' },
  { value: 'pp', label: 'pp (Horned)' },
];

const geneticRatingOptions = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const maternalAbilityOptions = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'average', label: 'Average' },
  { value: 'poor', label: 'Poor' },
];

// ==========================================
// COLLAPSIBLE SECTION COMPONENT
// ==========================================

function Section({ 
  title, 
  children, 
  defaultOpen = false 
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </button>
      {isOpen && (
        <div className="p-4 space-y-4 border-t">
          {children}
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function AddAnimalPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  const { data: herds } = useHerds();
  const { data: groups } = useGroups();
  const { data: allAnimals } = useAnimals({ status: 'active' });

  // Does and bucks for pedigree selection
  const does = allAnimals?.filter(isFemale) || [];
  const bucks = allAnimals?.filter(isIntactMale) || [];

  // Species state — drives all terminology, categories, and breed list
  const [species, setSpecies] = useState<Species>('goat');
  const speciesConfig = useMemo(() => getSpeciesConfig(species), [species]);

  const breedOptions = useMemo(() => [
    { value: '', label: 'Select breed...' },
    ...BREEDS[species].map(b => ({ value: b.name, label: b.name })),
    { value: 'Mixed/Grade', label: 'Mixed/Grade' },
    { value: 'Other', label: 'Other' },
  ], [species]);

  const categoryOptions = useMemo(() => [
    { value: 'milking_female', label: speciesConfig.categories.milkingFemale },
    { value: 'dry_female', label: speciesConfig.categories.dryFemale },
    { value: 'bred_female', label: speciesConfig.categories.bredFemale },
    { value: 'young_female', label: speciesConfig.categories.youngFemale },
    { value: 'male', label: speciesConfig.categories.male },
    { value: 'young_male', label: speciesConfig.categories.youngMale },
    { value: 'castrated', label: speciesConfig.categories.castrated },
    { value: 'young', label: speciesConfig.categories.young },
  ], [speciesConfig]);

  const sexOptions = useMemo(() => [
    { value: 'female', label: `${speciesConfig.female} (Female)` },
    { value: 'male', label: `${speciesConfig.male} (Intact Male)` },
    { value: 'castrated', label: `${speciesConfig.castrated} (Castrated Male)` },
  ], [speciesConfig]);

  // Form state - organized by section
  const [form, setForm] = useState({
    // Basic Information
    name: '',
    tag_number: '',
    tattoo: '',
    breed: '',
    secondary_breed: '',
    sex: 'female',
    category: 'milking_female',
    date_of_birth: '',
    color: '',
    markings: '',
    weight: '',
    status: 'active',
    health_status: 'healthy',

    // Registry Information
    registry_name: '',
    registry_number: '',
    pedigreed: false,
    pedigree_generations: '',

    // Physical Attributes
    polled: false,
    disbudded: false,
    disbudded_date: '',
    castration_date: '',

    // Farm Management
    herd_id: '',
    group_ids: [] as string[],
    born_on_farm: true,
    purchase_date: '',
    purchase_cost: '',
    purchase_source: '',

    // Pedigree
    dam_id: '',
    sire_id: '',

    // Genetics
    polled_gene: 'unknown',
    milk_production_genetics: 'unknown',
    growth_rate_genetics: 'unknown',
    parasite_resistance: 'unknown',
    maternal_ability: 'unknown',
    fertility_rating: 'unknown',

    // Notes
    notes: '',
  });

  // Create mutation
  const createAnimal = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const { data: result, error } = await supabase
         .from('animals')
         .insert([{ ...data, user_id: user?.id }] as any)
         .select()
         .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      router.push(`/dashboard/herd/${data.id}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const animalData = {
      // Basic
      name: form.name.trim(),
      species,
      tag_number: form.tag_number || null,
      tattoo: form.tattoo || null,
      breed: form.breed || null,
      secondary_breed: form.secondary_breed || null,
      sex: form.sex,
      category: form.category,
      date_of_birth: form.date_of_birth || null,
      color: form.color || null,
      markings: form.markings || null,
      weight: form.weight ? parseFloat(form.weight) : null,
      status: form.status,
      health_status: form.health_status,

      // Registry
      registry_name: form.registry_name || null,
      registry_number: form.registry_number || null,
      pedigreed: form.pedigreed,
      pedigree_generations: form.pedigree_generations ? parseInt(form.pedigree_generations) : null,

      // Physical
      polled: form.polled,
      disbudded: form.disbudded,
      disbudded_date: form.disbudded_date || null,
      castration_date: form.castration_date || null,

      // Farm
      herd_id: form.herd_id || null,
      group_ids: form.group_ids.length > 0 ? form.group_ids : null,
      born_on_farm: form.born_on_farm,
      purchase_date: form.purchase_date || null,
      purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : null,
      purchase_source: form.purchase_source || null,

      // Pedigree
      dam_id: form.dam_id || null,
      sire_id: form.sire_id || null,

      // Genetics (stored as JSONB)
      genetic_traits: {
        polled_gene: form.polled_gene,
        milk_production_genetics: form.milk_production_genetics,
        growth_rate_genetics: form.growth_rate_genetics,
        parasite_resistance: form.parasite_resistance,
        maternal_ability: form.maternal_ability,
        fertility_rating: form.fertility_rating,
      },

      notes: form.notes || null,
    };

    await createAnimal.mutateAsync(animalData);
  };

  const updateForm = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleGroupId = (groupId: string) => {
    setForm(prev => ({
      ...prev,
      group_ids: prev.group_ids.includes(groupId)
        ? prev.group_ids.filter(id => id !== groupId)
        : [...prev.group_ids, groupId],
    }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{speciesConfig.addAnimalLabel}</h1>
          <p className="text-gray-500">Complete profile with all details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information - Always Open */}
        <Section title="Basic Information" defaultOpen={true}>
          {/* Species selector — must come first, drives all other options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Species *"
              options={[
                { value: 'goat', label: '🐐 Goat' },
                { value: 'sheep', label: '🐑 Sheep' },
              ]}
              value={species}
              onChange={(e) => {
                setSpecies(e.target.value as Species);
                updateForm('sex', 'female');
                updateForm('category', 'milking_female');
                updateForm('breed', '');
              }}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name *"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              placeholder="e.g., Daisy"
              required
            />
            <Input
              label="Tag Number"
              value={form.tag_number}
              onChange={(e) => updateForm('tag_number', e.target.value)}
              placeholder="e.g., 001"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Breed"
              options={breedOptions}
              value={form.breed}
              onChange={(e) => updateForm('breed', e.target.value)}
            />
            <Input
              label="Secondary Breed"
              value={form.secondary_breed}
              onChange={(e) => updateForm('secondary_breed', e.target.value)}
              placeholder="If crossbred"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Sex"
              options={sexOptions}
              value={form.sex}
              onChange={(e) => updateForm('sex', e.target.value)}
            />
            <Select
              label="Category"
              options={categoryOptions}
              value={form.category}
              onChange={(e) => updateForm('category', e.target.value)}
            />
            <Input
              label="Date of Birth"
              type="date"
              max={format(new Date(), 'yyyy-MM-dd')}
              value={form.date_of_birth}
              onChange={(e) => updateForm('date_of_birth', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Color"
              value={form.color}
              onChange={(e) => updateForm('color', e.target.value)}
              placeholder="e.g., Black & White"
            />
            <Input
              label="Markings"
              value={form.markings}
              onChange={(e) => updateForm('markings', e.target.value)}
              placeholder="e.g., Star on forehead"
            />
            <Input
              label="Weight (lbs)"
              type="number"
              min="0"
              step="0.1"
              value={form.weight}
              onChange={(e) => updateForm('weight', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Status"
              options={statusOptions}
              value={form.status}
              onChange={(e) => updateForm('status', e.target.value)}
            />
            <Select
              label="Health Status"
              options={healthStatusOptions}
              value={form.health_status}
              onChange={(e) => updateForm('health_status', e.target.value)}
            />
          </div>
        </Section>

        {/* Identification & Registry */}
        <Section title="Identification & Registry">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tattoo"
              value={form.tattoo}
              onChange={(e) => updateForm('tattoo', e.target.value)}
              placeholder="e.g., L ear: ABC, R ear: 123"
            />
            <Input
              label="Registry Name"
              value={form.registry_name}
              onChange={(e) => updateForm('registry_name', e.target.value)}
              placeholder="e.g., ADGA, AGS"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Registry Number"
              value={form.registry_number}
              onChange={(e) => updateForm('registry_number', e.target.value)}
            />
            <Input
              label="Pedigree Generations"
              type="number"
              value={form.pedigree_generations}
              onChange={(e) => updateForm('pedigree_generations', e.target.value)}
              placeholder="e.g., 3"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.pedigreed}
                onChange={(e) => updateForm('pedigreed', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Registered/Pedigreed</span>
            </label>
          </div>
        </Section>

        {/* Physical Attributes */}
        <Section title="Physical Attributes">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.polled}
                  onChange={(e) => updateForm('polled', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Naturally Polled (hornless)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.disbudded}
                  onChange={(e) => updateForm('disbudded', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Disbudded</span>
              </label>
            </div>
            {form.disbudded && (
              <Input
                label="Disbudding Date"
                type="date"
                value={form.disbudded_date}
                onChange={(e) => updateForm('disbudded_date', e.target.value)}
              />
            )}
            {(form.sex === 'castrated' || form.category === 'castrated') && (
              <Input
                label="Castration Date"
                type="date"
                value={form.castration_date}
                onChange={(e) => updateForm('castration_date', e.target.value)}
              />
            )}
          </div>
        </Section>

        {/* Farm Management */}
        <Section title="Farm Management">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Assign to Herd"
              options={[
                { value: '', label: 'No herd assigned' },
                ...(herds?.map(h => ({ value: h.id, label: h.name })) || []),
              ]}
              value={form.herd_id}
              onChange={(e) => updateForm('herd_id', e.target.value)}
            />
            <div>
              <label className="flex items-center gap-2 cursor-pointer mt-8">
                <input
                  type="checkbox"
                  checked={form.born_on_farm}
                  onChange={(e) => updateForm('born_on_farm', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Born on this farm</span>
              </label>
            </div>
          </div>

          {/* Groups */}
          {groups && groups.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Groups</label>
              <div className="flex flex-wrap gap-2">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => toggleGroupId(group.id)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.group_ids.includes(group.id)
                        ? 'border-transparent text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                    style={{
                      backgroundColor: form.group_ids.includes(group.id) ? group.color : undefined,
                    }}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!form.born_on_farm && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Purchase Date"
                type="date"
                value={form.purchase_date}
                onChange={(e) => updateForm('purchase_date', e.target.value)}
              />
              <Input
                label="Purchase Cost ($)"
                type="number"
                min="0"
                step="0.01"
                value={form.purchase_cost}
                onChange={(e) => updateForm('purchase_cost', e.target.value)}
              />
              <Input
                label="Purchase Source"
                value={form.purchase_source}
                onChange={(e) => updateForm('purchase_source', e.target.value)}
                placeholder="Farm name or breeder"
              />
            </div>
          )}
        </Section>

        {/* Pedigree */}
        <Section title="Pedigree">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Dam (Mother)"
              options={[
                { value: '', label: 'Unknown / Not in system' },
                ...does.map(d => ({ value: d.id, label: d.name })),
              ]}
              value={form.dam_id}
              onChange={(e) => updateForm('dam_id', e.target.value)}
            />
            <Select
              label="Sire (Father)"
              options={[
                { value: '', label: 'Unknown / Not in system' },
                ...bucks.map(b => ({ value: b.id, label: b.name })),
              ]}
              value={form.sire_id}
              onChange={(e) => updateForm('sire_id', e.target.value)}
            />
          </div>
        </Section>

        {/* Genetics */}
        <Section title="Genetic Traits">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Polled Gene Status"
              options={polledGeneOptions}
              value={form.polled_gene}
              onChange={(e) => updateForm('polled_gene', e.target.value)}
            />
            <Select
              label="Milk Production Genetics"
              options={geneticRatingOptions}
              value={form.milk_production_genetics}
              onChange={(e) => updateForm('milk_production_genetics', e.target.value)}
            />
            <Select
              label="Growth Rate Genetics"
              options={geneticRatingOptions}
              value={form.growth_rate_genetics}
              onChange={(e) => updateForm('growth_rate_genetics', e.target.value)}
            />
            <Select
              label="Parasite Resistance"
              options={geneticRatingOptions}
              value={form.parasite_resistance}
              onChange={(e) => updateForm('parasite_resistance', e.target.value)}
            />
            <Select
              label="Maternal Ability"
              options={maternalAbilityOptions}
              value={form.maternal_ability}
              onChange={(e) => updateForm('maternal_ability', e.target.value)}
            />
            <Select
              label="Fertility Rating"
              options={geneticRatingOptions}
              value={form.fertility_rating}
              onChange={(e) => updateForm('fertility_rating', e.target.value)}
            />
          </div>
        </Section>

        {/* Notes */}
        <Section title="Notes" defaultOpen={true}>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[100px]"
            value={form.notes}
            onChange={(e) => updateForm('notes', e.target.value)}
            placeholder="Any additional notes about this animal..."
          />
        </Section>

        {/* Submit Button */}
        <div className="flex justify-end gap-4 pt-4">
          <Button variant="ghost" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" loading={createAnimal.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Animal
          </Button>
        </div>
      </form>
    </div>
  );
}
