import type { IsoDate, ProgressLog } from '../../schemas';
import { dailySeries, movingAverage, rangeStart, type DateRangeOption } from '../../lib/metrics';

/** Builds every chart's data for one client and date range. */
export function buildProgressSeries(logs: ProgressLog[], range: DateRangeOption, today: IsoDate) {
  const from = rangeStart(range, today, logs);
  const inRange = logs.filter((log) => log.date >= from && log.date <= today);

  // The moving average uses the full history so the first days of a short range
  // still average over the 7 days before them.
  const fullFrom = rangeStart('all', today, logs) < from ? rangeStart('all', today, logs) : from;
  const full = dailySeries(logs, fullFrom, today);
  const averages = movingAverage(full.map((p) => p.log?.weightLbs), { window: 7, minPoints: 3 });
  const averageByDate = new Map(full.map((p, i) => [p.date, averages[i]]));

  const days = dailySeries(logs, from, today);
  return {
    from,
    inRange,
    weight: days.map(({ date, log }) => ({ date, weight: log?.weightLbs, average: averageByDate.get(date) })),
    calories: days.map(({ date, log }) => ({ date, value: log?.calories })),
    steps: days.map(({ date, log }) => ({ date, value: log?.steps })),
    macros: days.map(({ date, log }) => ({ date, proteinG: log?.proteinG, carbsG: log?.carbsG, fatG: log?.fatG })),
  };
}
