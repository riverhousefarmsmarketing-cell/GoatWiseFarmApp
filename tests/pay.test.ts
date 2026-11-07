import { hoursBetween, summarizePay, weekOf } from '@/lib/pay';

const e = (work_date: string, hours: number, paid: string | null = null) => ({ work_date, hours, paid_payment_id: paid });
const entries = [e('2026-11-02', 4), e('2026-11-02', 2.5), e('2026-11-03', 5), e('2026-11-04', 3, 'paid-1'), e('2026-11-10', 8)];

describe('summarizePay', () => {
  it('only counts unpaid entries in the period', () => {
    expect(summarizePay(entries, '2026-11-01', '2026-11-07', 'hourly', 12)).toEqual({ entries: 3, hours: 11.5, days: 2, amount: 138 });
  });
  it('handles each pay type', () => {
    expect(summarizePay(entries, '2026-11-01', '2026-11-07', 'daily', 80).amount).toBe(160);
    expect(summarizePay(entries, '2026-11-01', '2026-11-07', 'per_task', 20).amount).toBe(60);
    expect(summarizePay(entries, '2026-11-01', '2026-11-07', 'salary', 500).amount).toBe(500);
    expect(summarizePay(entries, '2026-11-01', '2026-11-07', 'unpaid', null).amount).toBe(0);
  });
  it('gives no amount without a rate', () => {
    expect(summarizePay(entries, '2026-11-01', '2026-11-07', 'hourly', null).amount).toBeNull();
    expect(summarizePay(entries, '2026-11-01', '2026-11-07', null, 10).amount).toBeNull();
  });
});

describe('hoursBetween', () => {
  it('subtracts the break and wraps past midnight', () => {
    expect(hoursBetween('06:00', '10:30', 30)).toBe(4);
    expect(hoursBetween('22:00', '02:00')).toBe(4);
    expect(hoursBetween('08:00', '08:20')).toBe(0.33);
  });
});

describe('weekOf', () => {
  it('runs Monday to Sunday', () => {
    expect(weekOf('2026-11-07')).toEqual({ from: '2026-11-02', to: '2026-11-08' }); // a Saturday
    expect(weekOf('2026-11-02')).toEqual({ from: '2026-11-02', to: '2026-11-08' }); // a Monday
    expect(weekOf('2026-11-08')).toEqual({ from: '2026-11-02', to: '2026-11-08' }); // a Sunday
  });
});
