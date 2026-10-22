import { describe, expect, it } from 'vitest';
import {
  averageAdherence,
  calorieHitRate,
  checkInsDueThisWeek,
  clientsNeedingFollowUp,
  conversionByLeadSource,
  countByLeadSource,
  countByStage,
  dailySeries,
  hasReachedStage,
  isOverdue,
  isWithinTolerance,
  leadToActiveConversion,
  movingAverage,
  rangeStart,
  stepHitRate,
  summarizeProgress,
  weekStart,
} from './metrics';
import { makeClient } from '../test/fixtures';
import type { CheckIn, Client, ProgressLog, Stage, StageHistoryEntry } from '../schemas';

// 2026-10-21 is a Wednesday; that week runs Mon 10-19 … Sun 10-25.
const TODAY = '2026-10-21';

const history = (...stages: Stage[]): StageHistoryEntry[] =>
  stages.map((stage, i) => ({ stage, enteredAt: `2026-0${i + 1}-01T10:00:00.000Z` }));

const clientAt = (id: string, stages: Stage[], overrides: Partial<Client> = {}): Client =>
  makeClient({ id, name: id, stage: stages[stages.length - 1]!, stageHistory: history(...stages), ...overrides });

const log = (date: string, values: Partial<ProgressLog> = {}, clientId = 'c1'): ProgressLog => ({
  id: `${clientId}-${date}`,
  clientId,
  date,
  ...values,
});

const checkIn = (clientId: string, date: string, adherenceRating: number): CheckIn => ({
  id: `${clientId}-${date}`,
  clientId,
  date,
  adherenceRating,
  coachNotes: '',
  nextActions: '',
});

describe('isOverdue', () => {
  it('is true only for dates before today', () => {
    expect(isOverdue('2026-10-20', TODAY)).toBe(true);
    expect(isOverdue(TODAY, TODAY)).toBe(false);
    expect(isOverdue('2026-10-22', TODAY)).toBe(false);
  });
});

describe('rangeStart', () => {
  it('counts today as the last day of fixed ranges', () => {
    expect(rangeStart('2w', TODAY)).toBe('2026-10-08');
    expect(rangeStart('4w', TODAY)).toBe('2026-09-24');
    expect(rangeStart('12w', TODAY)).toBe('2026-07-30');
  });

  it('starts "all" at the earliest log, or today when there are none', () => {
    expect(rangeStart('all', TODAY, [log('2026-09-02'), log('2026-08-15'), log('2026-10-01')])).toBe('2026-08-15');
    expect(rangeStart('all', TODAY, [])).toBe(TODAY);
  });
});

describe('dailySeries', () => {
  it('returns one point per day, with gaps for missed days', () => {
    const series = dailySeries([log('2026-10-01', { steps: 1 }), log('2026-10-03', { steps: 3 })], '2026-10-01', '2026-10-04');
    expect(series.map((p) => [p.date, p.log?.steps])).toEqual([
      ['2026-10-01', 1],
      ['2026-10-02', undefined],
      ['2026-10-03', 3],
      ['2026-10-04', undefined],
    ]);
  });

  it('crosses month boundaries and returns nothing for an inverted range', () => {
    expect(dailySeries([], '2026-09-30', '2026-10-01').map((p) => p.date)).toEqual(['2026-09-30', '2026-10-01']);
    expect(dailySeries([], '2026-10-02', '2026-10-01')).toEqual([]);
  });
});

describe('movingAverage', () => {
  it('computes a trailing 7-day average', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(movingAverage(values)).toEqual([1, 1.5, 2, 2.5, 3, 3.5, 4, 5]);
  });

  it('skips missing days instead of treating them as zero', () => {
    expect(movingAverage([200, undefined, 198], { window: 3 })).toEqual([200, 200, 199]);
  });

  it('returns undefined when the window has fewer than minPoints values', () => {
    expect(movingAverage([200, undefined, 198, undefined], { window: 3, minPoints: 2 })).toEqual([undefined, undefined, 199, undefined]);
  });

  it('handles empty input and windows larger than the data', () => {
    expect(movingAverage([])).toEqual([]);
    expect(movingAverage([4, 6], { window: 30 })).toEqual([4, 5]);
  });
});

describe('isWithinTolerance', () => {
  it('includes the ±10% boundary', () => {
    expect(isWithinTolerance(2200, 2000)).toBe(true);
    expect(isWithinTolerance(1800, 2000)).toBe(true);
    expect(isWithinTolerance(2201, 2000)).toBe(false);
    expect(isWithinTolerance(1799, 2000)).toBe(false);
  });

  it('supports a custom tolerance', () => {
    expect(isWithinTolerance(2100, 2000, 0.05)).toBe(true);
    expect(isWithinTolerance(2101, 2000, 0.05)).toBe(false);
  });
});

describe('calorieHitRate', () => {
  it('is the share of days with calories logged that were within ±10%', () => {
    const logs = [
      log('2026-10-01', { calories: 2000 }),
      log('2026-10-02', { calories: 2500 }),
      log('2026-10-03', { calories: 1850 }),
      log('2026-10-04', { calories: 1500 }),
      log('2026-10-05', { weightLbs: 180 }), // no calories: excluded, not a miss
    ];
    expect(calorieHitRate(logs, 2000)).toBe(0.5);
  });

  it('is null when nothing was logged', () => {
    expect(calorieHitRate([], 2000)).toBeNull();
    expect(calorieHitRate([log('2026-10-01', { steps: 5 })], 2000)).toBeNull();
  });
});

describe('stepHitRate', () => {
  it('counts days at or above target', () => {
    const logs = [log('2026-10-01', { steps: 10000 }), log('2026-10-02', { steps: 9999 }), log('2026-10-03', { steps: 12000 }), log('2026-10-04')];
    expect(stepHitRate(logs, 10000)).toBeCloseTo(2 / 3);
  });

  it('is null with no step data', () => {
    expect(stepHitRate([], 10000)).toBeNull();
  });
});

describe('summarizeProgress', () => {
  const targets = makeClient().targets; // 2000 kcal, 10k steps

  it('summarizes weight change, averages and hit rates', () => {
    const summary = summarizeProgress(
      [
        log('2026-10-03', { weightLbs: 198, calories: 2500, proteinG: 120, steps: 8000 }),
        log('2026-10-01', { weightLbs: 200, calories: 2000, proteinG: 150, steps: 12000 }),
        log('2026-10-02', { calories: 1900, proteinG: 150 }),
      ],
      targets,
    );
    expect(summary).toEqual({
      startWeight: 200,
      latestWeight: 198,
      weightChange: -2,
      avgCalories: 2133.3333333333335,
      avgProtein: 140,
      avgSteps: 10000,
      calorieHitRate: 2 / 3,
      stepHitRate: 0.5,
      daysLogged: 3,
    });
  });

  it('reports no weight change from a single weigh-in', () => {
    const summary = summarizeProgress([log('2026-10-01', { weightLbs: 200 })], targets);
    expect(summary.weightChange).toBeNull();
    expect(summary.latestWeight).toBe(200);
  });

  it('returns nulls for an empty period', () => {
    expect(summarizeProgress([], targets)).toMatchObject({
      weightChange: null,
      avgCalories: null,
      avgProtein: null,
      avgSteps: null,
      calorieHitRate: null,
      stepHitRate: null,
      daysLogged: 0,
    });
  });
});

describe('conversion', () => {
  const clients = [
    clientAt('a', ['lead', 'consult', 'active'], { leadSource: 'referral' }),
    clientAt('b', ['lead', 'consult', 'active', 'churned'], { leadSource: 'referral' }), // converted, then left
    clientAt('c', ['lead', 'consult'], { leadSource: 'referral' }),
    clientAt('d', ['lead', 'consult', 'beta'], { leadSource: 'social' }), // beta is not active
    clientAt('e', ['lead'], { leadSource: 'social' }),
    clientAt('f', ['active'], { leadSource: 'gym' }), // added directly as active: not a funnel lead
  ];

  it('hasReachedStage checks the full history, not the current stage', () => {
    expect(hasReachedStage(clients[1]!, 'active')).toBe(true);
    expect(hasReachedStage(clients[3]!, 'active')).toBe(false);
  });

  it('counts leads who ever reached active', () => {
    expect(leadToActiveConversion(clients)).toEqual({ leads: 5, converted: 2, rate: 0.4 });
  });

  it('breaks conversion down by lead source with null for sources without leads', () => {
    const bySource = conversionByLeadSource(clients);
    expect(bySource.referral).toEqual({ leads: 3, converted: 2, rate: 2 / 3 });
    expect(bySource.social).toEqual({ leads: 2, converted: 0, rate: 0 });
    expect(bySource.gym).toEqual({ leads: 0, converted: 0, rate: null });
    expect(bySource.email_list).toEqual({ leads: 0, converted: 0, rate: null });
  });

  it('returns a null rate with no clients', () => {
    expect(leadToActiveConversion([])).toEqual({ leads: 0, converted: 0, rate: null });
  });
});

describe('counts', () => {
  it('counts clients per stage and per lead source, including zeros', () => {
    const clients = [
      clientAt('a', ['lead'], { leadSource: 'gym' }),
      clientAt('b', ['lead', 'active'], { leadSource: 'gym' }),
      clientAt('c', ['lead', 'active'], { leadSource: 'social' }),
    ];
    expect(countByStage(clients)).toEqual({ lead: 1, consult: 0, beta: 0, active: 2, paused: 0, churned: 0 });
    expect(countByLeadSource(clients)).toEqual({ referral: 0, social: 1, gym: 2, email_list: 0 });
  });
});

describe('checkInsDueThisWeek', () => {
  it('lists coaching clients due by Sunday, including overdue ones, soonest first', () => {
    const clients = [
      clientAt('sun', ['lead', 'active'], { nextCheckInDate: '2026-10-25' }),
      clientAt('next-mon', ['lead', 'active'], { nextCheckInDate: '2026-10-26' }),
      clientAt('overdue', ['lead', 'active'], { nextCheckInDate: '2026-10-14' }),
      clientAt('beta-today', ['lead', 'beta'], { nextCheckInDate: TODAY }),
      clientAt('paused', ['lead', 'active', 'paused'], { nextCheckInDate: '2026-10-22' }),
      clientAt('no-date', ['lead', 'active']),
    ];
    expect(checkInsDueThisWeek(clients, TODAY).map((d) => [d.client.id, d.overdue])).toEqual([
      ['overdue', true],
      ['beta-today', false],
      ['sun', false],
    ]);
  });

  it('uses Monday-to-Sunday weeks even when today is Sunday', () => {
    const clients = [
      clientAt('sun', ['lead', 'active'], { nextCheckInDate: '2026-10-25' }),
      clientAt('mon', ['lead', 'active'], { nextCheckInDate: '2026-10-26' }),
    ];
    expect(checkInsDueThisWeek(clients, '2026-10-25').map((d) => d.client.id)).toEqual(['sun']);
    expect(weekStart('2026-10-25')).toBe('2026-10-19');
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
  });
});

describe('clientsNeedingFollowUp', () => {
  const clients = [
    clientAt('today', ['lead', 'active']),
    clientAt('two-days', ['lead', 'active']),
    clientAt('three-days', ['lead', 'beta']),
    clientAt('ten-days', ['lead', 'active']),
    clientAt('never', ['lead', 'active']),
    clientAt('paused', ['lead', 'active', 'paused']),
  ];
  const logs = [
    log(TODAY, {}, 'today'),
    log('2026-10-19', {}, 'two-days'),
    log('2026-10-18', {}, 'three-days'),
    log('2026-10-11', {}, 'ten-days'),
    log('2026-10-01', {}, 'ten-days'),
    log('2026-10-01', {}, 'paused'),
  ];

  it('flags coaching clients with no log in the last 3 days, longest gap first', () => {
    expect(clientsNeedingFollowUp(clients, logs, TODAY).map((f) => [f.client.id, f.daysSinceLog])).toEqual([
      ['never', null],
      ['ten-days', 10],
      ['three-days', 3],
    ]);
  });

  it('reports the most recent log date', () => {
    const tenDays = clientsNeedingFollowUp(clients, logs, TODAY).find((f) => f.client.id === 'ten-days');
    expect(tenDays?.lastLogDate).toBe('2026-10-11');
  });

  it('ignores future-dated logs and supports a custom threshold', () => {
    const future = [log('2026-10-30', {}, 'two-days'), log('2026-10-19', {}, 'two-days')];
    const result = clientsNeedingFollowUp([clients[1]!], future, TODAY, 2);
    expect(result.map((f) => [f.client.id, f.daysSinceLog])).toEqual([['two-days', 2]]);
  });
});

describe('averageAdherence', () => {
  const clients = [
    clientAt('a', ['lead', 'active']),
    clientAt('b', ['lead', 'active']),
    clientAt('quiet', ['lead', 'active']),
    clientAt('beta', ['lead', 'beta']),
  ];

  it('averages per client first, then across active clients in the last 28 days', () => {
    const checkIns = [
      checkIn('a', '2026-10-20', 5),
      checkIn('a', '2026-10-13', 5),
      checkIn('a', '2026-10-06', 2), // a averages 4
      checkIn('b', '2026-10-15', 2), // b averages 2
      checkIn('a', '2026-09-01', 1), // outside the window
      checkIn('beta', '2026-10-20', 1), // not active
    ];
    expect(averageAdherence(clients, checkIns, TODAY)).toEqual({ average: 3, clientCount: 2 });
  });

  it('includes the first day of the window and excludes future check-ins', () => {
    const checkIns = [checkIn('a', '2026-09-24', 4), checkIn('a', '2026-10-30', 1)];
    expect(averageAdherence(clients, checkIns, TODAY)).toEqual({ average: 4, clientCount: 1 });
  });

  it('is null when no active client checked in', () => {
    expect(averageAdherence(clients, [], TODAY)).toEqual({ average: null, clientCount: 0 });
  });
});
