import type { ProgressSummary } from '../../lib/metrics';
import type { Targets } from '../../schemas';
import { formatInt, formatLbs, formatPercent, formatSignedLbs } from '../../lib/format';
import { StatCard } from '../../components/StatCard';

export function SummaryStats({ summary, targets }: { summary: ProgressSummary; targets: Targets }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatCard
        label="Weight change"
        value={formatSignedLbs(summary.weightChange)}
        hint={summary.latestWeight !== null ? `Now ${formatLbs(summary.latestWeight)}` : 'No weigh-ins'}
      />
      <StatCard label="Avg calories" value={formatInt(summary.avgCalories)} hint={`Target ${formatInt(targets.calories)}`} />
      <StatCard label="Avg protein" value={summary.avgProtein === null ? '—' : `${formatInt(summary.avgProtein)} g`} hint={`Target ${targets.proteinG} g`} />
      <StatCard label="Avg steps" value={formatInt(summary.avgSteps)} hint={`Target ${formatInt(targets.dailySteps)}`} />
      <StatCard label="Calorie target hit" value={formatPercent(summary.calorieHitRate)} hint="Days within ±10%" />
      <StatCard label="Step target hit" value={formatPercent(summary.stepHitRate)} hint="Days at or above target" />
    </div>
  );
}
