'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useFarm } from '@/hooks/useFarm';
import { deleteOrRequest } from '@/lib/deleteRecord';
import type { HealthProtocol, ProtocolRecord, ScheduleAnimal } from '@/lib/healthSchedule';
import { pokeDispatch } from '@/lib/push';

const db = () => getSupabaseClient() as any;

export const ahKeys = {
  medicines: ['medicines'] as const,
  lots: ['medicine_lots'] as const,
  courses: ['treatment_courses'] as const,
  doses: ['course_doses'] as const,
  protocols: ['health_protocols'] as const,
  protocolRecords: ['protocol_records'] as const,
  scheduleAnimals: ['schedule_animals'] as const,
  concerns: ['concern_reports'] as const,
  labs: ['lab_tests'] as const,
  watch: ['watch_list'] as const,
};

/** Refresh health lists (and the Health Center, which reads health_records). */
function useInvalidateHealth() {
  const queryClient = useQueryClient();
  return (...keys: (readonly string[])[]) => {
    keys.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
    queryClient.invalidateQueries({ queryKey: ['health'] });
    queryClient.invalidateQueries({ queryKey: ['health_records'] });
    queryClient.invalidateQueries({ queryKey: ['animal_health'] });
  };
}

// ---------------------------------------------------------------------------
// Animals (for pickers and the schedule)
// ---------------------------------------------------------------------------

export function useScheduleAnimals() {
  const { farm } = useFarm();
  return useQuery<ScheduleAnimal[]>({
    queryKey: [...ahKeys.scheduleAnimals, farm?.farm_id],
    queryFn: async () => {
      const [{ data: animals, error }, { data: links, error: linkErr }] = await Promise.all([
        db().from('animals').select('id, name, tag_number, sex, category, date_of_birth, herd_id')
          .eq('status', 'active').eq('is_reference', false).order('name'),
        db().from('animal_groups').select('animal_id, group_id'),
      ]);
      if (error) throw error;
      if (linkErr) throw linkErr;
      const groups = new Map<string, string[]>();
      for (const l of links ?? []) groups.set(l.animal_id, [...(groups.get(l.animal_id) ?? []), l.group_id]);
      return (animals ?? []).map((a: any) => ({ ...a, group_ids: groups.get(a.id) ?? [] }));
    },
    enabled: !!farm,
  });
}

export function animalLabel(a: { name: string; tag_number?: string | null } | null | undefined): string {
  if (!a) return 'Unknown animal';
  return a.tag_number ? `${a.name} (#${a.tag_number})` : a.name;
}

// ---------------------------------------------------------------------------
// Medicine cabinet
// ---------------------------------------------------------------------------

export type MedicineKind = 'vaccine' | 'dewormer' | 'antibiotic' | 'anti_inflammatory' | 'vitamin_mineral' | 'topical' | 'other';
export const MEDICINE_KIND_LABELS: Record<MedicineKind, string> = {
  vaccine: 'Vaccine', dewormer: 'Dewormer', antibiotic: 'Antibiotic', anti_inflammatory: 'Pain / anti-inflammatory',
  vitamin_mineral: 'Vitamin / mineral', topical: 'Topical', other: 'Other',
};

export interface Medicine {
  id: string;
  name: string;
  kind: MedicineKind;
  active_ingredient: string | null;
  dose_notes: string | null;
  default_dose: number | null;
  default_dose_unit: string | null;
  route: string | null;
  stock_unit: string;
  meat_withdrawal_days: number | null;
  milk_withdrawal_days: number | null;
  storage: 'room' | 'fridge' | 'freezer';
  prescription_required: boolean;
  low_stock_level: number | null;
  active: boolean;
  notes: string | null;
}

export interface MedicineLot {
  id: string;
  medicine_id: string;
  lot_number: string | null;
  expiry_date: string | null;
  quantity_received: number | null;
  quantity_remaining: number | null;
  received_on: string | null;
  supplier: string | null;
  cost: number | null;
  status: 'in_stock' | 'finished' | 'discarded';
  notes: string | null;
  created_at: string;
}

export function useMedicines() {
  const { farm } = useFarm();
  return useQuery<Medicine[]>({
    queryKey: [...ahKeys.medicines, farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await db().from('medicines').select('*').order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!farm,
  });
}

export function useMedicineLots() {
  const { farm } = useFarm();
  return useQuery<MedicineLot[]>({
    queryKey: [...ahKeys.lots, farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await db().from('medicine_lots').select('*').order('expiry_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
    enabled: !!farm,
  });
}

export function useSaveMedicine() {
  const { user } = useAuth();
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: async (m: Partial<Medicine> & { name: string }) => {
      const { id, ...rest } = m;
      const { error } = id
        ? await db().from('medicines').update(rest).eq('id', id)
        : await db().from('medicines').insert({ ...rest, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => invalidate(ahKeys.medicines),
  });
}

export function useSaveLot() {
  const { user } = useAuth();
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: async (l: Partial<MedicineLot> & { medicine_id: string }) => {
      const { id, created_at, ...rest } = l as any;
      const { error } = id
        ? await db().from('medicine_lots').update(rest).eq('id', id)
        : await db().from('medicine_lots').insert({ ...rest, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => invalidate(ahKeys.lots),
  });
}

export function useDeleteLot() {
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { error } = await deleteOrRequest('medicine_lots', id, label);
      if (error) throw error;
    },
    onSuccess: () => invalidate(ahKeys.lots),
  });
}

/** Expiry state for a lot, relative to today (yyyy-MM-dd). */
export function expiryState(lot: Pick<MedicineLot, 'expiry_date' | 'status'>, today: string): 'expired' | 'soon' | 'ok' | null {
  if (!lot.expiry_date || lot.status !== 'in_stock') return null;
  if (lot.expiry_date < today) return 'expired';
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 30);
  return lot.expiry_date <= soon.toISOString().slice(0, 10) ? 'soon' : 'ok';
}

// ---------------------------------------------------------------------------
// Treatment courses
// ---------------------------------------------------------------------------

export interface TreatmentCourse {
  id: string;
  animal_id: string;
  medicine_id: string | null;
  medicine_lot_id: string | null;
  medication: string;
  reason: string | null;
  dose: number | null;
  dose_unit: string | null;
  route: string | null;
  times: string[];
  every_n_days: number;
  start_date: string;
  days: number;
  withdrawal_days: number | null;
  prescribed_by: string | null;
  notes: string | null;
  status: 'active' | 'completed' | 'stopped';
  stopped_reason: string | null;
  stopped_by: string | null;
  stopped_at: string | null;
  user_id: string | null;
  created_at: string;
  animals: { name: string; tag_number: string | null; care_status?: string } | null;
}

export interface CourseDose {
  id: string;
  course_id: string;
  dose_date: string;
  slot: string;
  user_id: string | null;
  given_at: string;
  amount: number | null;
  dose_unit: string | null;
  medicine_lot_id: string | null;
  skipped: boolean;
  note: string | null;
}

export function useTreatmentCourses(opts: { includeFinished?: boolean } = {}) {
  const { farm } = useFarm();
  return useQuery<TreatmentCourse[]>({
    queryKey: [...ahKeys.courses, farm?.farm_id, !!opts.includeFinished],
    queryFn: async () => {
      let q = db().from('treatment_courses').select('*, animals(name, tag_number, care_status)').order('start_date', { ascending: false });
      if (!opts.includeFinished) q = q.eq('status', 'active');
      else q = q.limit(200);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!farm,
    refetchInterval: 60_000,
  });
}

export function useCourseDoses(courseIds: string[]) {
  const { farm } = useFarm();
  return useQuery<CourseDose[]>({
    queryKey: [...ahKeys.doses, farm?.farm_id, courseIds.join(',')],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data, error } = await db().from('course_doses').select('*').in('course_id', courseIds);
      if (error) throw error;
      return data;
    },
    enabled: !!farm,
    refetchInterval: 60_000,
  });
}

export function useStartCourse() {
  const { user } = useAuth();
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: async (c: Omit<TreatmentCourse, 'id' | 'status' | 'stopped_reason' | 'stopped_by' | 'stopped_at' | 'user_id' | 'created_at' | 'animals'>) => {
      const { error } = await db().from('treatment_courses').insert({ ...c, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => invalidate(ahKeys.courses, ['health_withdrawals']),
  });
}

export function useStopCourse() {
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string | null }) => {
      const { error } = await db().from('treatment_courses').update({ status: 'stopped', stopped_reason: reason }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(ahKeys.courses),
  });
}

export function useGiveDose() {
  const { user } = useAuth();
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: async (d: { course_id: string; dose_date: string; slot: string; amount?: number | null; dose_unit?: string | null; medicine_lot_id?: string | null; skipped?: boolean; note?: string | null }) => {
      const { error } = await db().from('course_doses').insert({ ...d, note: d.note?.trim() || null, user_id: user!.id });
      if (error && error.code !== '23505') throw error;
    },
    onSuccess: () => invalidate(ahKeys.doses, ahKeys.courses),
  });
}

export function useUndoDose() {
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db().from('course_doses').delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Only the person who recorded this dose (or a manager) can undo it.');
    },
    onSuccess: () => invalidate(ahKeys.doses, ahKeys.courses),
  });
}

/** Every scheduled dose of a course, in order. */
export function courseSlots(c: Pick<TreatmentCourse, 'start_date' | 'days' | 'every_n_days' | 'times'>): { date: string; slot: string }[] {
  const out: { date: string; slot: string }[] = [];
  const [y, m, d] = c.start_date.split('-').map(Number);
  for (let i = 0; i < c.days; i += c.every_n_days) {
    const date = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    for (const slot of [...c.times].sort()) out.push({ date, slot });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Health schedule
// ---------------------------------------------------------------------------

export function useHealthProtocols() {
  const { farm } = useFarm();
  return useQuery<HealthProtocol[]>({
    queryKey: [...ahKeys.protocols, farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await db().from('health_protocols').select('*').order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!farm,
  });
}

export function useProtocolRecords() {
  const { farm } = useFarm();
  return useQuery<ProtocolRecord[]>({
    queryKey: [...ahKeys.protocolRecords, farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await db()
        .from('health_records')
        .select('animal_id, protocol_id, protocol_step, date')
        .not('protocol_id', 'is', null)
        .order('date', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data;
    },
    enabled: !!farm,
  });
}

export function useSaveProtocol() {
  const { user } = useAuth();
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: async (p: Partial<HealthProtocol> & { name: string }) => {
      const { id, ...rest } = p;
      const { error } = id
        ? await db().from('health_protocols').update(rest).eq('id', id)
        : await db().from('health_protocols').insert({ ...rest, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => invalidate(ahKeys.protocols),
  });
}

export function useDeleteProtocol() {
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('health_protocols').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(ahKeys.protocols),
  });
}

/** Record a scheduled treatment for several animals at once. */
export function useRecordScheduled() {
  const { user } = useAuth();
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: async (input: {
      protocol: HealthProtocol;
      items: { animal_id: string; step: number | null }[];
      date: string;
      medication: string | null;
      medicine_id: string | null;
      medicine_lot_id: string | null;
      dosage: number | null;
      dosage_unit: string | null;
      route: string | null;
      withdrawal_days: number | null;
      administered_by: string | null;
      notes: string | null;
    }) => {
      const rows = input.items.map((it) => ({
        animal_id: it.animal_id,
        type: input.protocol.health_type,
        date: input.date,
        treatment: input.protocol.name,
        medication: input.medication,
        medicine_id: input.medicine_id,
        medicine_lot_id: input.medicine_lot_id,
        dosage: input.dosage,
        dosage_unit: input.dosage_unit,
        route: input.route,
        withdrawal_days: input.withdrawal_days,
        administered_by: input.administered_by,
        notes: input.notes,
        protocol_id: input.protocol.id,
        protocol_step: it.step,
        user_id: user!.id,
      }));
      if (rows.length === 0) throw new Error('Choose at least one animal.');
      const { error } = await db().from('health_records').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => invalidate(ahKeys.protocolRecords, ['health_withdrawals']),
  });
}

// ---------------------------------------------------------------------------
// Watch list, concerns, lab tests, deaths
// ---------------------------------------------------------------------------

export interface WatchedAnimal {
  id: string;
  name: string;
  tag_number: string | null;
  care_status: 'watch' | 'isolated';
  care_status_note: string | null;
  care_status_since: string | null;
  care_status_by: string | null;
}

export function useWatchList() {
  const { farm } = useFarm();
  return useQuery<WatchedAnimal[]>({
    queryKey: [...ahKeys.watch, farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await db()
        .from('animals')
        .select('id, name, tag_number, care_status, care_status_note, care_status_since, care_status_by')
        .neq('care_status', 'normal')
        .order('care_status_since', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!farm,
    refetchInterval: 2 * 60_000,
  });
}

export function useSetCareStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ animalId, status, note }: { animalId: string; status: 'normal' | 'watch' | 'isolated'; note: string | null }) => {
      const { error } = await db().from('animals').update({ care_status: status, care_status_note: note }).eq('id', animalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ahKeys.watch });
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      queryClient.invalidateQueries({ queryKey: ['animal'] });
    },
  });
}

export interface ConcernReport {
  id: string;
  user_id: string | null;
  animal_id: string | null;
  description: string;
  urgency: 'low' | 'normal' | 'urgent';
  photo_url: string | null;
  status: 'open' | 'acknowledged' | 'resolved';
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  animals: { name: string; tag_number: string | null } | null;
}

export function useConcerns() {
  const { farm } = useFarm();
  return useQuery<ConcernReport[]>({
    queryKey: [...ahKeys.concerns, farm?.farm_id],
    queryFn: async () => {
      const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
      const { data, error } = await db()
        .from('concern_reports')
        .select('*, animals(name, tag_number)')
        .or(`status.neq.resolved,resolved_at.gte.${since}`)
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
    enabled: !!farm,
    refetchInterval: 60_000,
  });
}

export function useReportConcern() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (c: { animal_id: string | null; description: string; urgency: 'low' | 'normal' | 'urgent'; photo: File | null }) => {
      let photo_url: string | null = null;
      let photo_path: string | null = null;
      if (c.photo) {
        const ext = (c.photo.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        photo_path = `${user!.id}/concerns/${Date.now()}.${ext || 'jpg'}`;
        const { error: upErr } = await getSupabaseClient().storage.from('photos').upload(photo_path, c.photo);
        if (upErr) throw upErr;
        photo_url = getSupabaseClient().storage.from('photos').getPublicUrl(photo_path).data.publicUrl;
      }
      const { error } = await db().from('concern_reports').insert({
        animal_id: c.animal_id, description: c.description.trim(), urgency: c.urgency, photo_url, photo_path, user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ahKeys.concerns }); pokeDispatch(); },
  });
}

export function useUpdateConcern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; status?: ConcernReport['status']; resolution_note?: string | null }) => {
      const { error } = await db().from('concern_reports').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ahKeys.concerns }); pokeDispatch(); },
  });
}

export type LabTestType = 'cae' | 'cl' | 'johnes' | 'fecal_egg_count' | 'brucellosis' | 'tb' | 'q_fever' | 'pregnancy' | 'selenium' | 'copper' | 'other';
export const LAB_TEST_LABELS: Record<LabTestType, string> = {
  cae: 'CAE', cl: 'CL', johnes: "Johne's", fecal_egg_count: 'Fecal egg count', brucellosis: 'Brucellosis', tb: 'TB',
  q_fever: 'Q fever', pregnancy: 'Pregnancy', selenium: 'Selenium', copper: 'Copper', other: 'Other',
};
export type LabResult = 'pending' | 'negative' | 'positive' | 'inconclusive' | 'value';

export interface LabTest {
  id: string;
  animal_id: string;
  test_type: LabTestType;
  test_name: string | null;
  sample_date: string;
  result_date: string | null;
  result: LabResult;
  value: number | null;
  value_unit: string | null;
  lab_name: string | null;
  notes: string | null;
  user_id: string | null;
  animals: { name: string; tag_number: string | null; status: string } | null;
}

export function useLabTests(animalId?: string) {
  const { farm } = useFarm();
  return useQuery<LabTest[]>({
    queryKey: [...ahKeys.labs, farm?.farm_id, animalId ?? 'all'],
    queryFn: async () => {
      let q = db().from('lab_tests').select('*, animals(name, tag_number, status)').order('sample_date', { ascending: false }).limit(1000);
      if (animalId) q = q.eq('animal_id', animalId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!farm,
  });
}

export function useSaveLabTest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (t: Partial<LabTest> & { animal_ids?: string[] }) => {
      const { id, animals, animal_ids, ...rest } = t as any;
      if (id) {
        const { error } = await db().from('lab_tests').update(rest).eq('id', id);
        if (error) throw error;
        return;
      }
      const targets: string[] = animal_ids?.length ? animal_ids : [rest.animal_id];
      const { error } = await db().from('lab_tests').insert(targets.map((animal_id) => ({ ...rest, animal_id, user_id: user!.id })));
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ahKeys.labs }),
  });
}

export function useDeleteLabTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { error } = await deleteOrRequest('lab_tests', id, label);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ahKeys.labs }),
  });
}

export type DeathCategory = 'illness' | 'injury' | 'predator' | 'kidding' | 'old_age' | 'euthanasia' | 'unknown' | 'other';
export const DEATH_CATEGORY_LABELS: Record<DeathCategory, string> = {
  illness: 'Illness', injury: 'Injury', predator: 'Predator', kidding: 'Kidding / birth', old_age: 'Old age',
  euthanasia: 'Euthanasia', unknown: 'Unknown', other: 'Other',
};

export function useRecordDeath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (d: { animalId: string; death_date: string; death_category: DeathCategory; death_cause: string; necropsy_done: boolean; necropsy_findings: string }) => {
      const { error } = await db().from('animals').update({
        status: 'deceased',
        death_date: d.death_date,
        death_category: d.death_category,
        death_cause: d.death_cause.trim() || null,
        necropsy_done: d.necropsy_done,
        necropsy_findings: d.necropsy_findings.trim() || null,
      }).eq('id', d.animalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      queryClient.invalidateQueries({ queryKey: ['animal'] });
      queryClient.invalidateQueries({ queryKey: ahKeys.watch });
    },
  });
}
