import type {
  CheckIn,
  CheckInInput,
  Client,
  ClientPatch,
  Dataset,
  IsoDate,
  NewClient,
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
  createCheckIn(input: CheckInInput): Promise<CheckIn>;
  deleteCheckIn(id: string): Promise<void>;
}

export interface DataRepository {
  exportAll(): Promise<Dataset>;
  /** Validates (and migrates) `raw`, then replaces all data. Throws ImportValidationError. */
  importAll(raw: unknown): Promise<Dataset>;
  resetToDemoData(): Promise<Dataset>;
}

export type Unsubscribe = () => void;

export interface Repository extends ClientRepository, ProgressRepository, CheckInRepository, DataRepository {
  /** Called after any write, including writes from another browser tab. */
  subscribe(listener: () => void): Unsubscribe;
}
