import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { IsoDate } from '../schemas';

/** Formats a Date as a calendar day in the user's local time zone. */
export const toIsoDate = (date: Date): IsoDate => format(date, 'yyyy-MM-dd');

/** Parses a calendar day as local midnight (not UTC, which `new Date('2026-01-01')` would do). */
export const fromIsoDate = (isoDate: IsoDate): Date => parseISO(isoDate);

export const addDaysIso = (isoDate: IsoDate, days: number): IsoDate =>
  toIsoDate(addDays(fromIsoDate(isoDate), days));

/** Whole calendar days from `a` to `b` (positive when `b` is later). */
export const daysBetween = (a: IsoDate, b: IsoDate): number =>
  differenceInCalendarDays(fromIsoDate(b), fromIsoDate(a));
