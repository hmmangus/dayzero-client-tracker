import { z } from 'zod';
import { idSchema, isoDateSchema } from './common';

const optionalAmount = z.number().nonnegative().optional();

export const progressLogSchema = z.object({
  id: idSchema,
  clientId: idSchema,
  date: isoDateSchema,
  weightLbs: z.number().positive().optional(),
  calories: optionalAmount,
  proteinG: optionalAmount,
  carbsG: optionalAmount,
  fatG: optionalAmount,
  steps: z.number().int().nonnegative().optional(),
  note: z.string().optional(),
});

/** Input for logging a day. Upserting replaces any existing log for that client and date. */
export const progressLogInputSchema = progressLogSchema.omit({ id: true });

export type ProgressLog = z.infer<typeof progressLogSchema>;
export type ProgressLogInput = z.infer<typeof progressLogInputSchema>;
