import { z } from 'zod';
import { idSchema, isoDateSchema, isoDateTimeSchema } from './common';

export const LEAD_SOURCES = ['referral', 'social', 'gym', 'email_list'] as const;
export const STAGES = ['lead', 'consult', 'beta', 'active', 'paused', 'churned'] as const;
export const PROGRAM_TIERS = ['beta', 'tier_1', 'tier_2', 'tier_3'] as const;
export const GOALS = ['fat_loss', 'muscle_gain', 'recomp', 'maintenance'] as const;

export const leadSourceSchema = z.enum(LEAD_SOURCES);
export const stageSchema = z.enum(STAGES);
export const programTierSchema = z.enum(PROGRAM_TIERS);
export const goalSchema = z.enum(GOALS);

export const stageHistoryEntrySchema = z.object({
  stage: stageSchema,
  enteredAt: isoDateTimeSchema,
});

export const targetsSchema = z.object({
  calories: z.number().int().positive(),
  proteinG: z.number().int().nonnegative(),
  carbsG: z.number().int().nonnegative(),
  fatG: z.number().int().nonnegative(),
  dailySteps: z.number().int().nonnegative(),
  goalWeightLbs: z.number().positive(),
});

export const clientSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1, 'Name is required'),
    email: z.email().optional(),
    phone: z.string().trim().min(1).optional(),
    leadSource: leadSourceSchema,
    stage: stageSchema,
    stageHistory: z.array(stageHistoryEntrySchema).min(1),
    startDate: isoDateSchema.optional(),
    programTier: programTierSchema,
    nextCheckInDate: isoDateSchema.optional(),
    goal: goalSchema,
    targets: targetsSchema,
    notes: z.string(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .refine((c) => c.stageHistory[c.stageHistory.length - 1]?.stage === c.stage, {
    message: 'stage must match the most recent stageHistory entry',
    path: ['stage'],
  });

/** Fields a caller supplies when creating a client; the repository fills in the rest. */
export const newClientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.email().optional(),
  phone: z.string().trim().min(1).optional(),
  leadSource: leadSourceSchema,
  stage: stageSchema.default('lead'),
  startDate: isoDateSchema.optional(),
  programTier: programTierSchema,
  nextCheckInDate: isoDateSchema.optional(),
  goal: goalSchema,
  targets: targetsSchema,
  notes: z.string().default(''),
});

/** Editable fields. Stage changes go through moveStage so history stays consistent. */
export const clientPatchSchema = newClientSchema.omit({ stage: true }).partial();

export type LeadSource = z.infer<typeof leadSourceSchema>;
export type Stage = z.infer<typeof stageSchema>;
export type ProgramTier = z.infer<typeof programTierSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type StageHistoryEntry = z.infer<typeof stageHistoryEntrySchema>;
export type Targets = z.infer<typeof targetsSchema>;
export type Client = z.infer<typeof clientSchema>;
export type NewClient = z.input<typeof newClientSchema>;
export type ClientPatch = z.infer<typeof clientPatchSchema>;
