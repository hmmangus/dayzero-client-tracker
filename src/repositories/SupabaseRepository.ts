import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import {
  checkInInputSchema,
  checkInReplySchema,
  clientCheckInInputSchema,
  clientPatchSchema,
  datasetSchema,
  newClientSchema,
  progressLogInputSchema,
  CURRENT_SCHEMA_VERSION,
  type CheckIn,
  type CheckInInput,
  type CheckInReply,
  type Client,
  type ClientCheckInInput,
  type ClientPatch,
  type Dataset,
  type NewClient,
  type PortalProfile,
  type ProgressLog,
  type ProgressLogInput,
  type Stage,
} from '../schemas';
import { toIsoDate } from '../lib/dates';
import { NotFoundError } from './errors';
import {
  clientFieldsToRow,
  progressLogToRow,
  rowToCheckIn,
  rowToClient,
  rowToPortalProfile,
  rowToProgressLog,
  type CheckInRow,
  type ClientRow,
  type ProgressLogRow,
} from './supabaseMapping';
import type { DateRange, PortalRepository, PortalStatus, Repository, Unsubscribe } from './types';

const CLIENT_COLUMNS = '*, client_private(notes)';
const PORTAL_PROFILE_COLUMNS = 'id, name, goal, program_tier, targets, start_date, next_check_in_date';
const STARTED_STAGES: ReadonlySet<Stage> = new Set(['beta', 'active']);
/** PostgREST returns at most 1000 rows per request, so long lists are fetched in pages. */
const PAGE_SIZE = 1000;

type Result<T> = { data: T | null; error: PostgrestError | null };

/** Throws on a database error; otherwise returns the (possibly empty) data. */
function checkMaybe<T>(result: Result<T>): T | null {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/** For queries that must return data (inserts and updates with .select()). */
function check<T>(result: Result<T>): T {
  const data = checkMaybe(result);
  if (data === null) throw new Error('The database returned no data.');
  return data;
}

/** For writes that return nothing. */
function checkOk(result: { error: PostgrestError | null }): void {
  if (result.error) throw new Error(result.error.message);
}

/** Calls each listener after writes, and when the tab regains focus (another device may have changed data). */
class ChangeNotifier {
  private readonly listeners = new Set<() => void>();

  subscribe(listener: () => void): Unsubscribe {
    this.listeners.add(listener);
    const onVisible = () => document.visibilityState === 'visible' && listener();
    window.addEventListener('focus', listener);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      this.listeners.delete(listener);
      window.removeEventListener('focus', listener);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }

  notify() {
    this.listeners.forEach((listener) => listener());
  }
}

async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const batch = checkMaybe(await page(from, from + PAGE_SIZE - 1)) ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}

/**
 * The coach's data in the online database. Same interface as LocalStorageRepository;
 * the database's row-level security only lets this work for an account listed as coach.
 */
export class SupabaseRepository implements Repository {
  readonly mode = 'live' as const;
  private readonly db: SupabaseClient;
  private readonly now: () => Date;
  private readonly changes = new ChangeNotifier();

  constructor(db: SupabaseClient, now: () => Date = () => new Date()) {
    this.db = db;
    this.now = now;
  }

  // ---------------------------------------------------------------- clients

  async listClients(): Promise<Client[]> {
    const rows = await fetchAll<ClientRow>((from, to) => this.db.from('clients').select(CLIENT_COLUMNS).order('name').range(from, to));
    return rows.map(rowToClient);
  }

  async getClient(id: string): Promise<Client | null> {
    const row = checkMaybe(await this.db.from('clients').select(CLIENT_COLUMNS).eq('id', id).maybeSingle<ClientRow>());
    return row ? rowToClient(row) : null;
  }

  async createClient(input: NewClient): Promise<Client> {
    const parsed = newClientSchema.parse(input);
    const timestamp = this.now().toISOString();
    const { notes, ...fields } = parsed;
    const row = clientFieldsToRow({
      ...fields,
      stageHistory: [{ stage: parsed.stage, enteredAt: timestamp }],
      startDate: parsed.startDate ?? (STARTED_STAGES.has(parsed.stage) ? toIsoDate(this.now()) : undefined),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const created = check(await this.db.from('clients').insert(row).select('id').single<{ id: string }>());
    checkOk(await this.db.from('client_private').insert({ client_id: created.id, notes }));
    this.changes.notify();
    return (await this.getClient(created.id))!;
  }

  async updateClient(id: string, patch: ClientPatch): Promise<Client> {
    const parsed = clientPatchSchema.parse(patch);
    const { notes, ...fields } = parsed;
    const hasNotes = Object.prototype.hasOwnProperty.call(parsed, 'notes');
    const updated = check(
      await this.db
        .from('clients')
        .update({ ...clientFieldsToRow(fields), updated_at: this.now().toISOString() })
        .eq('id', id)
        .select('id'),
    );
    if (updated.length === 0) throw new NotFoundError('Client', id);
    if (hasNotes) checkOk(await this.db.from('client_private').upsert({ client_id: id, notes: notes ?? '' }));
    this.changes.notify();
    return (await this.getClient(id))!;
  }

  async moveStage(id: string, stage: Stage): Promise<Client> {
    const client = await this.getClient(id);
    if (!client) throw new NotFoundError('Client', id);
    if (client.stage === stage) return client;
    const timestamp = this.now().toISOString();
    checkOk(
      await this.db
        .from('clients')
        .update(
          clientFieldsToRow({
            stage,
            stageHistory: [...client.stageHistory, { stage, enteredAt: timestamp }],
            startDate: client.startDate ?? (STARTED_STAGES.has(stage) ? toIsoDate(this.now()) : undefined),
            updatedAt: timestamp,
          }),
        )
        .eq('id', id),
    );
    this.changes.notify();
    return (await this.getClient(id))!;
  }

  async deleteClient(id: string): Promise<void> {
    const deleted = check(await this.db.from('clients').delete().eq('id', id).select('id'));
    if (deleted.length === 0) throw new NotFoundError('Client', id);
    this.changes.notify();
  }

  async getPortalStatus(clientId: string): Promise<PortalStatus> {
    const row = checkMaybe(
      await this.db.from('clients').select('email, user_id').eq('id', clientId).maybeSingle<{ email: string | null; user_id: string | null }>(),
    );
    if (!row?.email) return { kind: 'no-email' };
    return row.user_id ? { kind: 'active', email: row.email } : { kind: 'invited', email: row.email };
  }

  // ---------------------------------------------------------- progress logs

  async listProgressLogs(clientId: string, range: DateRange = {}): Promise<ProgressLog[]> {
    const rows = await fetchAll<ProgressLogRow>((from, to) => {
      let query = this.db.from('progress_logs').select('*').eq('client_id', clientId);
      if (range.from) query = query.gte('date', range.from);
      if (range.to) query = query.lte('date', range.to);
      return query.order('date').range(from, to);
    });
    return rows.map(rowToProgressLog);
  }

  async listAllProgressLogs(): Promise<ProgressLog[]> {
    const rows = await fetchAll<ProgressLogRow>((from, to) => this.db.from('progress_logs').select('*').order('date').order('id').range(from, to));
    return rows.map(rowToProgressLog);
  }

  async upsertProgressLog(input: ProgressLogInput): Promise<ProgressLog> {
    const log = await upsertLog(this.db, progressLogInputSchema.parse(input));
    this.changes.notify();
    return log;
  }

  async deleteProgressLog(id: string): Promise<void> {
    checkOk(await this.db.from('progress_logs').delete().eq('id', id));
    this.changes.notify();
  }

  // --------------------------------------------------------------- check-ins

  async listCheckIns(clientId: string): Promise<CheckIn[]> {
    const rows = check(
      await this.db.from('check_ins').select('*').eq('client_id', clientId).order('date', { ascending: false }).order('created_at', { ascending: false }),
    );
    return (rows as CheckInRow[]).map(rowToCheckIn);
  }

  async listAllCheckIns(): Promise<CheckIn[]> {
    const rows = await fetchAll<CheckInRow>((from, to) =>
      this.db.from('check_ins').select('*').order('date', { ascending: false }).order('id').range(from, to),
    );
    return rows.map(rowToCheckIn);
  }

  async createCheckIn(input: CheckInInput): Promise<CheckIn> {
    const parsed = checkInInputSchema.parse(input);
    const row = check(
      await this.db
        .from('check_ins')
        .insert({
          client_id: parsed.clientId,
          date: parsed.date,
          adherence_rating: parsed.adherenceRating,
          coach_notes: parsed.coachNotes,
          next_actions: parsed.nextActions,
          submitted_by: 'coach',
          status: 'complete',
        })
        .select('*')
        .single<CheckInRow>(),
    );
    this.changes.notify();
    return rowToCheckIn(row);
  }

  async replyToCheckIn(id: string, reply: CheckInReply): Promise<CheckIn> {
    const parsed = checkInReplySchema.parse(reply);
    const rows = check(
      await this.db
        .from('check_ins')
        .update({
          coach_notes: parsed.coachNotes,
          next_actions: parsed.nextActions,
          status: 'complete',
          ...(parsed.adherenceRating !== undefined && { adherence_rating: parsed.adherenceRating }),
        })
        .eq('id', id)
        .select('*'),
    );
    if (rows.length === 0) throw new NotFoundError('Check-in', id);
    this.changes.notify();
    return rowToCheckIn(rows[0] as CheckInRow);
  }

  async deleteCheckIn(id: string): Promise<void> {
    checkOk(await this.db.from('check_ins').delete().eq('id', id));
    this.changes.notify();
  }

  // ------------------------------------------------------------ whole dataset

  async exportAll(): Promise<Dataset> {
    const [clients, progressLogs, checkIns] = await Promise.all([this.listClients(), this.listAllProgressLogs(), this.listAllCheckIns()]);
    return datasetSchema.parse({ schemaVersion: CURRENT_SCHEMA_VERSION, clients, progressLogs, checkIns });
  }

  async importAll(): Promise<Dataset> {
    throw new Error('Importing a backup is only available in the demo, to protect your live data.');
  }

  async resetToDemoData(): Promise<Dataset> {
    throw new Error('Demo data is only available in the demo.');
  }

  subscribe(listener: () => void): Unsubscribe {
    return this.changes.subscribe(listener);
  }
}

/**
 * A signed-in client's own data. The database's security rules are what keep
 * clients to their own rows; the filters here just make the queries explicit.
 */
export class SupabasePortalRepository implements PortalRepository {
  private readonly db: SupabaseClient;
  private readonly userId: string;
  private readonly changes = new ChangeNotifier();
  private clientId: string | null = null;

  constructor(db: SupabaseClient, userId: string) {
    this.db = db;
    this.userId = userId;
  }

  async getMyProfile(): Promise<PortalProfile | null> {
    const row = checkMaybe(
      await this.db.from('clients').select(PORTAL_PROFILE_COLUMNS).eq('user_id', this.userId).maybeSingle<Parameters<typeof rowToPortalProfile>[0]>(),
    );
    if (!row) return null;
    this.clientId = row.id;
    return rowToPortalProfile(row);
  }

  private async myClientId(): Promise<string> {
    if (this.clientId) return this.clientId;
    const profile = await this.getMyProfile();
    if (!profile) throw new Error("We couldn't find your client profile.");
    return profile.id;
  }

  async listMyProgressLogs(range: DateRange = {}): Promise<ProgressLog[]> {
    const clientId = await this.myClientId();
    const rows = await fetchAll<ProgressLogRow>((from, to) => {
      let query = this.db.from('progress_logs').select('*').eq('client_id', clientId);
      if (range.from) query = query.gte('date', range.from);
      if (range.to) query = query.lte('date', range.to);
      return query.order('date').range(from, to);
    });
    return rows.map(rowToProgressLog);
  }

  async upsertMyProgressLog(input: Omit<ProgressLogInput, 'clientId'>): Promise<ProgressLog> {
    const log = await upsertLog(this.db, progressLogInputSchema.parse({ ...input, clientId: await this.myClientId() }));
    this.changes.notify();
    return log;
  }

  async listMyCheckIns(): Promise<CheckIn[]> {
    const clientId = await this.myClientId();
    const rows = check(
      await this.db.from('check_ins').select('*').eq('client_id', clientId).order('date', { ascending: false }).order('created_at', { ascending: false }),
    );
    return (rows as CheckInRow[]).map(rowToCheckIn);
  }

  async submitCheckIn(input: ClientCheckInInput): Promise<CheckIn> {
    const parsed = clientCheckInInputSchema.parse(input);
    const row = check(
      await this.db
        .from('check_ins')
        .insert({
          client_id: await this.myClientId(),
          date: parsed.date,
          adherence_rating: parsed.adherenceRating,
          wins: parsed.wins,
          struggles: parsed.struggles,
          questions: parsed.questions,
          submitted_by: 'client',
          status: 'awaiting_coach',
        })
        .select('*')
        .single<CheckInRow>(),
    );
    this.changes.notify();
    return rowToCheckIn(row);
  }

  subscribe(listener: () => void): Unsubscribe {
    return this.changes.subscribe(listener);
  }
}

/** One log per client per day; columns not sent keep their saved value. */
async function upsertLog(db: SupabaseClient, input: ProgressLogInput): Promise<ProgressLog> {
  const row = check(
    await db.from('progress_logs').upsert(progressLogToRow(input), { onConflict: 'client_id,date' }).select('*').single<ProgressLogRow>(),
  );
  return rowToProgressLog(row);
}
