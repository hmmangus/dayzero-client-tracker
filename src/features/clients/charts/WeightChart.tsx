import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { formatLbs } from '../../../lib/format';
import { ChartCard } from './ChartCard';
import { axisProps, chartMargin, gridProps, xAxisProps } from './chartTheme';
import { ChartTooltip } from './ChartTooltip';

export interface WeightPoint {
  date: string;
  weight?: number;
  average?: number;
}

export function WeightChart({ data, goalWeight }: { data: WeightPoint[]; goalWeight: number }) {
  const isEmpty = !data.some((d) => d.weight !== undefined);

  return (
    <ChartCard
      title="Weight trend"
      subtitle={`Goal ${formatLbs(goalWeight)}`}
      isEmpty={isEmpty}
      legend={[
        { label: 'Weigh-in', color: 'var(--series-muted)', shape: 'dot' },
        { label: '7-day average', color: 'var(--series-1)', shape: 'line' },
        { label: 'Goal', color: 'var(--chart-reference)', shape: 'dash' },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={chartMargin}>
          <CartesianGrid {...gridProps} />
          <XAxis {...xAxisProps} />
          <YAxis
            {...axisProps}
            axisLine={false}
            domain={[(min: number) => Math.floor(min - 2), (max: number) => Math.ceil(max + 2)]}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
            content={(props) => <ChartTooltip {...props} format={(v) => formatLbs(v)} />}
          />
          <ReferenceLine
            y={goalWeight}
            stroke="var(--chart-reference)"
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
          />
          <Scatter name="Weigh-in" dataKey="weight" fill="var(--series-muted)" shape="circle" isAnimationActive={false} />
          <Line
            name="7-day average"
            dataKey="average"
            stroke="var(--series-1)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: 'var(--chart-surface)', strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
