import { Bar, BarChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from './ChartCard';
import { axisProps, chartMargin, compact, gridProps, xAxisProps } from './chartTheme';
import { ChartTooltip } from './ChartTooltip';

export interface DailyValue {
  date: string;
  value?: number;
}

interface TargetBarChartProps {
  title: string;
  subtitle: string;
  seriesName: string;
  data: DailyValue[];
  target: number;
  /** When set, shades target ± this fraction (e.g. 0.1 for the ±10% calorie band). */
  tolerance?: number;
  format: (value: number) => string;
}

/** Daily bars against a target line, used for calories and steps. */
export function TargetBarChart({ title, subtitle, seriesName, data, target, tolerance, format }: TargetBarChartProps) {
  const isEmpty = !data.some((d) => d.value !== undefined);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      isEmpty={isEmpty}
      legend={[
        { label: seriesName, color: 'var(--series-1)', shape: 'rect' },
        { label: tolerance ? `Target ±${tolerance * 100}%` : 'Target', color: 'var(--chart-reference)', shape: 'dash' },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={chartMargin} barCategoryGap={2}>
          <CartesianGrid {...gridProps} />
          <XAxis {...xAxisProps} />
          <YAxis {...axisProps} axisLine={false} tickFormatter={compact} />
          <Tooltip cursor={{ fill: 'var(--chart-band)' }} content={(props) => <ChartTooltip {...props} format={format} />} />
          {tolerance && (
            <ReferenceArea y1={target * (1 - tolerance)} y2={target * (1 + tolerance)} fill="var(--chart-band)" fillOpacity={1} stroke="none" />
          )}
          <Bar name={seriesName} dataKey="value" fill="var(--series-1)" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <ReferenceLine y={target} stroke="var(--chart-reference)" strokeDasharray="4 4" ifOverflow="extendDomain" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
