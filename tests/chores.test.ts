import {
  CarePlan, ChoreCompletion, appliesOn, choresForDay, dayOfWeek, daysBetween, describeSchedule,
  formatSlot, instructionsFor, isInSeason, isLate,
} from '@/lib/chores';

const plan = (over: Partial<CarePlan> = {}): CarePlan => ({
  id: 'p1', kind: 'feeding', group_id: 'g1', paddock_id: null, herd_id: null, title: 'Alfalfa',
  amount: 2, unit: 'flakes', feed_type_id: null, times: ['17:00', '07:00'], days_of_week: null,
  season_start: null, season_end: null, active: true, notes: null, ...over,
});

describe('isInSeason', () => {
  it('is always in season without a season', () => {
    expect(isInSeason(plan(), '2026-07-04')).toBe(true);
  });
  it('handles a season inside one year', () => {
    const p = plan({ season_start: '04-01', season_end: '10-31' });
    expect(isInSeason(p, '2026-04-01')).toBe(true);
    expect(isInSeason(p, '2026-10-31')).toBe(true);
    expect(isInSeason(p, '2026-11-01')).toBe(false);
    expect(isInSeason(p, '2026-03-31')).toBe(false);
  });
  it('handles a winter season that wraps over New Year', () => {
    const p = plan({ season_start: '11-01', season_end: '03-31' });
    expect(isInSeason(p, '2026-11-15')).toBe(true);
    expect(isInSeason(p, '2027-01-10')).toBe(true);
    expect(isInSeason(p, '2027-03-31')).toBe(true);
    expect(isInSeason(p, '2027-04-01')).toBe(false);
    expect(isInSeason(p, '2026-10-31')).toBe(false);
  });
});

describe('appliesOn', () => {
  it('skips paused plans', () => {
    expect(appliesOn(plan({ active: false }), '2026-11-07')).toBe(false);
  });
  it('respects weekdays', () => {
    // 2026-11-07 is a Saturday
    expect(dayOfWeek('2026-11-07')).toBe(6);
    expect(appliesOn(plan({ days_of_week: [6] }), '2026-11-07')).toBe(true);
    expect(appliesOn(plan({ days_of_week: [1, 3] }), '2026-11-07')).toBe(false);
  });
});

describe('choresForDay', () => {
  it('makes one chore per time, sorted, and any-time chores last', () => {
    const plans = [
      plan(),
      plan({ id: 'p2', kind: 'watering', title: 'Fill troughs', times: [] }),
      plan({ id: 'p3', kind: 'watering', title: 'Check water', times: ['06:30'] }),
    ];
    const chores = choresForDay(plans, [], '2026-11-07');
    expect(chores.map((c) => `${c.slot}|${c.plan.title}`)).toEqual([
      '06:30|Check water', '07:00|Alfalfa', '17:00|Alfalfa', '|Fill troughs',
    ]);
  });
  it('leaves out special instructions and out-of-season plans', () => {
    const plans = [
      plan({ id: 'i', kind: 'instruction', title: 'No alfalfa for bucks' }),
      plan({ id: 's', season_start: '04-01', season_end: '10-31' }),
    ];
    expect(choresForDay(plans, [], '2026-11-07')).toHaveLength(0);
    expect(instructionsFor(plans, '2026-11-07').map((p) => p.id)).toEqual(['i']);
  });
  it('attaches check-offs for that day only', () => {
    const done: ChoreCompletion[] = [
      { id: 'c1', care_plan_id: 'p1', chore_date: '2026-11-07', slot: '07:00', user_id: 'u', done_at: '', note: null },
      { id: 'c2', care_plan_id: 'p1', chore_date: '2026-11-06', slot: '17:00', user_id: 'u', done_at: '', note: null },
    ];
    const chores = choresForDay([plan()], done, '2026-11-07');
    expect(chores.find((c) => c.slot === '07:00')!.completion?.id).toBe('c1');
    expect(chores.find((c) => c.slot === '17:00')!.completion).toBeNull();
  });
});

describe('isLate', () => {
  const [morning] = choresForDay([plan()], [], '2026-11-07');
  it('is late once the time has passed today', () => {
    expect(isLate(morning, '2026-11-07', new Date(2026, 10, 7, 8, 0))).toBe(true);
    expect(isLate(morning, '2026-11-07', new Date(2026, 10, 7, 6, 59))).toBe(false);
  });
  it('is never late for a future day, always late for a past one', () => {
    expect(isLate(morning, '2026-11-08', new Date(2026, 10, 7, 23, 0))).toBe(false);
    expect(isLate(morning, '2026-11-06', new Date(2026, 10, 7, 1, 0))).toBe(true);
  });
});

describe('formatting', () => {
  it('formats times and schedules', () => {
    expect(formatSlot('07:00')).toBe('7:00 AM');
    expect(formatSlot('12:30')).toBe('12:30 PM');
    expect(formatSlot('00:15')).toBe('12:15 AM');
    expect(describeSchedule(plan({ days_of_week: [4, 1], season_start: '11-01', season_end: '03-31' })))
      .toBe('7:00 AM & 5:00 PM · Mon, Thu · Nov 1 – Mar 31');
  });
  it('counts days between dates', () => {
    expect(daysBetween('2026-10-31', '2026-11-07')).toBe(7);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });
});
