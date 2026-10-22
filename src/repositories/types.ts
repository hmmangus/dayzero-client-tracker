import type {
  CheckIn,
  CheckInInput,
  CheckInReply,
  ClientCheckInInput,
  Client,
  ClientPatch,
  Dataset,
  IsoDate,
  NewClient,
  PortalProfile,
  ProgressLog,
  ProgressLogInput,
  Stage,
} from '../schemas';

/**
 * Storage-agnostic data access. Every method is async so a network-backed
 * implementation (e.g. Supabase) can replace LocalStorageRepository without
 * changes to UI code.
 */
export interface ClientRepository {
  listClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | null>;
  createClient(input: NewClient): Promise<Client>;
  updateClient(id: string, patch: ClientPatch): Promise<Client>;
  /** Changes stage and appends to stageHistory. A no-op if the stage is unchanged. */
  moveStage(id: string, stage: Stage): Promise<Client>;
  /** Deletes the client and all of their progress logs and check-ins. */
  deleteClient(id: string): Promise<void>;
}

export interface DateRange {
  from?: IsoDate;
  to?: IsoDate;
}

export interface ProgressRepository {
  /** Logs sorted by date ascending, optionally limited to an inclusive range. */
  listProgressLogs(clientId: string, range?: DateRange): Promise<ProgressLog[]>;
  listAllProgressLogs(): Promise<ProgressLog[]>;
  /**
   * Creates or merges the single log for `clientId` on `date`. Fields that are
   * undefined in the input keep their existing value, so weight logged in the
   * morning survives calories logged at night.
   */
  upsertProgressLog(input: ProgressLogInput): Promise<ProgressLog>;
  deleteProgressLog(id: string): Promise<void>;
}

export interface CheckInRepository {
  /** Check-ins sorted by date descending (newest first). */
  listCheckIns(clientId: string): Promise<CheckIn[]>;
  listAllCheckIns(): Promise<CheckIn[]>;
  /** Records a complete check-in on the client's behalf. */
  createCheckIn(input: CheckInInput): Promise<CheckIn>;
  /** Adds the coach's reply to a client-submitted check-in and marks it complete. */
  replyToCheckIn(id: string, reply: CheckInReply): Promise<CheckIn>;
  deleteCheckIn(id: string): Promise<void>;
}

/** Whether a client can use the portal. */
export type PortalStatus =
  | { kind: 'demo' }
  | { kind: 'no-email' }
  /** The coach added their email but they haven't signed in yet. */
  | { kind: 'invited'; email: string }
  | { kind: 'active'; email: string };

export interface DataRepository {
  exportAll(): Promise<Dataset>;
  /** Validates (and migrates) `raw`, then replaces all data. Throws ImportValidationError. */
  importAll(raw: unknown): Promise<Dataset>;
  resetToDemoData(): Promise<Dataset>;
}

export type Unsubscribe = () => void;

/** The coach's view of all data. */
export interface Repository extends ClientRepository, ProgressRepository, CheckInRepository, DataRepository {
  /** 'demo' keeps data in this browser; 'live' is the shared online database. */
  readonly mode: 'demo' | 'live';
  getPortalStatus(clientId: string): Promise<PortalStatus>;
  /** Called after any write, including writes from another browser tab. */
  subscribe(listener: () => void): Unsubscribe;
}

/**
 * A signed-in client's view: only their own profile, logs and check-ins.
 * The client id always comes from who is signed in, never from the caller,
 * so there is no way to ask for someone else's data.
 */
export interface PortalRepository {
  /** null when the signed-in email doesn't match any client yet. */
  getMyProfile(): Promise<PortalProfile | null>;
  listMyProgressLogs(range?: DateRange): Promise<ProgressLog[]>;
  /** Same merge-per-day rules as the coach's upsertProgressLog. */
  upsertMyProgressLog(input: Omit<ProgressLogInput, 'clientId'>): Promise<ProgressLog>;
  /** Newest first, including the coach's replies. */
  listMyCheckIns(): Promise<CheckIn[]>;
  submitCheckIn(input: ClientCheckInInput): Promise<CheckIn>;
  subscribe(listener: () => void): Unsubscribe;
}
