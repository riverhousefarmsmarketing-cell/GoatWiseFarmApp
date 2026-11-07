/**
 * Turns care plans (migration 022) into the chore list for a given day.
 * Pure functions, no database access, so they're easy to test.
 */

export type CareKind = 'feeding' | 'watering' | 'instruction';

export interface CarePlan {
  id: string;
  kind: CareKind;
  group_id: string | null;
  paddock_id: string | null;
  herd_id: string | null;
  title: string;
  amount: number | null;
  unit: string | null;
  feed_type_id: string | null;
  times: string[];
  days_of_week: number[] | null;
  season_start: string | null;
  season_end: string | null;
  active: boolean;
  notes: string | null;
}

export interface ChoreCompletion {
  id: string;
  care_plan_id: string;
  chore_date: string;
  slot: string;
  user_id: string | null;
  done_at: string;
  note: string | null;
}

export interface Chore {
  /** Stable key: plan id + slot. */
  key: string;
  plan: CarePlan;
  /** 'HH:MM', or '' for "any time today". */
  slot: string;
  completion: ChoreCompletion | null;
}

/** 'MM-DD' of a yyyy-MM-dd date string. */
function monthDay(isoDate: string): string {
  return isoDate.slice(5, 10);
}

/**
 * Is the date inside the plan's season? No season = all year. A season may
 * wrap over New Year (e.g. 11-01 to 03-31).
 */
export function isInSeason(plan: Pick<CarePlan, 'season_start' | 'season_end'>, isoDate: string): boolean {
  if (!plan.season_start || !plan.season_end) return true;
  const d = monthDay(isoDate);
  const { season_start: start, season_end: end } = plan;
  return start <= end ? d >= start && d <= end : d >= start || d <= end;
}

/** Day of week (0 = Sunday) for a yyyy-MM-dd date, independent of time zone. */
export function dayOfWeek(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Does the plan apply on this date (active, in season, right weekday)? */
export function appliesOn(plan: CarePlan, isoDate: string): boolean {
  if (!plan.active) return false;
  if (!isInSeason(plan, isoDate)) return false;
  if (plan.days_of_week && plan.days_of_week.length > 0 && !plan.days_of_week.includes(dayOfWeek(isoDate))) return false;
  return true;
}

/**
 * The checkable chores for a day: one per feeding/watering time (or one
 * "any time" chore when a plan has no times), sorted by time with any-time
 * chores last. Special instructions are not chores; see instructionsFor().
 */
export function choresForDay(plans: CarePlan[], completions: ChoreCompletion[], isoDate: string): Chore[] {
  const done = new Map(
    completions.filter((c) => c.chore_date === isoDate).map((c) => [`${c.care_plan_id}|${c.slot}`, c])
  );
  const chores: Chore[] = [];
  for (const plan of plans) {
    if (plan.kind === 'instruction' || !appliesOn(plan, isoDate)) continue;
    const slots = plan.times.length > 0 ? Array.from(new Set(plan.times)).sort() : [''];
    for (const slot of slots) {
      chores.push({ key: `${plan.id}|${slot}`, plan, slot, completion: done.get(`${plan.id}|${slot}`) ?? null });
    }
  }
  return chores.sort((a, b) => {
    if (a.slot === b.slot) return a.plan.title.localeCompare(b.plan.title);
    if (a.slot === '') return 1;
    if (b.slot === '') return -1;
    return a.slot.localeCompare(b.slot);
  });
}

/** Special instructions in effect on a day. */
export function instructionsFor(plans: CarePlan[], isoDate: string): CarePlan[] {
  return plans.filter((p) => p.kind === 'instruction' && appliesOn(p, isoDate));
}

/** A chore is late once its time has passed today and it isn't done. */
export function isLate(chore: Chore, isoDate: string, now: Date = new Date()): boolean {
  if (chore.completion || chore.slot === '') return false;
  const today = localISODate(now);
  if (isoDate < today) return true;
  if (isoDate > today) return false;
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return chore.slot < hhmm;
}

export function localISODate(d: Date = new Date()): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** '07:00' -> '7:00 AM'. */
export function formatSlot(slot: string): string {
  if (!slot) return 'Any time';
  const [h, m] = slot.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '11-01' -> 'Nov 1'. */
export function formatMonthDay(md: string): string {
  const [m, d] = md.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** One-line summary of when a plan runs, e.g. "7:00 AM & 5:00 PM · Mon, Thu · Nov 1 – Mar 31". */
export function describeSchedule(plan: Pick<CarePlan, 'kind' | 'times' | 'days_of_week' | 'season_start' | 'season_end'>): string {
  const parts: string[] = [];
  if (plan.kind !== 'instruction') {
    parts.push(plan.times.length ? [...plan.times].sort().map(formatSlot).join(' & ') : 'Once a day, any time');
  }
  if (plan.days_of_week && plan.days_of_week.length > 0 && plan.days_of_week.length < 7) {
    parts.push([...plan.days_of_week].sort().map((d) => DAY_NAMES[d]).join(', '));
  }
  if (plan.season_start && plan.season_end) {
    parts.push(`${formatMonthDay(plan.season_start)} – ${formatMonthDay(plan.season_end)}`);
  } else {
    parts.push('All year');
  }
  return parts.join(' · ');
}

/** Whole days between two yyyy-MM-dd dates (b - a). */
export function daysBetween(a: string, b: string): number {
  const toUTC = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000);
}
