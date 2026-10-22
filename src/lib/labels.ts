import type { Goal, LeadSource, ProgramTier, Stage } from '../schemas';

export const STAGE_LABELS: Record<Stage, string> = {
  lead: 'Lead',
  consult: 'Consult',
  beta: 'Beta',
  active: 'Active',
  paused: 'Paused',
  churned: 'Churned',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  referral: 'Referral',
  social: 'Social',
  gym: 'Gym',
  email_list: 'Email list',
};

export const TIER_LABELS: Record<ProgramTier, string> = {
  beta: 'Beta',
  tier_1: 'Tier 1',
  tier_2: 'Tier 2',
  tier_3: 'Tier 3',
};

export const GOAL_LABELS: Record<Goal, string> = {
  fat_loss: 'Fat loss',
  muscle_gain: 'Muscle gain',
  recomp: 'Recomp',
  maintenance: 'Maintenance',
};
