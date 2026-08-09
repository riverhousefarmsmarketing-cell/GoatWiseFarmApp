'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  Card, 
  Button, 
  Input, 
  Select, 
  Modal 
} from '@/components/ui';
import { 
  User, 
  Building2, 
  Bell, 
  Palette, 
  Database, 
  Save, 
  Check,
  Loader2,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';

// ============================================
// SAMPLE DATA LOADER COMPONENT
// ============================================

const SAMPLE_HERDS = [
  { name: 'Main Dairy Herd', description: 'Primary milking does' },
  { name: 'Breeding Stock', description: 'Does and bucks for breeding program' },
  { name: 'Kids & Youngstock', description: 'Current year kids and yearlings' },
];

// NOTE: the column is date_of_birth, not birth_date. These entries still said
// birth_date after the rename, so every insert here failed with 42703 and the
// loader never got past step 2. (public.guardians really does use birth_date --
// the two tables genuinely differ, so don't "fix" SAMPLE_GUARDIANS to match.)
const SAMPLE_ANIMALS = [
  { name: 'Maple', breed: 'Nigerian Dwarf', sex: 'doe', category: 'milking_doe', date_of_birth: '2021-03-15', tag_number: 'ND-001', registration_number: 'ADGA N001234', status: 'active' },
  { name: 'Willow', breed: 'LaMancha', sex: 'doe', category: 'milking_doe', date_of_birth: '2020-04-22', tag_number: 'LM-001', registration_number: 'ADGA L002345', status: 'active' },
  { name: 'Clover', breed: 'Mini-LaMancha', sex: 'doe', category: 'milking_doe', date_of_birth: '2022-02-10', tag_number: 'MLM-001', status: 'active' },
  { name: 'Daisy', breed: 'Nigerian Dwarf', sex: 'doe', category: 'milking_doe', date_of_birth: '2021-05-08', tag_number: 'ND-002', registration_number: 'ADGA N001567', status: 'active' },
  { name: 'Rosemary', breed: 'LaMancha', sex: 'doe', category: 'milking_doe', date_of_birth: '2019-03-20', tag_number: 'LM-002', status: 'active' },
  { name: 'Sage', breed: 'Nigerian Dwarf', sex: 'doe', category: 'bred_doe', date_of_birth: '2022-04-12', tag_number: 'ND-003', status: 'active' },
  { name: 'Ivy', breed: 'Mini-LaMancha', sex: 'doe', category: 'bred_doe', date_of_birth: '2021-06-18', tag_number: 'MLM-002', status: 'active' },
  { name: 'Hazel', breed: 'LaMancha', sex: 'doe', category: 'dry_doe', date_of_birth: '2018-04-05', tag_number: 'LM-003', status: 'active' },
  { name: 'Poppy', breed: 'Nigerian Dwarf', sex: 'doe', category: 'doeling', date_of_birth: '2024-03-10', tag_number: 'ND-004', status: 'active' },
  { name: 'Violet', breed: 'Mini-LaMancha', sex: 'doe', category: 'doeling', date_of_birth: '2024-04-02', tag_number: 'MLM-003', status: 'active' },
  { name: 'Fern', breed: 'LaMancha', sex: 'doe', category: 'doeling', date_of_birth: '2024-02-28', tag_number: 'LM-004', status: 'active' },
  { name: 'Thunder', breed: 'Nigerian Dwarf', sex: 'buck', category: 'buck', date_of_birth: '2020-09-15', tag_number: 'ND-B01', registration_number: 'ADGA N003456', status: 'active' },
  { name: 'Apollo', breed: 'LaMancha', sex: 'buck', category: 'buck', date_of_birth: '2021-08-22', tag_number: 'LM-B01', registration_number: 'ADGA L004567', status: 'active' },
  { name: 'Comet', breed: 'Nigerian Dwarf', sex: 'buck', category: 'buckling', date_of_birth: '2024-03-12', tag_number: 'ND-B02', status: 'active' },
  { name: 'Biscuit', breed: 'Nigerian Dwarf', sex: 'buck', category: 'wether', date_of_birth: '2023-04-05', tag_number: 'ND-W01', status: 'active' },
  { name: 'Juniper', breed: 'Nigerian Dwarf', sex: 'doe', category: 'milking_doe', date_of_birth: '2019-05-10', tag_number: 'ND-005', status: 'sold', notes: 'Sold to Happy Acres Farm' },
];

// Every table the loader writes to, ordered children-before-parents so a
// straight pass of deletes never trips a foreign key. Shared by the rollback
// and by Clear All Data so the two can't drift apart.
const SAMPLE_DATA_TABLES = [
  'feed_inventory',
  'feed_usage',
  'feed_schedules',
  'feed_types',
  'guardian_health_records',
  'guardian_vaccinations',
  'predation_events',
  'kidding_records',
  'breeding_records',
  'breeding_plans',
  'milk_records',
  'weight_records',
  'inspections',
  'health_records',
  'animal_groups',
  'groups',
  'guardians',
  'paddock_moves',
  'paddocks',
  'transactions',
  'herd_transfers',
  'animals',
  'herds',
  'photos',
];

const SAMPLE_GROUPS = [
  { name: 'Morning Milkers', type: 'milking', color: '#F59E0B', description: 'Does milked in AM shift' },
  { name: 'Evening Milkers', type: 'milking', color: '#8B5CF6', description: 'Does milked in PM shift' },
  { name: 'Fall Breeding', type: 'breeding', color: '#EC4899', description: 'Does bred for spring kidding' },
  { name: 'Show String', type: 'custom', color: '#3B82F6', description: 'Animals for upcoming shows' },
];

const SAMPLE_GUARDIANS = [
  { name: 'Bear', type: 'lgd', breed: 'Great Pyrenees', sex: 'male', birth_date: '2021-06-15', status: 'active', training_status: 'fully_trained', effectiveness_rating: 5, weight: 110 },
  { name: 'Luna', type: 'lgd', breed: 'Anatolian Shepherd', sex: 'female', birth_date: '2022-03-20', status: 'active', training_status: 'fully_trained', effectiveness_rating: 4, weight: 95 },
  { name: 'Patches', type: 'llama', breed: 'Classic Llama', sex: 'male', birth_date: '2019-05-10', status: 'active', training_status: 'fully_trained', effectiveness_rating: 4, weight: 350 },
];

function SampleDataSection() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const today = new Date();
  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');

  const addProgress = (message: string) => {
    setProgress(prev => [...prev, message]);
  };

  /** Removes every row this user owns across the sample tables. */
  const wipeUserData = async (announce: boolean) => {
    for (const table of SAMPLE_DATA_TABLES) {
      if (announce) addProgress(`Deleting ${table}...`);
      const { error: delError } = await (supabase.from(table) as any)
        .delete()
        .eq('user_id', user!.id);
      // Surface failures instead of swallowing them -- a table that silently
      // refuses to clear is how duplicates creep back in.
      if (delError && announce) {
        addProgress(`   ⚠ ${table}: ${delError.message}`);
      }
    }
  };

  const loadSampleData = async () => {
    if (!user) return;

    setIsLoading(true);
    setProgress([]);
    setError(null);
    setIsComplete(false);

    // Tracks whether anything was written, so the pre-flight rejection below
    // doesn't trigger a pointless wipe.
    let wroteData = false;

    try {
      // Refuse to run on an account that already holds data. Without this the
      // loader happily ran a second time and stacked another full set of herds
      // on top of the first, which is exactly what happened in beta.
      addProgress('Checking for existing data...');
      const [{ count: animalCount }, { count: herdCount }] = await Promise.all([
        supabase
          .from('animals')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('herds')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      if ((animalCount ?? 0) > 0 || (herdCount ?? 0) > 0) {
        throw new Error(
          `This account already has ${animalCount ?? 0} animal(s) and ` +
            `${herdCount ?? 0} herd(s). Sample data can only be loaded into an ` +
            `empty account -- use "Clear All Data" first if you want to start over. ` +
            `Nothing has been changed.`
        );
      }

      const animalIds: Record<string, string> = {};
      const buckIds: Record<string, string> = {};
      const milkingDoeIds: Record<string, string> = {};
      const guardianIds: Record<string, string> = {};
      const feedTypeIds: Record<string, string> = {};
      const herdIds: Record<string, string> = {};
      const groupIds: Record<string, string> = {};

      // Past this point rows exist, so any failure has to be rolled back.
      wroteData = true;

      // 1. Create Herds
      addProgress('Creating herds...');
      for (const herd of SAMPLE_HERDS) {
        const { data, error } = await (supabase.from('herds') as any)
          .insert({ ...herd, user_id: user.id })
          .select()
          .single();
        if (error) throw new Error(`Herd error: ${error.message}`);
        herdIds[herd.name] = data.id;
      }
      addProgress(`✓ Created ${SAMPLE_HERDS.length} herds`);

      // 2. Create Animals
      addProgress('Creating animals...');
      for (const animal of SAMPLE_ANIMALS) {
        const herdId = animal.category.includes('doe') || animal.category === 'milking_doe' 
          ? herdIds['Main Dairy Herd']
          : animal.category.includes('buck') 
            ? herdIds['Breeding Stock']
            : herdIds['Kids & Youngstock'];

        const { data, error } = await (supabase.from('animals') as any)
          .insert({ ...animal, user_id: user.id, herd_id: herdId })
          .select()
          .single();
        if (error) throw new Error(`Animal error: ${error.message}`);
        
        animalIds[animal.name] = data.id;
        // Track bucks (category is 'buck')
        if (animal.category === 'buck') {
          buckIds[animal.name] = data.id;
        }
        // Track milking does
        if (animal.category === 'milking_doe') {
          milkingDoeIds[animal.name] = data.id;
        }
      }
      addProgress(`✓ Created ${SAMPLE_ANIMALS.length} animals`);
      addProgress(`   (${Object.keys(milkingDoeIds).length} milking does, ${Object.keys(buckIds).length} bucks)`);

      // 3. Create Groups
      addProgress('Creating groups...');
      for (const group of SAMPLE_GROUPS) {
        const { data, error } = await (supabase.from('groups') as any)
          .insert({ ...group, user_id: user.id })
          .select()
          .single();
        if (error) throw new Error(`Group error: ${error.message}`);
        groupIds[group.name] = data.id;
      }
      addProgress(`✓ Created ${SAMPLE_GROUPS.length} groups`);

      // 4. Assign animals to groups
      addProgress('Assigning animals to groups...');
      const groupAssignments = [
        { group: 'Morning Milkers', animals: ['Maple', 'Willow', 'Clover'] },
        { group: 'Evening Milkers', animals: ['Daisy', 'Rosemary'] },
        { group: 'Fall Breeding', animals: ['Sage', 'Ivy'] },
        { group: 'Show String', animals: ['Maple', 'Thunder', 'Poppy'] },
      ];
      
      for (const assignment of groupAssignments) {
        for (const animalName of assignment.animals) {
          if (animalIds[animalName] && groupIds[assignment.group]) {
            await (supabase.from('animal_groups') as any).insert({
              animal_id: animalIds[animalName],
              group_id: groupIds[assignment.group],
            });
          }
        }
      }
      addProgress('✓ Assigned animals to groups');

      // 5. Create Guardians
      addProgress('Creating guardian animals...');
      for (const guardian of SAMPLE_GUARDIANS) {
        const { data, error } = await (supabase.from('guardians') as any)
          .insert({ ...guardian, user_id: user.id, acquired_date: formatDate(subDays(today, 365)) })
          .select()
          .single();
        if (error) throw new Error(`Guardian error: ${error.message}`);
        guardianIds[guardian.name] = data.id;
      }
      addProgress(`✓ Created ${SAMPLE_GUARDIANS.length} guardians`);

      // 6. Create Health Records
      addProgress('Creating health records...');
      let healthCount = 0;
      for (const [name, id] of Object.entries(animalIds)) {
        // CDT vaccination
        await (supabase.from('health_records') as any).insert({
          user_id: user.id,
          animal_id: id,
          type: 'vaccination',
          date: formatDate(subDays(today, 180)),
          treatment: 'CDT',
          medication: 'Bar-Vac CD/T',
          dosage: 2,
          dosage_unit: 'ml',
          route: 'sq',
          cost: 3.50,
        });
        healthCount++;

        // Deworming
        if (Math.random() > 0.3) {
          await (supabase.from('health_records') as any).insert({
            user_id: user.id,
            animal_id: id,
            type: 'deworming',
            date: formatDate(subDays(today, Math.floor(Math.random() * 90))),
            treatment: 'Ivermectin',
            medication: 'Ivermectin 1%',
            dosage: 0.5,
            dosage_unit: 'ml',
            route: 'oral',
            withdrawal_days: 14,
          });
          healthCount++;
        }

        // Hoof trim
        if (Math.random() > 0.5) {
          await (supabase.from('health_records') as any).insert({
            user_id: user.id,
            animal_id: id,
            type: 'hoof_trim',
            date: formatDate(subDays(today, Math.floor(Math.random() * 60) + 30)),
            treatment: 'Routine trim',
          });
          healthCount++;
        }
      }
      addProgress(`✓ Created ${healthCount} health records`);

      // 7. Create Inspections
      addProgress('Creating inspections...');
      let inspectionCount = 0;
      for (const [name, id] of Object.entries(animalIds)) {
        const numInspections = Math.floor(Math.random() * 3) + 3;
        for (let i = 0; i < numInspections; i++) {
          const daysAgo = Math.floor((90 / numInspections) * i) + Math.floor(Math.random() * 10);
          const famacha = Math.random() > 0.8 ? Math.floor(Math.random() * 2) + 3 : Math.floor(Math.random() * 2) + 1;
          
          await (supabase.from('inspections') as any).insert({
            user_id: user.id,
            animal_id: id,
            date: formatDate(subDays(today, daysAgo)),
            famacha,
            body_condition_score: parseFloat((Math.random() * 1.5 + 2.5).toFixed(1)),
            weight: Math.floor(Math.random() * 50) + 80,
            weight_unit: 'lbs',
            temperature: parseFloat((101 + Math.random() * 2).toFixed(1)),
            temperature_unit: 'F',
            appetite: 'normal',
            attitude: 'bright',
            action_required: famacha >= 4,
          });
          inspectionCount++;
        }
      }
      addProgress(`✓ Created ${inspectionCount} inspections`);

      // 8. Create Milk Records
      addProgress('Creating milk records (this may take a moment)...');
      let milkCount = 0;
      const milkingDoeEntries = Object.entries(milkingDoeIds);
      addProgress(`   Processing ${milkingDoeEntries.length} milking does...`);
      
      for (const [name, id] of milkingDoeEntries) {
        const baseProduction = 1.5 + Math.random() * 2;
        const milkBatch = [];
        
        for (let day = 0; day < 60; day++) {
          const date = formatDate(subDays(today, day));
          const variance = (Math.random() - 0.5) * 0.4;
          
          milkBatch.push({
            user_id: user.id,
            animal_id: id,
            date,
            session: 'AM',
            amount: parseFloat((baseProduction + variance).toFixed(2)),
          });
          
          milkBatch.push({
            user_id: user.id,
            animal_id: id,
            date,
            session: 'PM',
            amount: parseFloat((baseProduction * 0.85 + variance).toFixed(2)),
          });
        }
        
        // Batch insert
        for (let i = 0; i < milkBatch.length; i += 50) {
          const batch = milkBatch.slice(i, i + 50);
          const { error: milkError } = await (supabase.from('milk_records') as any).insert(batch);
          if (milkError) {
            console.error('Milk record error:', milkError);
            throw new Error(`Milk record error: ${milkError.message}`);
          }
        }
        milkCount += milkBatch.length;
      }
      addProgress(`✓ Created ${milkCount} milk records`);

      // 9. Create Breeding Records
      addProgress('Creating breeding records...');
      const doeEntries = Object.entries(animalIds).filter(([name]) => 
        SAMPLE_ANIMALS.find(a => a.name === name)?.sex === 'doe'
      );
      const buckEntries = Object.entries(buckIds);
      let breedingCount = 0;
      addProgress(`   Found ${doeEntries.length} does and ${buckEntries.length} bucks`);

      if (buckEntries.length > 0) {
        // Past successful breeding
        for (let i = 0; i < 3 && i < doeEntries.length; i++) {
          const [doeName, doeId] = doeEntries[i];
          const [buckName, buckId] = buckEntries[i % buckEntries.length];
          const breedingDate = subDays(today, 180 + Math.floor(Math.random() * 30));
          
          const { error: breedError } = await (supabase.from('breeding_records') as any).insert({
            user_id: user.id,
            doe_id: doeId,
            buck_id: buckId,
            breeding_date: formatDate(breedingDate),
            due_date: formatDate(addDays(breedingDate, 150)),
            status: 'kidded',
            kidding_date: formatDate(addDays(breedingDate, 150)),
            number_of_kids: Math.floor(Math.random() * 3) + 1,
          });
          if (breedError) {
            console.error('Breeding error:', breedError);
            throw new Error(`Breeding record error: ${breedError.message}`);
          }
          breedingCount++;
        }

        // Current confirmed breeding
        for (let i = 3; i < 5 && i < doeEntries.length; i++) {
          const [doeName, doeId] = doeEntries[i];
          const [buckName, buckId] = buckEntries[i % buckEntries.length];
          const breedingDate = subDays(today, 60 + Math.floor(Math.random() * 30));
          
          const { error: breedError2 } = await (supabase.from('breeding_records') as any).insert({
            user_id: user.id,
            doe_id: doeId,
            buck_id: buckId,
            breeding_date: formatDate(breedingDate),
            due_date: formatDate(addDays(breedingDate, 150)),
            status: 'confirmed_pregnant',
          });
          if (breedError2) {
            console.error('Breeding error:', breedError2);
            throw new Error(`Breeding record error: ${breedError2.message}`);
          }
          breedingCount++;
        }
      } else {
        addProgress('   ⚠ No bucks found, skipping breeding records');
      }
      addProgress(`✓ Created ${breedingCount} breeding records`);

      // 10. Create Kidding Records
      addProgress('Creating kidding records...');
      let kiddingCount = 0;
      for (let i = 0; i < 3 && i < doeEntries.length; i++) {
        const [doeName, doeId] = doeEntries[i];
        const numKids = Math.floor(Math.random() * 3) + 1;
        const kiddingDate = subDays(today, 30 + Math.floor(Math.random() * 30));
        
        const { error: kiddingError } = await (supabase.from('kidding_records') as any).insert({
          user_id: user.id,
          doe_id: doeId,
          kidding_date: formatDate(kiddingDate),
          number_born: numKids,
          number_alive: numKids,
          number_does: Math.ceil(numKids / 2),
          number_bucks: Math.floor(numKids / 2),
          difficulty: 'easy',
          notes: 'Healthy kids, no complications',
        });
        if (kiddingError) {
          console.error('Kidding error:', kiddingError);
          addProgress(`   ⚠ Kidding error: ${kiddingError.message}`);
        } else {
          kiddingCount++;
        }
      }
      addProgress(`✓ Created ${kiddingCount} kidding records`);

      // 11. Create Predation Events
      addProgress('Creating predation events...');
      await (supabase.from('predation_events') as any).insert([
        {
          user_id: user.id,
          date: formatDate(subDays(today, 45)),
          predator_type: 'coyote',
          outcome: 'deterred',
          location: 'North pasture fence line',
          description: 'LGDs alerted and chased off single coyote. No injuries.',
          animals_lost: 0,
          animals_injured: 0,
        },
        {
          user_id: user.id,
          date: formatDate(subDays(today, 120)),
          predator_type: 'domestic_dog',
          outcome: 'deterred',
          location: 'Front paddock',
          description: 'Neighbor\'s dog entered property. Bear confronted and dog retreated.',
          animals_lost: 0,
          animals_injured: 0,
        },
      ]);
      addProgress('✓ Created 2 predation events');

      // 11. Create Guardian Health Records
      addProgress('Creating guardian health records...');
      for (const [name, id] of Object.entries(guardianIds)) {
        await (supabase.from('guardian_health_records') as any).insert([
          {
            user_id: user.id,
            guardian_id: id,
            type: 'vaccination',
            date: formatDate(subDays(today, 90)),
            description: 'Annual rabies',
            medication: 'Rabies vaccine',
            vet_name: 'Dr. Smith',
            cost: 25,
          },
          {
            user_id: user.id,
            guardian_id: id,
            type: 'vaccination',
            date: formatDate(subDays(today, 90)),
            description: 'DHPP booster',
            medication: 'DHPP',
            vet_name: 'Dr. Smith',
            cost: 35,
          },
        ]);
      }
      addProgress(`✓ Created ${Object.keys(guardianIds).length * 2} guardian health records`);

      // 13. Create Feed Types & Inventory
      addProgress('Creating feed inventory...');
      const feedTypes = [
        { name: 'Alfalfa Hay', category: 'hay', unit: 'lbs' },
        { name: 'Orchard Grass', category: 'hay', unit: 'lbs' },
        { name: 'Dairy Goat Pellets', category: 'grain', unit: 'lbs' },
        { name: 'BOSS (Sunflower Seeds)', category: 'supplement', unit: 'lbs' },
        { name: 'Loose Minerals', category: 'mineral', unit: 'lbs' },
      ];
      let feedCount = 0;
      for (const feedType of feedTypes) {
        const { data, error: feedError } = await (supabase.from('feed_types') as any)
          .insert({ 
            name: feedType.name,
            category: feedType.category,
            unit: feedType.unit,
            user_id: user.id 
          })
          .select()
          .single();
        if (feedError) {
          console.error('Feed type error:', feedError);
          addProgress(`   ⚠ Feed type error: ${feedError.message}`);
          continue;
        }
        if (data) {
          const { error: invError } = await (supabase.from('feed_inventory') as any).insert({
            user_id: user.id,
            feed_type_id: data.id,
            quantity: Math.floor(Math.random() * 100) + 50,
          });
          if (invError) {
            console.error('Feed inventory error:', invError);
            addProgress(`   ⚠ Inventory error: ${invError.message}`);
          } else {
            feedCount++;
          }
        }
      }
      addProgress(`✓ Created ${feedCount} feed types with inventory`);

      // Done!
      addProgress('');
      addProgress('🎉 Sample data loaded successfully!');
      setIsComplete(true);
      
      queryClient.invalidateQueries();

    } catch (err: any) {
      console.error('Error loading sample data:', err);

      if (wroteData) {
        // The loader is not transactional, so a failure partway through used to
        // leave whatever it had already created sitting in the account -- and a
        // retry then stacked a second copy on top. Undo this run instead.
        // Safe to wipe wholesale: the pre-flight check proved the account was
        // empty before we started.
        addProgress('');
        addProgress('Load failed — rolling back partial data...');
        try {
          await wipeUserData(false);
          addProgress('✓ Rolled back. The account is empty again, safe to retry.');
        } catch (rollbackErr: any) {
          console.error('Rollback failed:', rollbackErr);
          addProgress(
            `⚠ Rollback failed: ${rollbackErr?.message ?? 'unknown error'}. ` +
              `Use "Clear All Data" before retrying.`
          );
        }
      }

      setError(err.message || 'An error occurred while loading sample data');
      queryClient.invalidateQueries();
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    setProgress([]);
    setError(null);

    try {
      addProgress('Clearing all data...');

      // Was a separate hand-maintained list that named feed_logs (no such
      // table) and omitted weight_records, transactions, paddocks and others,
      // so "Clear All Data" quietly left rows behind.
      await wipeUserData(true);

      addProgress('');
      addProgress('✓ All data cleared successfully!');
      
      queryClient.invalidateQueries();
      setShowDeleteModal(false);

    } catch (err: any) {
      console.error('Error clearing data:', err);
      setError(err.message || 'An error occurred while clearing data');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="p-6 border-dashed border-2 border-primary-200 bg-primary-50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-100 rounded-lg">
            <Database className="h-6 w-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Sample Data for Beta Testing</h3>
            <p className="text-sm text-gray-600 mt-1">
              Load a complete demo dataset to explore all features of GoatWise. Includes 16 animals, 
              3 guardians, 60 days of milk records, health inspections, breeding history, kidding records, and feed inventory.
            </p>
            <div className="flex gap-3 mt-4">
              <Button 
                onClick={() => setShowLoadModal(true)}
                leftIcon={<Database className="h-4 w-4" />}
              >
                Load Sample Data
              </Button>
              <Button 
                variant="ghost"
                onClick={() => setShowDeleteModal(true)}
                leftIcon={<Trash2 className="h-4 w-4" />}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Clear All Data
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Load Data Modal */}
      <Modal
        open={showLoadModal}
        onClose={() => !isLoading && setShowLoadModal(false)}
        title="Load Sample Data"
        footer={
          isComplete ? (
            <Button onClick={() => setShowLoadModal(false)}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setShowLoadModal(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={loadSampleData} loading={isLoading} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Load Data'}
              </Button>
            </>
          )
        }
      >
        <div className="space-y-4">
          {!isLoading && !isComplete && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">This will add sample data to your account</p>
                  <p className="text-sm text-amber-700 mt-1">
                    The sample dataset includes animals, health records, milk production data, breeding history, 
                    and feed inventory. This data will be mixed with any existing data.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {progress.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="space-y-1 font-mono text-sm">
                {progress.map((line, i) => (
                  <div key={i} className={line.startsWith('✓') ? 'text-green-600' : line.startsWith('🎉') ? 'text-primary-600 font-bold' : 'text-gray-600'}>
                    {line}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isComplete && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Sample data loaded successfully!</p>
                  <p className="text-sm text-green-700 mt-1">
                    Explore the dashboard, herd, health, milk, and breeding pages to see the data.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Data Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="Clear All Data"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={clearAllData} loading={isDeleting} disabled={isDeleting}>
              {isDeleting ? 'Clearing...' : 'Clear All Data'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">This will permanently delete ALL your data</p>
                <p className="text-sm text-red-700 mt-1">
                  All animals, health records, milk production, breeding records, guardians, and other 
                  data will be permanently removed. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {progress.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="space-y-1 font-mono text-sm">
                {progress.map((line, i) => (
                  <div key={i} className={line.startsWith('✓') ? 'text-green-600' : 'text-gray-600'}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

// ============================================
// MAIN SETTINGS PAGE
// ============================================

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const [farmSettings, setFarmSettings] = useState({
    farm_name: '',
    farm_location: '',
    weight_unit: 'lbs',
    milk_unit: 'lbs',
    temperature_unit: 'F',
  });

  // Load user settings
  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ['user_settings'],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  // Load saved settings into the form once the query resolves. This was a
  // useState initializer, which runs once at mount while `settings` is still
  // undefined and never re-runs -- so saved values never appeared in the form.
  useEffect(() => {
    if (settings) {
      setFarmSettings({
        farm_name: settings.farm_name || '',
        farm_location: settings.farm_location || '',
        weight_unit: settings.weight_unit || 'lbs',
        milk_unit: settings.milk_unit || 'lbs',
        temperature_unit: settings.temperature_unit || 'F',
      });
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      // user_settings has UNIQUE(user_id) separate from its primary key. Without
      // onConflict, upsert resolves on the PK (a fresh id each call), so after
      // the first row exists every save became an INSERT that hit the user_id
      // unique constraint and threw -- swallowed here, so saves silently failed.
      const { error } = await (supabase.from('user_settings') as any)
        .upsert({
          user_id: user?.id,
          ...farmSettings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['user_settings'] });
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your farm preferences and account</p>
      </div>

      {/* Beta Testing Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Database className="h-5 w-5 text-primary-600" />
          Beta Testing
        </h2>
        <SampleDataSection />
      </div>

      {/* Farm Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gray-400" />
          Farm Information
        </h2>
        <div className="space-y-4">
          <Input
            label="Farm Name"
            value={farmSettings.farm_name}
            onChange={(e) => setFarmSettings({ ...farmSettings, farm_name: e.target.value })}
            placeholder="River House Farms"
          />
          <Input
            label="Location"
            value={farmSettings.farm_location}
            onChange={(e) => setFarmSettings({ ...farmSettings, farm_location: e.target.value })}
            placeholder="Chehalis, WA"
          />
        </div>
      </Card>

      {/* Measurement Units */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-gray-400" />
          Measurement Units
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Weight"
            options={[
              { value: 'lbs', label: 'Pounds (lbs)' },
              { value: 'kg', label: 'Kilograms (kg)' },
            ]}
            value={farmSettings.weight_unit}
            onChange={(e) => setFarmSettings({ ...farmSettings, weight_unit: e.target.value })}
          />
          <Select
            label="Milk"
            options={[
              { value: 'lbs', label: 'Pounds (lbs)' },
              { value: 'kg', label: 'Kilograms (kg)' },
              { value: 'oz', label: 'Ounces (oz)' },
              { value: 'ml', label: 'Milliliters (ml)' },
            ]}
            value={farmSettings.milk_unit}
            onChange={(e) => setFarmSettings({ ...farmSettings, milk_unit: e.target.value })}
          />
          <Select
            label="Temperature"
            options={[
              { value: 'F', label: 'Fahrenheit (°F)' },
              { value: 'C', label: 'Celsius (°C)' },
            ]}
            value={farmSettings.temperature_unit}
            onChange={(e) => setFarmSettings({ ...farmSettings, temperature_unit: e.target.value })}
          />
        </div>
      </Card>

      {/* Account */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-gray-400" />
          Account
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-gray-900">{user?.email}</p>
          </div>
          <div className="pt-4 border-t">
            <Button variant="danger" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <Button
          leftIcon={saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          onClick={() => saveSettings.mutate()}
          loading={saveSettings.isPending}
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
        {saved && <span className="text-green-600 text-sm">Settings saved successfully</span>}
      </div>
    </div>
  );
}
