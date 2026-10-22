import type { Stage } from '../../schemas';

export interface StageColumn {
  id: string;
  title: string;
  /** Stages whose clients appear in this column. */
  stages: readonly Stage[];
  /** Stage a client gets when dropped into this column. */
  dropStage: Stage;
}

/** Paused and churned share a column; the card shows which one with a badge. */
export const STAGE_COLUMNS: readonly StageColumn[] = [
  { id: 'lead', title: 'Lead', stages: ['lead'], dropStage: 'lead' },
  { id: 'consult', title: 'Consult', stages: ['consult'], dropStage: 'consult' },
  { id: 'beta', title: 'Beta', stages: ['beta'], dropStage: 'beta' },
  { id: 'active', title: 'Active', stages: ['active'], dropStage: 'active' },
  { id: 'inactive', title: 'Paused / Churned', stages: ['paused', 'churned'], dropStage: 'paused' },
];

export const columnForStage = (stage: Stage): StageColumn =>
  STAGE_COLUMNS.find((column) => column.stages.includes(stage)) ?? STAGE_COLUMNS[0]!;
