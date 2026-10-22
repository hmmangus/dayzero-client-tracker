import { useMemo, useState } from 'react';
import { useMyProgressLogs, useToday } from '../../hooks';
import { DATE_RANGES, DATE_RANGE_LABELS, summarizeProgress, type DateRangeOption } from '../../lib/metrics';
import { formatInt } from '../../lib/format';
import { ErrorState, LoadingState } from '../../components/States';
import { SummaryStats } from '../clients/SummaryStats';
import { buildProgressSeries } from '../clients/progressSeries';
import { WeightChart } from '../clients/charts/WeightChart';
import { TargetBarChart } from '../clients/charts/TargetBarChart';
import { usePortalContext } from './PortalLayout';

export function PortalProgressPage() {
  const { profile } = usePortalContext();
  const logs = useMyProgressLogs();
  const today = useToday();
  const [range, setRange] = useState<DateRangeOption>('4w');

  const series = useMemo(() => buildProgressSeries(logs.data ?? [], range, today), [logs.data, range, today]);
  const summary = useMemo(() => summarizeProgress(series.inRange, profile.targets), [series.inRange, profile.targets]);

  if (logs.status === 'loading') return <LoadingState />;
  if (logs.status === 'error') return <ErrorState error={logs.error} onRetry={logs.refresh} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">My progress</h1>
        <div role="group" aria-label="Date range" className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
          {DATE_RANGES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={range === option}
              onClick={() => setRange(option)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                range === option ? 'bg-teal-700 text-white dark:bg-teal-600' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {DATE_RANGE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>
      <SummaryStats summary={summary} targets={profile.targets} />
      <WeightChart data={series.weight} goalWeight={profile.targets.goalWeightLbs} />
      <TargetBarChart
        title="Daily calories"
        subtitle={`Target ${formatInt(profile.targets.calories)} kcal`}
        seriesName="Calories"
        data={series.calories}
        target={profile.targets.calories}
        tolerance={0.1}
        format={(v) => `${formatInt(v)} kcal`}
      />
      <TargetBarChart
        title="Daily steps"
        subtitle={`Target ${formatInt(profile.targets.dailySteps)}`}
        seriesName="Steps"
        data={series.steps}
        target={profile.targets.dailySteps}
        format={(v) => `${formatInt(v)} steps`}
      />
    </div>
  );
}
