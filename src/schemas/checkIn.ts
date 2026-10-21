import { z } from 'zod';
import { idSchema, isoDateSchema } from './common';

export const checkInSchema = z.object({
  id: idSchema,
  clientId: idSchema,
  date: isoDateSchema,
  adherenceRating: z.number().int().min(1).max(5),
  coachNotes: z.string(),
  nextActions: z.string(),
});

export const checkInInputSchema = checkInSchema.omit({ id: true });

export type CheckIn = z.infer<typeof checkInSchema>;
export type CheckInInput = z.infer<typeof checkInInputSchema>;
