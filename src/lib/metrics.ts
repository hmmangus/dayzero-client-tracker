/**
 * Pure business metrics. Nothing here reads the clock or storage: callers pass
 * `today` and the data, which keeps every function deterministic and testable.
 */
import { endOfWeek, startOfWeek } from 'date-fns';
import {
  LEAD_SOURCES,
  STAGES,
  type CheckIn,
  type Client,
  type IsoDate,
  type LeadSource,
  type ProgressLog,
  type Stage,
  type Targets,
} from '../schemas';
import { addDaysIso, daysBetween, fromIsoDate, toIsoDate } from './dates';

// ------------------------------------------------------------------ helpers

const mean = (values: number[]): number | null =>
  values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length;

const ratio = (numerator: number, denominator: number): number | null =>
  denominator === 0 ? null : numerator / denominator;

const defined = <T,>(values: Array<T | undefined>): T[] => values.filter((v): v is T => v !== undefined);

/** Clients currently on a program (the ones who should be logging and checking in). */
export const isCoachingStage = (stage: Stage) => stage === 'active' || stage === 'beta';

export const isOverdue = (date: IsoDate, today: IsoDate) => date < today;

// ------------------------------------------------------------- date ranges

export const DATE_RANGES = ['2w', '4w', '12w', 'all'] as const;
export type DateRangeOption = (typeof DATE_RANGES)[number];

export const DATE_RANGE_LABELS: Record<DateRangeOption, string> = {
  '2w': '2 weeks',
  '4w': '4 weeks',
  '12w': '12 weeks',
  all: 'All',
};

const RANGE_DAYS: Record<Exclude<DateRangeOption, 'all'>, number> = { '2w': 14, '4w': 28, '12w': 84 };

/**
 * First day (inclusive) of a range ending today. "all" starts at the earliest
 * log, or today if there are none.
 */
export function rangeStart(range: DateRangeOption, today: IsoDate, logs: ProgressLog[] = []): IsoDate {
  if (range === 'all') {
    return logs.reduce<IsoDate>((earliest, log) => (log.date < earliest ? log.date : earliest), today);
  }
  return addDaysIso(today, -(RANGE_DAYS[range] - 1));
}

// ---------------------------------------------------------- daily series

export interface DailyPoint {
  date: IsoDate;
  log: ProgressLog | undefined;
}

/** One entry per calendar day from `from` to `to` inclusive, with gaps for missed days. */
export function dailySeries(logs: ProgressLog[], from: IsoDate, to: IsoDate): DailyPoint[] {
  const byDate = new Map(logs.map((log) => [log.date, log]));
  const length = daysBetween(from, to) + 1;
  return Array.from({ length: Math.max(0, length) }, (_, i) => {
    const date = addDaysIso(from, i);
    return { date, log: byDate.get(date) };
  });
}

/**
 * Trailing moving average over a series of daily values (one per calendar day).
 * Missing days are skipped, so the average uses whatever was logged in the
 * window. Returns undefined where the window has fewer than `minPoints` values.
 */
export function movingAverage(
  values: Array<number | undefined>,
  { window = 7, minPoints = 1 }: { window?: number; minPoints?: number } = {},
): Array<number | undefined> {
  return values.map((_, i) => {
    const inWindow = defined(values.slice(Math.max(0, i - window + 1), i + 1));
    return inWindow.length >= minPoints ? mean(inWindow)! : undefined;
  });
}

// ------------------------------------------------------------ adherence

/** True when `value` is within ±`tolerance` (a fraction) of `target`. */
export const isWithinTolerance = (value: number, target: number, tolerance = 0.1) =>
  Math.abs(value - target) <= target * tolerance;

/**
 * Share of logged days where calories were within ±10% of target.
 * Days without a calorie entry are excluded rather than counted as misses.
 */
export const calorieHitRate = (logs: ProgressLog[], target: number, tolerance = 0.1): number | null => {
  const logged = defined(logs.map((l) => l.calories));
  return ratio(logged.filter((c) => isWithinTolerance(c, target, tolerance)).length, logged.length);
};

/** Share of days with a step count where steps met or beat the target. */
export const stepHitRate = (logs: ProgressLog[], target: number): number | null => {
  const logged = defined(logs.map((l) => l.steps));
  return ratio(logged.filter((s) => s >= target).length, logged.length);
};

export interface ProgressSummary {
  startWeight: number | null;
  latestWeight: number | null;
  /** Latest minus earliest logged weight in the period. Negative = lost weight. */
  weightChange: number | null;
  avgCalories: number | null;
  avgProtein: number | null;
  avgSteps: number | null;
  calorieHitRate: number | null;
  stepHitRate: number | null;
  daysLogged: number;
}

/** Summary stats for a set of logs (normally one client within a date range). */
export function summarizeProgress(logs: ProgressLog[], targets: Targets): ProgressSummary {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const weights = defined(sorted.map((l) => l.weightLbs));
  const startWeight = weights[0] ?? null;
  const latestWeight = weights[weights.length - 1] ?? null;

  return {
    startWeight,
    latestWeight,
    weightChange: startWeight !== null && latestWeight !== null && weights.length > 1 ? latestWeight - startWeight : null,
    avgCalories: mean(defined(sorted.map((l) => l.calories))),
    avgProtein: mean(defined(sorted.map((l) => l.proteinG))),
    avgSteps: mean(defined(sorted.map((l) => l.steps))),
    calorieHitRate: calorieHitRate(sorted, targets.calories),
    stepHitRate: stepHitRate(sorted, targets.dailySteps),
    daysLogged: sorted.length,
  };
}

// ------------------------------------------------------------- pipeline

export const hasReachedStage = (client: Client, stage: Stage) => client.stageHistory.some((entry) => entry.stage === stage);

export interface ConversionStats {
  /** Clients who entered the pipeline as a lead. */
  leads: number;
  /** Of those, how many have ever reached Active (even if they later paused or churned). */
  converted: number;
  rate: number | null;
}

/**
 * Lead → Active conversion from stageHistory. Clients added directly at a later
 * stage never went through the funnel, so they are left out of both counts.
 */
export function leadToActiveConversion(clients: Client[]): ConversionStats {
  const leads = clients.filter((c) => hasReachedStage(c, 'lead'));
  const converted = leads.filter((c) => hasReachedStage(c, 'active')).length;
  return { leads: leads.length, converted, rate: ratio(converted, leads.length) };
}

export function conversionByLeadSource(clients: Client[]): Record<LeadSource, ConversionStats> {
  return Object.fromEntries(
    LEAD_SOURCES.map((source) => [source, leadToActiveConversion(clients.filter((c) => c.leadSource === source))]),
  ) as Record<LeadSource, ConversionStats>;
}

export function countByStage(clients: Client[]): Record<Stage, number> {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const client of clients) counts[client.stage]++;
  return counts;
}

export function countByLeadSource(clients: Client[]): Record<LeadSource, number> {
  const counts = Object.fromEntries(LEAD_SOURCES.map((s) => [s, 0])) as Record<LeadSource, number>;
  for (const client of clients) counts[client.leadSource]++;
  return counts;
}

// ------------------------------------------------------------ follow-ups

export interface DueCheckIn {
  client: Client;
  date: IsoDate;
  overdue: boolean;
}

/**
 * Coaching clients whose next check-in falls in the current Monday–Sunday week,
 * plus any that are already overdue (they still need doing). Soonest first.
 */
export function checkInsDueThisWeek(clients: Client[], today: IsoDate): DueCheckIn[] {
  const weekEnd = toIsoDate(endOfWeek(fromIsoDate(today), { weekStartsOn: 1 }));
  return clients
    .filter((c): c is Client & { nextCheckInDate: IsoDate } => isCoachingStage(c.stage) && c.nextCheckInDate !== undefined)
    .filter((c) => c.nextCheckInDate <= weekEnd)
    .map((c) => ({ client: c, date: c.nextCheckInDate, overdue: isOverdue(c.nextCheckInDate, today) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Monday of the week containing `today`. */
export const weekStart = (today: IsoDate) => toIsoDate(startOfWeek(fromIsoDate(today), { weekStartsOn: 1 }));

export interface FollowUp {
  client: Client;
  lastLogDate: IsoDate | null;
  /** Days since the last log, or null if they have never logged. */
  daysSinceLog: number | null;
}

/**
 * Coaching clients with no progress log in the last `days` days (today included).
 * With the default of 3: no log today, yesterday or the day before. Longest gap first.
 */
export function clientsNeedingFollowUp(clients: Client[], logs: ProgressLog[], today: IsoDate, days = 3): FollowUp[] {
  const lastLog = new Map<string, IsoDate>();
  for (const log of logs) {
    if (log.date > today) continue;
    const current = lastLog.get(log.clientId);
    if (!current || log.date > current) lastLog.set(log.clientId, log.date);
  }

  return clients
    .filter((c) => isCoachingStage(c.stage))
    .map((client) => {
      const lastLogDate = lastLog.get(client.id) ?? null;
      return { client, lastLogDate, daysSinceLog: lastLogDate ? daysBetween(lastLogDate, today) : null };
    })
    .filter((f) => f.daysSinceLog === null || f.daysSinceLog >= days)
    .sort((a, b) => (b.daysSinceLog ?? Infinity) - (a.daysSinceLog ?? Infinity));
}

export interface AdherenceSummary {
  average: number | null;
  /** Active clients who had at least one check-in in the window. */
  clientCount: number;
}

/**
 * Average check-in adherence (1–5) across active clients over the last
 * `windowDays`. Each client's check-ins are averaged first so clients who check
 * in more often don't dominate.
 */
export function averageAdherence(clients: Client[], checkIns: CheckIn[], today: IsoDate, windowDays = 28): AdherenceSummary {
  const from = addDaysIso(today, -(windowDays - 1));
  const perClient = clients
    .filter((c) => c.stage === 'active')
    .map((c) => mean(checkIns.filter((ci) => ci.clientId === c.id && ci.date >= from && ci.date <= today).map((ci) => ci.adherenceRating)))
    .filter((avg): avg is number => avg !== null);
  return { average: mean(perClient), clientCount: perClient.length };
}

export interface AwaitingReply {
  client: Client;
  checkIn: CheckIn;
  daysWaiting: number;
}

/** Client-sent check-ins that still need the coach's reply, longest-waiting first. */
export function checkInsAwaitingReply(clients: Client[], checkIns: CheckIn[], today: IsoDate): AwaitingReply[] {
  const byId = new Map(clients.map((c) => [c.id, c]));
  return checkIns
    .filter((ci) => ci.status === 'awaiting_coach' && byId.has(ci.clientId))
    .map((checkIn) => ({ client: byId.get(checkIn.clientId)!, checkIn, daysWaiting: Math.max(0, daysBetween(checkIn.date, today)) }))
    .sort((a, b) => a.checkIn.date.localeCompare(b.checkIn.date));
}
