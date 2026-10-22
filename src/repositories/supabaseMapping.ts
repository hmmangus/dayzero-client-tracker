/**
 * Converts between database rows (snake_case, nulls) and the app's types
 * (camelCase, optional fields). Every row read is validated with the same Zod
 * schemas as local data, so bad data is caught at the boundary.
 */
import {
  checkInSchema,
  clientSchema,
  portalProfileSchema,
  progressLogSchema,
  type CheckIn,
  type Client,
  type PortalProfile,
  type ProgressLog,
  type ProgressLogInput,
} from '../schemas';

export interface ClientRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  lead_source: string;
  stage: string;
  stage_history: unknown;
  start_date: string | null;
  program_tier: string;
  next_check_in_date: string | null;
  goal: string;
  targets: unknown;
  created_at: string;
  updated_at: string;
  user_id?: string | null;
  /** Embedded from client_private; PostgREST returns an object (or array) for this one-to-one join. */
  client_private?: { notes: string } | Array<{ notes: string }> | null;
}

export interface ProgressLogRow {
  id: string;
  client_id: string;
  date: string;
  weight_lbs: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  steps: number | null;
  note: string | null;
}

export interface CheckInRow {
  id: string;
  client_id: string;
  date: string;
  adherence_rating: number;
  wins: string;
  struggles: string;
  questions: string;
  coach_notes: string;
  next_actions: string;
  submitted_by: string;
  status: string;
}

const opt = <T,>(value: T | null | undefined): T | undefined => (value === null ? undefined : value);

/** Postgres returns "2026-10-22 10:00:00+00"-style timestamps; the app stores ISO strings. */
const toIso = (timestamp: string) => new Date(timestamp).toISOString();

const notesOf = (embedded: ClientRow['client_private']) =>
  (Array.isArray(embedded) ? embedded[0]?.notes : embedded?.notes) ?? '';

export function rowToClient(row: ClientRow): Client {
  return clientSchema.parse({
    id: row.id,
    name: row.name,
    email: opt(row.email),
    phone: opt(row.phone),
    leadSource: row.lead_source,
    stage: row.stage,
    stageHistory: row.stage_history,
    startDate: opt(row.start_date),
    programTier: row.program_tier,
    nextCheckInDate: opt(row.next_check_in_date),
    goal: row.goal,
    targets: row.targets,
    notes: notesOf(row.client_private),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  });
}

export function rowToPortalProfile(row: Pick<ClientRow, 'id' | 'name' | 'goal' | 'program_tier' | 'targets' | 'start_date' | 'next_check_in_date'>): PortalProfile {
  return portalProfileSchema.parse({
    id: row.id,
    name: row.name,
    goal: row.goal,
    programTier: row.program_tier,
    targets: row.targets,
    startDate: opt(row.start_date),
    nextCheckInDate: opt(row.next_check_in_date),
  });
}

/** Client fields → columns. Only keys present in `fields` are included, so a patch updates just those. */
export function clientFieldsToRow(fields: Partial<Omit<Client, 'id' | 'notes'>>): Record<string, unknown> {
  const columns: Record<string, string> = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    leadSource: 'lead_source',
    stage: 'stage',
    stageHistory: 'stage_history',
    startDate: 'start_date',
    programTier: 'program_tier',
    nextCheckInDate: 'next_check_in_date',
    goal: 'goal',
    targets: 'targets',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };
  const row: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(columns)) {
    if (!Object.prototype.hasOwnProperty.call(fields, key)) continue;
    const value = fields[key as keyof typeof fields];
    // undefined means "clear this field".
    row[column] = value === undefined ? null : key === 'email' && typeof value === 'string' ? value.toLowerCase() : value;
  }
  return row;
}

export function rowToProgressLog(row: ProgressLogRow): ProgressLog {
  return progressLogSchema.parse({
    id: row.id,
    clientId: row.client_id,
    date: row.date,
    weightLbs: opt(row.weight_lbs),
    calories: opt(row.calories),
    proteinG: opt(row.protein_g),
    carbsG: opt(row.carbs_g),
    fatG: opt(row.fat_g),
    steps: opt(row.steps),
    note: opt(row.note),
  });
}

/** Only fields that were filled in, so an upsert merges with the day's existing log. */
export function progressLogToRow(input: ProgressLogInput): Record<string, unknown> {
  const row: Record<string, unknown> = { client_id: input.clientId, date: input.date };
  const columns = {
    weightLbs: 'weight_lbs',
    calories: 'calories',
    proteinG: 'protein_g',
    carbsG: 'carbs_g',
    fatG: 'fat_g',
    steps: 'steps',
    note: 'note',
  } as const;
  for (const [key, column] of Object.entries(columns)) {
    const value = input[key as keyof typeof columns];
    if (value !== undefined) row[column] = value;
  }
  return row;
}

export function rowToCheckIn(row: CheckInRow): CheckIn {
  return checkInSchema.parse({
    id: row.id,
    clientId: row.client_id,
    date: row.date,
    adherenceRating: row.adherence_rating,
    wins: row.wins,
    struggles: row.struggles,
    questions: row.questions,
    coachNotes: row.coach_notes,
    nextActions: row.next_actions,
    submittedBy: row.submitted_by,
    status: row.status,
  });
}
