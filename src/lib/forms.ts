import type { z } from 'zod';

export type FieldErrors = Record<string, string>;

/** Flattens Zod issues to `{ "targets.calories": "message" }`, keeping the first message per field. */
export function issuesToFieldErrors(issues: z.core.$ZodIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const path = issue.path.join('.');
    errors[path] ??= issue.message;
  }
  return errors;
}

/** Form inputs give strings; empty means "not provided". */
export const optionalString = (value: string) => (value.trim() === '' ? undefined : value.trim());

/** Empty → undefined, otherwise a number (NaN for junk, which the schema then rejects). */
export const optionalNumber = (value: string) => (value.trim() === '' ? undefined : Number(value));

/** Required numeric field: empty becomes NaN so the schema reports it. */
export const requiredNumber = (value: string) => (value.trim() === '' ? Number.NaN : Number(value));
