import { formatDay } from '../../../lib/format';

interface TooltipEntry {
  name?: string | number;
  value?: unknown;
  color?: string;
  dataKey?: string | number | ((obj: unknown) => unknown);
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipEntry>;
  label?: string | number;
  format?: (value: number) => string;
}

/** Value-first tooltip with short line keys, shared by all charts. */
export function ChartTooltip({ active, payload, label, format = (v) => v.toLocaleString() }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((entry) => typeof entry.value === 'number');
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1 text-slate-500 dark:text-slate-400">{typeof label === 'string' ? formatDay(label) : label}</p>
      {rows.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">Not logged</p>
      ) : (
        rows.map((entry) => (
          <p key={String(entry.name)} className="flex items-center gap-2">
            <span className="h-0.5 w-3 rounded" style={{ background: entry.color }} />
            <span className="font-semibold text-slate-900 dark:text-white">{format(entry.value as number)}</span>
            <span className="text-slate-500 dark:text-slate-400">{entry.name}</span>
          </p>
        ))
      )}
    </div>
  );
}
