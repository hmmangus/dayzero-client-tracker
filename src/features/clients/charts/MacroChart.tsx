import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Targets } from '../../../schemas';
import { ChartCard } from './ChartCard';
import { axisProps, chartMargin, gridProps, xAxisProps } from './chartTheme';
import { ChartTooltip } from './ChartTooltip';

export interface MacroPoint {
  date: string;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

const SERIES = [
  { key: 'proteinG', label: 'Protein', color: 'var(--series-1)' },
  { key: 'carbsG', label: 'Carbs', color: 'var(--series-2)' },
  { key: 'fatG', label: 'Fat', color: 'var(--series-3)' },
] as const;

export function MacroChart({ data, targets }: { data: MacroPoint[]; targets: Targets }) {
  const isEmpty = !data.some((d) => d.proteinG !== undefined || d.carbsG !== undefined || d.fatG !== undefined);

  return (
    <ChartCard
      title="Macros per day"
      subtitle={`Targets P ${targets.proteinG}g · C ${targets.carbsG}g · F ${targets.fatG}g`}
      isEmpty={isEmpty}
      legend={SERIES.map((s) => ({ label: s.label, color: s.color, shape: 'rect' as const }))}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={chartMargin} barCategoryGap={2}>
          <CartesianGrid {...gridProps} />
          <XAxis {...xAxisProps} />
          <YAxis {...axisProps} axisLine={false} unit="g" />
          <Tooltip cursor={{ fill: 'var(--chart-band)' }} content={(props) => <ChartTooltip {...props} format={(v) => `${Math.round(v)} g`} />} />
          {SERIES.map((s, i) => (
            <Bar
              key={s.key}
              name={s.label}
              dataKey={s.key}
              stackId="macros"
              fill={s.color}
              // Surface-coloured stroke gives the 2px gap between stacked segments.
              stroke="var(--chart-surface)"
              strokeWidth={1}
              maxBarSize={24}
              radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
