import { HealthProtocol, ScheduleAnimal, computeDue, describeProtocol, nextYearlyDue, protocolApplies } from '@/lib/healthSchedule';

const proto = (over: Partial<HealthProtocol> = {}): HealthProtocol => ({
  id: 'p', name: 'Rule', health_type: 'vaccination', medicine_id: null, default_dose: null, default_dose_unit: null, route: null,
  schedule_kind: 'interval', interval_days: 56, age_days: null, yearly_date: null, min_age_days: null, sexes: null,
  categories: null, herd_id: null, group_id: null, season_start: null, season_end: null, lead_days: 7, baseline_date: null,
  active: true, notes: null, ...over,
});
const goat = (over: Partial<ScheduleAnimal> = {}): ScheduleAnimal => ({
  id: 'a', name: 'Daisy', sex: 'doe', category: 'milking_doe', date_of_birth: '2024-03-01', herd_id: 'h1', group_ids: ['g1'], ...over,
});
const TODAY = '2026-11-07';

describe('protocolApplies', () => {
  it('filters by sex, category, herd, group, age and active', () => {
    expect(protocolApplies(proto({ sexes: ['buck'] }), goat(), TODAY)).toBe(false);
    expect(protocolApplies(proto({ categories: ['milking_doe'] }), goat(), TODAY)).toBe(true);
    expect(protocolApplies(proto({ herd_id: 'h2' }), goat(), TODAY)).toBe(false);
    expect(protocolApplies(proto({ group_id: 'g1' }), goat(), TODAY)).toBe(true);
    expect(protocolApplies(proto({ min_age_days: 60 }), goat({ date_of_birth: '2026-10-01' }), TODAY)).toBe(false);
    expect(protocolApplies(proto({ min_age_days: 60 }), goat({ date_of_birth: null }), TODAY)).toBe(false);
    expect(protocolApplies(proto({ active: false }), goat(), TODAY)).toBe(false);
  });
});

describe('interval rules', () => {
  it('never done and no baseline: due today', () => {
    const [item] = computeDue([proto()], [goat()], [], TODAY);
    expect(item.state).toBe('due');
    expect(item.dueDate).toBe(TODAY);
  });
  it('uses the last record, then the baseline', () => {
    expect(computeDue([proto()], [goat()], [{ animal_id: 'a', protocol_id: 'p', protocol_step: null, date: '2026-09-01' }], TODAY)[0])
      .toMatchObject({ state: 'overdue', dueDate: '2026-10-27', daysOverdue: 11 });
    expect(computeDue([proto({ baseline_date: '2026-09-15' })], [goat()], [], TODAY)[0])
      .toMatchObject({ state: 'upcoming', dueDate: '2026-11-10' });
    expect(computeDue([proto({ baseline_date: '2026-10-15' })], [goat()], [], TODAY)).toHaveLength(0);
  });
  it('skips out-of-season rules', () => {
    expect(computeDue([proto({ season_start: '04-01', season_end: '10-31' })], [goat()], [], TODAY)).toHaveLength(0);
  });
});

describe('age rules', () => {
  const kidRule = proto({ schedule_kind: 'age', age_days: [28, 56], interval_days: null });
  it('shows the first step not yet done', () => {
    const kid = goat({ id: 'k', name: 'Pip', date_of_birth: '2026-10-01', category: 'kid' });
    expect(computeDue([kidRule], [kid], [], TODAY)[0]).toMatchObject({ step: 0, dueDate: '2026-10-29', state: 'overdue' });
    const done0 = [{ animal_id: 'k', protocol_id: 'p', protocol_step: 0, date: '2026-10-29' }];
    expect(computeDue([kidRule], [kid], done0, TODAY)).toHaveLength(0); // step 1 due 2026-11-26, beyond lead
    expect(computeDue([kidRule], [kid], done0, '2026-11-20')[0]).toMatchObject({ step: 1, state: 'upcoming' });
  });
  it('stops chasing adults and animals without a birth date', () => {
    expect(computeDue([kidRule], [goat()], [], TODAY)).toHaveLength(0);
    expect(computeDue([kidRule], [goat({ date_of_birth: null })], [], TODAY)).toHaveLength(0);
  });
});

describe('yearly rules', () => {
  it('works out the next target', () => {
    expect(nextYearlyDue('03-01', null, '2026-02-10')).toBe('2026-03-01');
    expect(nextYearlyDue('03-01', null, '2026-07-01')).toBe('2026-03-01'); // missed this year: overdue
    expect(nextYearlyDue('03-01', null, '2026-11-07')).toBe('2027-03-01');
    expect(nextYearlyDue('03-01', '2026-02-20', TODAY)).toBe('2027-03-01'); // a bit early counts
    expect(nextYearlyDue('03-01', '2026-03-15', TODAY)).toBe('2027-03-01'); // a bit late counts
    expect(nextYearlyDue('03-01', '2025-03-01', TODAY)).toBe('2026-03-01'); // last year's: this year overdue
  });
  it('flags overdue and upcoming', () => {
    const rule = proto({ schedule_kind: 'yearly', yearly_date: '11-10', interval_days: null });
    expect(computeDue([rule], [goat()], [], TODAY)[0]).toMatchObject({ state: 'upcoming', dueDate: '2026-11-10' });
    expect(computeDue([rule], [goat()], [{ animal_id: 'a', protocol_id: 'p', protocol_step: null, date: '2025-11-08' }], '2026-11-12')[0])
      .toMatchObject({ state: 'overdue' });
  });
});

describe('ordering and wording', () => {
  it('puts overdue first', () => {
    const items = computeDue(
      [proto({ id: 'x', baseline_date: '2026-09-15' }), proto({ id: 'y', baseline_date: '2026-08-01' })],
      [goat()], [], TODAY);
    expect(items.map((i) => i.state)).toEqual(['overdue', 'upcoming']);
  });
  it('describes rules', () => {
    expect(describeProtocol(proto())).toBe('Every 8 weeks');
    expect(describeProtocol(proto({ schedule_kind: 'age', age_days: [28, 56], interval_days: null }))).toBe('At 4 wk, 8 wk old');
    expect(describeProtocol(proto({ schedule_kind: 'yearly', yearly_date: '03-01', interval_days: null }))).toBe('Yearly by Mar 1');
  });
});
