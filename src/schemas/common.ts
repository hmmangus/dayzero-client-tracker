import { z } from 'zod';

/** Calendar day, e.g. "2026-10-20". Used for anything that is a day, not an instant. */
export const isoDateSchema = z.iso.date();

/** Full ISO-8601 timestamp, e.g. "2026-10-20T14:03:00.000Z". */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const idSchema = z.string().min(1);

export type IsoDate = z.infer<typeof isoDateSchema>;
export type IsoDateTime = z.infer<typeof isoDateTimeSchema>;
