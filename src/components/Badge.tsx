import type { ReactNode } from 'react';
import type { Stage } from '../schemas';
import { STAGE_LABELS } from '../lib/labels';
import { STAGE_TONES, type BadgeTone } from './badgeTones';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  teal: 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
  blue: 'bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  violet: 'bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  amber: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  green: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function StageBadge({ stage }: { stage: Stage }) {
  return <Badge tone={STAGE_TONES[stage]}>{STAGE_LABELS[stage]}</Badge>;
}
