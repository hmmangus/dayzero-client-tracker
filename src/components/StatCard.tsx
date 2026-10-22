import type { ReactNode } from 'react';
import { cardClass } from './ui';

export function StatCard({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'alert' }) {
  return (
    <div className={`${cardClass} p-4`}>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === 'alert' ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}
