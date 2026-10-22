import { format } from 'date-fns';
import { fromIsoDate } from './dates';
import type { IsoDate } from '../schemas';

export const formatDay = (date: IsoDate) => format(fromIsoDate(date), 'MMM d');
export const formatDayLong = (date: IsoDate) => format(fromIsoDate(date), 'EEE, MMM d, yyyy');

const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export const formatInt = (value: number | null | undefined) => (value == null ? '—' : integer.format(value));
export const formatLbs = (value: number | null | undefined) => (value == null ? '—' : `${oneDecimal.format(value)} lb`);
export const formatSignedLbs = (value: number | null | undefined) =>
  value == null ? '—' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${oneDecimal.format(Math.abs(value))} lb`;
export const formatPercent = (ratio: number | null | undefined) => (ratio == null ? '—' : `${Math.round(ratio * 100)}%`);
