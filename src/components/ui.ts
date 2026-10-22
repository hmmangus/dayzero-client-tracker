/** Shared Tailwind class recipes so buttons, inputs and cards look the same everywhere. */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500',
  secondary:
    'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
};

export const buttonClass = (variant: ButtonVariant = 'primary', extra = '') =>
  `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${extra}`.trim();

export const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ' +
  'placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/30 ' +
  'aria-[invalid=true]:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

export const labelClass = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300';

export const cardClass =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';
