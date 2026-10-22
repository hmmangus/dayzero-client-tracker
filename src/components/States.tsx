import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { buttonClass } from './ui';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500 dark:text-slate-400">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600 dark:border-slate-700 dark:border-t-teal-400" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  as: Title = 'p',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Use 'h1' when the empty state is the whole page. */
  as?: 'p' | 'h1' | 'h2';
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
      <Title className="font-medium text-slate-800 dark:text-slate-200">{title}</Title>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900 dark:bg-red-950/40">
      <Icon name="alert" className="h-6 w-6 text-red-600 dark:text-red-400" />
      <p className="font-medium text-red-800 dark:text-red-200">Something went wrong</p>
      <p className="text-sm text-red-700 dark:text-red-300">{error.message}</p>
      {onRetry && (
        <button type="button" className={buttonClass('secondary')} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
