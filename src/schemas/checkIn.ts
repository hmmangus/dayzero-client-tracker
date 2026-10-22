import { z } from 'zod';
import { idSchema, isoDateSchema } from './common';

export const CHECK_IN_STATUSES = ['awaiting_coach', 'complete'] as const;
export const CHECK_IN_AUTHORS = ['client', 'coach'] as const;

const RATING_MESSAGE = 'Choose a rating from 1 to 5.';
const rating = z.number({ error: RATING_MESSAGE }).int(RATING_MESSAGE).min(1, RATING_MESSAGE).max(5, RATING_MESSAGE);

/**
 * A weekly check-in. Clients start one from the portal (self-rating, wins,
 * struggles, questions) and it waits for the coach's reply; coaches can also
 * record a complete check-in directly.
 */
export const checkInSchema = z.object({
  id: idSchema,
  clientId: idSchema,
  date: isoDateSchema,
  /** 1–5. The client's self-rating when they start it; the coach can adjust. */
  adherenceRating: rating,
  wins: z.string(),
  struggles: z.string(),
  questions: z.string(),
  coachNotes: z.string(),
  nextActions: z.string(),
  submittedBy: z.enum(CHECK_IN_AUTHORS),
  status: z.enum(CHECK_IN_STATUSES),
});

/** A check-in the coach records directly (complete straight away). */
export const checkInInputSchema = z.object({
  clientId: idSchema,
  date: isoDateSchema,
  adherenceRating: rating,
  coachNotes: z.string(),
  nextActions: z.string(),
});

/** What a client submits from the portal. Their client id comes from their sign-in. */
export const clientCheckInInputSchema = z.object({
  date: isoDateSchema,
  adherenceRating: rating,
  wins: z.string().trim(),
  struggles: z.string().trim(),
  questions: z.string().trim(),
});

/** The coach's reply, which completes a client-submitted check-in. */
export const checkInReplySchema = z.object({
  coachNotes: z.string().trim().min(1, 'Write a short reply for your client.'),
  nextActions: z.string().trim(),
  adherenceRating: rating.optional(),
});

export type CheckIn = z.infer<typeof checkInSchema>;
export type CheckInInput = z.infer<typeof checkInInputSchema>;
export type ClientCheckInInput = z.infer<typeof clientCheckInInputSchema>;
export type CheckInReply = z.infer<typeof checkInReplySchema>;
export type CheckInStatus = CheckIn['status'];
