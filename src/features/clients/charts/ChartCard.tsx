import type { ReactNode } from 'react';
import { cardClass } from '../../../components/ui';

export interface LegendItem {
  label: string;
  color: string;
  shape: 'line' | 'rect' | 'dot' | 'dash';
}

export function ChartCard({
  title,
  subtitle,
  legend,
  isEmpty,
  emptyMessage = 'Nothing logged in this period.',
  children,
}: {
  title: string;
  subtitle?: string;
  legend?: LegendItem[];
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${cardClass} p-4`} aria-label={title}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {legend && !isEmpty && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5">
                <LegendKey {...item} />
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {isEmpty ? (
        <p className="flex h-56 items-center justify-center text-sm text-slate-400 dark:text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="h-56">{children}</div>
      )}
    </section>
  );
}

function LegendKey({ color, shape }: LegendItem) {
  if (shape === 'rect') return <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />;
  if (shape === 'dot') return <span className="h-2 w-2 rounded-full" style={{ background: color }} />;
  if (shape === 'dash') return <span className="w-3.5 border-t-2 border-dashed" style={{ borderColor: color }} />;
  return <span className="h-0.5 w-3.5 rounded" style={{ background: color }} />;
}
