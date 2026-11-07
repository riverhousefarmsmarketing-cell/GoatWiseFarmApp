/**
 * Pay worked out from hours (migration 030). Record keeping only: no tax
 * or withholding.
 */
export type PayType = 'hourly' | 'daily' | 'salary' | 'per_task' | 'unpaid';

export const PAY_TYPE_LABELS: Record<PayType, string> = {
  hourly: 'Per hour',
  daily: 'Per day worked',
  salary: 'Set amount per pay period',
  per_task: 'Per job',
  unpaid: 'Unpaid (family / volunteer)',
};

export interface TimeEntryLike {
  work_date: string;
  hours: number;
  paid_payment_id: string | null;
}

export interface PaySummary {
  entries: number;
  hours: number;
  days: number;
  /** null when the amount can't be worked out (no rate set). */
  amount: number | null;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Hours/amount owed for unpaid entries in [from, to] (yyyy-MM-dd, inclusive). */
export function summarizePay(entries: TimeEntryLike[], from: string, to: string, payType: PayType | null, rate: number | null): PaySummary {
  const inPeriod = entries.filter((e) => !e.paid_payment_id && e.work_date >= from && e.work_date <= to);
  const hours = round2(inPeriod.reduce((s, e) => s + Number(e.hours), 0));
  const days = new Set(inPeriod.map((e) => e.work_date)).size;
  let amount: number | null = null;
  if (payType === 'unpaid') amount = 0;
  else if (rate != null && payType) {
    amount =
      payType === 'hourly' ? hours * rate
      : payType === 'daily' ? days * rate
      : payType === 'per_task' ? inPeriod.length * rate
      : rate; // salary: the set amount for the period
    amount = round2(amount);
  }
  return { entries: inPeriod.length, hours, days, amount };
}

/** Hours between two 'HH:MM' times minus a break; past midnight wraps. Mirrors the database. */
export function hoursBetween(start: string, end: string, breakMinutes = 0): number {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  let minutes = toMin(end) - toMin(start);
  if (minutes <= 0) minutes += 1440;
  return round2(Math.max(minutes - breakMinutes, 0) / 60);
}

/** Monday..Sunday week containing the date (yyyy-MM-dd). */
export function weekOf(iso: string): { from: string; to: string } {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = (date.getUTCDay() + 6) % 7; // Monday = 0
  const start = new Date(Date.UTC(y, m - 1, d - dow));
  const end = new Date(Date.UTC(y, m - 1, d - dow + 6));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

export function formatMoney(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}
