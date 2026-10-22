import { formatDay } from '../../../lib/format';

/** Shared Recharts props so every chart has the same recessive axes and grid. */
export const axisProps = {
  stroke: 'var(--chart-grid)',
  tick: { fill: 'var(--chart-axis)', fontSize: 11 },
  tickLine: false,
} as const;

export const xAxisProps = {
  ...axisProps,
  dataKey: 'date',
  tickFormatter: (value: string) => formatDay(value),
  minTickGap: 28,
} as const;

export const gridProps = { stroke: 'var(--chart-grid)', vertical: false } as const;

export const chartMargin = { top: 8, right: 8, bottom: 0, left: -12 };

export const compact = (value: number) => (Math.abs(value) >= 1000 ? `${Math.round(value / 100) / 10}K` : String(value));
