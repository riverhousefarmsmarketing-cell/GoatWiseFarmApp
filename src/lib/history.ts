/**
 * Plain-language labels for the change history (audit_log, migration 020).
 */

export interface AuditEntry {
  id: number;
  farm_id: string | null;
  table_name: string;
  record_id: string | null;
  action: 'insert' | 'update' | 'delete';
  changed_by: string | null;
  changed_at: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_fields: string[] | null;
}

export const TABLE_LABELS: Record<string, string> = {
  herds: 'Herd',
  animals: 'Animal',
  groups: 'Group',
  animal_groups: 'Group membership',
  health_records: 'Health record',
  inspections: 'Inspection',
  breeding_records: 'Breeding record',
  kidding_records: 'Kidding record',
  kid_records: 'Kid record',
  milk_records: 'Milk record',
  weight_records: 'Weight record',
  transactions: 'Money entry',
  feed_types: 'Feed type',
  feed_inventory: 'Feed inventory',
  feed_schedules: 'Feeding schedule',
  feed_usage: 'Feed usage',
  breeding_plans: 'Breeding plan',
  guardians: 'Guardian',
  guardian_health_records: 'Guardian health record',
  guardian_vaccinations: 'Guardian vaccination',
  predation_events: 'Predation event',
  photos: 'Photo',
  herd_transfers: 'Herd transfer',
  paddocks: 'Paddock',
  paddock_moves: 'Paddock move',
  farms: 'Farm',
  farm_members: 'Team member',
  farm_invites: 'Invite',
  deletion_requests: 'Deletion request',
  farm_posts: 'Farm update',
  assignments: 'Assignment',
  care_plans: 'Care plan',
  chore_completions: 'Chore check-off',
  mineral_refills: 'Mineral refill',
  restock_requests: 'Restock item',
  farm_emergency_info: 'Emergency info',
  emergency_contacts: 'Emergency contact',
  medicines: 'Medicine',
  medicine_lots: 'Medicine lot',
  treatment_courses: 'Treatment',
  course_doses: 'Treatment dose',
  health_protocols: 'Health rule',
  concern_reports: 'Concern',
  lab_tests: 'Lab test',
  notifications: 'Notification',
};

export function tableLabel(table: string): string {
  return TABLE_LABELS[table] ?? table.replace(/_/g, ' ');
}

/** Bookkeeping columns not worth showing a person. */
const HIDDEN_FIELDS = new Set([
  'id', 'user_id', 'farm_id', 'created_at', 'updated_at', 'token_hash', 'record_data',
]);

export function visibleFields(fields: string[] | null | undefined): string[] {
  return (fields ?? []).filter((f) => !HIDDEN_FIELDS.has(f));
}

export function fieldLabel(field: string): string {
  const pretty = field.replace(/_id$/, '').replace(/_/g, ' ');
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  const s = String(value);
  // Long ids are noise to a person.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return '(linked record)';
  return s.length > 120 ? s.slice(0, 117) + '…' : s;
}

/** A short name for the record, from whichever naming field it has. */
export function recordName(entry: Pick<AuditEntry, 'old_data' | 'new_data'>): string | null {
  const row = entry.new_data ?? entry.old_data ?? {};
  for (const key of ['name', 'item_name', 'medication', 'title', 'lot_number', 'tag_number', 'description', 'treatment', 'body', 'label', 'role']) {
    const v = row[key];
    if (typeof v === 'string' && v.trim()) return v.length > 60 ? v.slice(0, 57) + '…' : v;
  }
  for (const key of ['date', 'record_date', 'event_date', 'test_date', 'due_date', 'refilled_on', 'chore_date']) {
    if (row[key]) return String(row[key]);
  }
  return null;
}

export const ACTION_VERBS: Record<AuditEntry['action'], string> = {
  insert: 'added',
  update: 'edited',
  delete: 'deleted',
};
