import type { Stage } from '../schemas';

export type BadgeTone = 'neutral' | 'teal' | 'blue' | 'violet' | 'amber' | 'red' | 'green';

export const STAGE_TONES: Record<Stage, BadgeTone> = {
  lead: 'neutral',
  consult: 'blue',
  beta: 'violet',
  active: 'green',
  paused: 'amber',
  churned: 'red',
};
