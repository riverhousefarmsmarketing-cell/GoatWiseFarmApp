/**
 * Herd health schedule (migration 027): which animals are due for what.
 * Pure functions, so they can be unit-tested without a database.
 */
import { daysBetween, isInSeason } from '@/lib/chores';

export type ScheduleKind = 'interval' | 'age' | 'yearly';

export interface HealthProtocol {
  id: string;
  name: string;
  health_type: string;
  medicine_id: string | null;
  default_dose: number | null;
  default_dose_unit: string | null;
  route: string | null;
  schedule_kind: ScheduleKind;
  interval_days: number | null;
  age_days: number[] | null;
  yearly_date: string | null;
  min_age_days: number | null;
  sexes: string[] | null;
  categories: string[] | null;
  herd_id: string | null;
  group_id: string | null;
  season_start: string | null;
  season_end: string | null;
  lead_days: number;
  baseline_date: string | null;
  active: boolean;
  notes: string | null;
}

export interface ScheduleAnimal {
  id: string;
  name: string;
  tag_number?: string | null;
  sex: string;
  category: string;
  date_of_birth: string | null;
  herd_id: string | null;
  group_ids: string[];
}

/** A health record that marks a protocol done for an animal. */
export interface ProtocolRecord {
  animal_id: string;
  protocol_id: string;
  protocol_step: number | null;
  date: string;
}

export type DueState = 'overdue' | 'due' | 'upcoming';

export interface DueItem {
  protocol: HealthProtocol;
  animal: ScheduleAnimal;
  dueDate: string;
  state: DueState;
  /** For age rules: which step (0-based) this is. */
  step: number | null;
  lastDone: string | null;
  /** Days overdue (positive) or until due (negative). */
  daysOverdue: number;
}

export function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function ageInDays(dob: string | null, today: string): number | null {
  return dob ? daysBetween(dob, today) : null;
}

/** Does this rule cover this animal at all? */
export function protocolApplies(p: HealthProtocol, a: ScheduleAnimal, today: string): boolean {
  if (!p.active) return false;
  if (p.sexes && p.sexes.length && !p.sexes.includes(a.sex)) return false;
  if (p.categories && p.categories.length && !p.categories.includes(a.category)) return false;
  if (p.herd_id && a.herd_id !== p.herd_id) return false;
  if (p.group_id && !a.group_ids.includes(p.group_id)) return false;
  if (p.min_age_days != null) {
    const age = ageInDays(a.date_of_birth, today);
    if (age == null || age < p.min_age_days) return false;
  }
  return true;
}

function classify(dueDate: string, today: string, lead: number): DueState | null {
  const diff = daysBetween(dueDate, today); // positive = overdue
  if (diff > 0) return 'overdue';
  if (diff === 0) return 'due';
  if (-diff <= lead) return 'upcoming';
  return null;
}

/** How long after the last age step an animal stays on the list if missed. */
export const AGE_GRACE_DAYS = 90;

/**
 * Everything due, overdue or coming up today, most urgent first.
 */
export function computeDue(
  protocols: HealthProtocol[],
  animals: ScheduleAnimal[],
  records: ProtocolRecord[],
  today: string
): DueItem[] {
  // Latest record per (protocol, animal) and per (protocol, animal, step).
  const latest = new Map<string, string>();
  const stepsDone = new Set<string>();
  for (const r of records) {
    const k = `${r.protocol_id}|${r.animal_id}`;
    if (!latest.has(k) || r.date > latest.get(k)!) latest.set(k, r.date);
    if (r.protocol_step != null) stepsDone.add(`${k}|${r.protocol_step}`);
  }

  const out: DueItem[] = [];
  for (const p of protocols) {
    for (const a of animals) {
      if (!protocolApplies(p, a, today)) continue;
      const key = `${p.id}|${a.id}`;
      const last = latest.get(key) ?? null;

      if (p.schedule_kind === 'interval' && p.interval_days) {
        if (p.season_start && p.season_end && !isInSeason(p, today)) continue;
        const from = last ?? p.baseline_date;
        const dueDate = from ? addDaysISO(from, p.interval_days) : today;
        const state = classify(dueDate, today, p.lead_days);
        if (state) out.push({ protocol: p, animal: a, dueDate, state, step: null, lastDone: last, daysOverdue: daysBetween(dueDate, today) });
      } else if (p.schedule_kind === 'age' && p.age_days?.length) {
        if (!a.date_of_birth) continue;
        const age = daysBetween(a.date_of_birth, today);
        // Past the last step plus grace: no longer chased.
        if (age > Math.max(...p.age_days) + AGE_GRACE_DAYS) continue;
        // Only the first step not yet done.
        const step = p.age_days.findIndex((_, i) => !stepsDone.has(`${key}|${i}`));
        if (step < 0) continue;
        const dueDate = addDaysISO(a.date_of_birth, p.age_days[step]);
        const state = classify(dueDate, today, p.lead_days);
        if (state) out.push({ protocol: p, animal: a, dueDate, state, step, lastDone: last, daysOverdue: daysBetween(dueDate, today) });
      } else if (p.schedule_kind === 'yearly' && p.yearly_date) {
        const target = nextYearlyDue(p.yearly_date, last ?? p.baseline_date, today);
        const state = classify(target, today, p.lead_days);
        if (state) out.push({ protocol: p, animal: a, dueDate: target, state, step: null, lastDone: last, daysOverdue: daysBetween(target, today) });
      }
    }
  }

  const rank: Record<DueState, number> = { overdue: 0, due: 1, upcoming: 2 };
  return out.sort(
    (x, y) => rank[x.state] - rank[y.state] || x.dueDate.localeCompare(y.dueDate) || x.animal.name.localeCompare(y.animal.name)
  );
}

/** A dose given within about six months either side of a yearly target counts for that year. */
export const YEARLY_WINDOW_DAYS = 182;

/**
 * Next yearly target date (yyyy-MM-dd) for a rule due by `monthDay` each year.
 * With a last-done date: the first target more than ~6 months after it (so a
 * booster given a little early or late still counts for that year). Never
 * done: this year's target, unless it passed more than ~6 months ago.
 */
export function nextYearlyDue(monthDay: string, lastDone: string | null, today: string): string {
  if (lastDone) {
    const threshold = addDaysISO(lastDone, YEARLY_WINDOW_DAYS);
    for (let y = Number(lastDone.slice(0, 4)) - 1; ; y++) {
      const t = `${y}-${monthDay}`;
      if (t > threshold) return t;
    }
  }
  const year = Number(today.slice(0, 4));
  const thisYear = `${year}-${monthDay}`;
  return addDaysISO(thisYear, YEARLY_WINDOW_DAYS) >= today ? thisYear : `${year + 1}-${monthDay}`;
}

export function describeProtocol(p: HealthProtocol): string {
  const parts: string[] = [];
  if (p.schedule_kind === 'interval' && p.interval_days) {
    parts.push(p.interval_days % 7 === 0 ? `Every ${p.interval_days / 7} week${p.interval_days === 7 ? '' : 's'}` : `Every ${p.interval_days} days`);
  } else if (p.schedule_kind === 'age' && p.age_days?.length) {
    parts.push(`At ${p.age_days.map((d) => (d % 7 === 0 ? `${d / 7} wk` : `${d} d`)).join(', ')} old`);
  } else if (p.schedule_kind === 'yearly' && p.yearly_date) {
    const [m, d] = p.yearly_date.split('-').map(Number);
    parts.push(`Yearly by ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${d}`);
  }
  if (p.season_start && p.season_end) parts.push(`in season ${p.season_start} – ${p.season_end}`);
  return parts.join(' · ');
}
