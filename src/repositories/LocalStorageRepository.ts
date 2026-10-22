import {
  type CheckIn,
  type CheckInInput,
  type Client,
  type ClientPatch,
  type Dataset,
  type NewClient,
  type ProgressLog,
  type ProgressLogInput,
  type Stage,
  CURRENT_SCHEMA_VERSION,
  checkInInputSchema,
  clientPatchSchema,
  datasetSchema,
  emptyDataset,
  newClientSchema,
  progressLogInputSchema,
} from '../schemas';
import { toIsoDate } from '../lib/dates';
import { NotFoundError, StorageCorruptedError, StorageWriteError } from './errors';
import { migrate } from './migrations';
import { validateDataset } from './validateDataset';
import type { DateRange, Repository, Unsubscribe } from './types';

export const STORAGE_KEY = 'dayzero:data';
export const CORRUPT_BACKUP_PREFIX = 'dayzero:corrupt:';

/** Stages that mean the client has started a program (sets startDate the first time). */
const STARTED_STAGES: ReadonlySet<Stage> = new Set(['beta', 'active']);

export interface LocalStorageRepositoryOptions {
  storage?: Storage;
  key?: string;
  /** Injected clock so tests are deterministic. */
  now?: () => Date;
  generateId?: () => string;
  /** Dataset used on first run and by resetToDemoData. Defaults to empty. */
  demoData?: (now: Date) => Dataset;
}

export class LocalStorageRepository implements Repository {
  private readonly storage: Storage;
  private readonly key: string;
  private readonly now: () => Date;
  private readonly generateId: () => string;
  private readonly demoData: (now: Date) => Dataset;
  private readonly listeners = new Set<() => void>();

  constructor(options: LocalStorageRepositoryOptions = {}) {
    this.storage = options.storage ?? window.localStorage;
    this.key = options.key ?? STORAGE_KEY;
    this.now = options.now ?? (() => new Date());
    this.generateId = options.generateId ?? (() => crypto.randomUUID());
    this.demoData = options.demoData ?? (() => emptyDataset());
  }

  // ---------------------------------------------------------------- clients

  async listClients(): Promise<Client[]> {
    return [...this.read().clients].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getClient(id: string): Promise<Client | null> {
    return this.read().clients.find((c) => c.id === id) ?? null;
  }

  async createClient(input: NewClient): Promise<Client> {
    const parsed = newClientSchema.parse(input);
    const timestamp = this.now().toISOString();
    const client: Client = {
      ...parsed,
      id: this.generateId(),
      stageHistory: [{ stage: parsed.stage, enteredAt: timestamp }],
      startDate: parsed.startDate ?? (STARTED_STAGES.has(parsed.stage) ? toIsoDate(this.now()) : undefined),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.mutate((data) => ({ ...data, clients: [...data.clients, client] }));
    return client;
  }

  async updateClient(id: string, patch: ClientPatch): Promise<Client> {
    const parsed = clientPatchSchema.parse(patch);
    return this.mutateClient(id, (client) => ({ ...client, ...parsed }));
  }

  async moveStage(id: string, stage: Stage): Promise<Client> {
    const existing = await this.getClient(id);
    if (!existing) throw new NotFoundError('Client', id);
    if (existing.stage === stage) return existing;

    return this.mutateClient(id, (client) => ({
      ...client,
      stage,
      stageHistory: [...client.stageHistory, { stage, enteredAt: this.now().toISOString() }],
      startDate: client.startDate ?? (STARTED_STAGES.has(stage) ? toIsoDate(this.now()) : undefined),
    }));
  }

  async deleteClient(id: string): Promise<void> {
    this.mutate((data) => {
      if (!data.clients.some((c) => c.id === id)) throw new NotFoundError('Client', id);
      return {
        ...data,
        clients: data.clients.filter((c) => c.id !== id),
        progressLogs: data.progressLogs.filter((l) => l.clientId !== id),
        checkIns: data.checkIns.filter((c) => c.clientId !== id),
      };
    });
  }

  // ---------------------------------------------------------- progress logs

  async listProgressLogs(clientId: string, range: DateRange = {}): Promise<ProgressLog[]> {
    return this.read()
      .progressLogs.filter(
        (log) =>
          log.clientId === clientId &&
          (range.from === undefined || log.date >= range.from) &&
          (range.to === undefined || log.date <= range.to),
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async listAllProgressLogs(): Promise<ProgressLog[]> {
    return [...this.read().progressLogs].sort((a, b) => a.date.localeCompare(b.date));
  }

  async upsertProgressLog(input: ProgressLogInput): Promise<ProgressLog> {
    const parsed = progressLogInputSchema.parse(input);
    let saved: ProgressLog | undefined;

    this.mutate((data) => {
      if (!data.clients.some((c) => c.id === parsed.clientId)) throw new NotFoundError('Client', parsed.clientId);
      const existing = data.progressLogs.find((l) => l.clientId === parsed.clientId && l.date === parsed.date);
      saved = existing ? { ...existing, ...definedOnly(parsed) } : { ...parsed, id: this.generateId() };
      const others = data.progressLogs.filter((l) => l !== existing);
      return { ...data, progressLogs: [...others, saved] };
    });

    return saved!;
  }

  async deleteProgressLog(id: string): Promise<void> {
    this.mutate((data) => ({ ...data, progressLogs: data.progressLogs.filter((l) => l.id !== id) }));
  }

  // --------------------------------------------------------------- check-ins

  async listCheckIns(clientId: string): Promise<CheckIn[]> {
    return this.read()
      .checkIns.filter((c) => c.clientId === clientId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async listAllCheckIns(): Promise<CheckIn[]> {
    return [...this.read().checkIns].sort((a, b) => b.date.localeCompare(a.date));
  }

  async createCheckIn(input: CheckInInput): Promise<CheckIn> {
    const parsed = checkInInputSchema.parse(input);
    const checkIn: CheckIn = { ...parsed, id: this.generateId() };
    this.mutate((data) => {
      if (!data.clients.some((c) => c.id === parsed.clientId)) throw new NotFoundError('Client', parsed.clientId);
      return { ...data, checkIns: [...data.checkIns, checkIn] };
    });
    return checkIn;
  }

  async deleteCheckIn(id: string): Promise<void> {
    this.mutate((data) => ({ ...data, checkIns: data.checkIns.filter((c) => c.id !== id) }));
  }

  // ------------------------------------------------------------ whole dataset

  async exportAll(): Promise<Dataset> {
    return this.read();
  }

  async importAll(raw: unknown): Promise<Dataset> {
    const data = validateDataset(raw);
    this.write(data);
    return data;
  }

  async resetToDemoData(): Promise<Dataset> {
    const data = datasetSchema.parse(this.demoData(this.now()));
    this.write(data);
    return data;
  }

  subscribe(listener: () => void): Unsubscribe {
    this.listeners.add(listener);

    // Keep multiple open tabs in sync.
    const onStorage = (event: StorageEvent) => {
      if (event.key === this.key) listener();
    };
    const canListen = typeof window !== 'undefined' && this.storage === window.localStorage;
    if (canListen) window.addEventListener('storage', onStorage);

    return () => {
      this.listeners.delete(listener);
      if (canListen) window.removeEventListener('storage', onStorage);
    };
  }

  // ---------------------------------------------------------------- internals

  /**
   * Reads, migrates and validates stored data. Missing data is seeded with
   * demo data. Unreadable data is backed up under a separate key and surfaced
   * as StorageCorruptedError; it is never silently overwritten.
   */
  private read(): Dataset {
    const raw = this.storage.getItem(this.key);
    if (raw === null) {
      const initial = datasetSchema.parse(this.demoData(this.now()));
      this.write(initial, { notify: false });
      return initial;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      throw this.corrupted('Stored data is not valid JSON', raw, { cause });
    }

    let migrated: { data: unknown; fromVersion: number };
    try {
      migrated = migrate(parsed);
    } catch (cause) {
      throw this.corrupted('Stored data has an unsupported schema version', raw, { cause });
    }

    const result = datasetSchema.safeParse(migrated.data);
    if (!result.success) {
      throw this.corrupted('Stored data failed validation', raw, { issues: result.error.issues });
    }

    if (migrated.fromVersion !== CURRENT_SCHEMA_VERSION) {
      this.write(result.data, { notify: false });
    }
    return result.data;
  }

  private write(data: Dataset, { notify = true } = {}): void {
    const valid = datasetSchema.parse(data);
    try {
      this.storage.setItem(this.key, JSON.stringify(valid));
    } catch (error) {
      throw new StorageWriteError(error);
    }
    if (notify) this.listeners.forEach((listener) => listener());
  }

  private mutate(update: (data: Dataset) => Dataset): void {
    this.write(update(this.read()));
  }

  private mutateClient(id: string, update: (client: Client) => Client): Client {
    let updated: Client | undefined;
    this.mutate((data) => {
      const existing = data.clients.find((c) => c.id === id);
      if (!existing) throw new NotFoundError('Client', id);
      updated = { ...update(existing), updatedAt: this.now().toISOString() };
      return { ...data, clients: data.clients.map((c) => (c === existing ? updated! : c)) };
    });
    return updated!;
  }

  private corrupted(
    message: string,
    raw: string,
    details: { cause?: unknown; issues?: StorageCorruptedError['issues'] },
  ): StorageCorruptedError {
    let backupKey = this.findBackupOf(raw);
    if (backupKey === null) {
      backupKey = `${CORRUPT_BACKUP_PREFIX}${this.now().toISOString()}`;
      try {
        this.storage.setItem(backupKey, raw);
      } catch {
        backupKey = null;
      }
    }
    return new StorageCorruptedError(message, { raw, backupKey, ...details });
  }

  /** Avoids writing a new backup copy on every read of the same corrupted value. */
  private findBackupOf(raw: string): string | null {
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(CORRUPT_BACKUP_PREFIX) && this.storage.getItem(key) === raw) return key;
    }
    return null;
  }
}

/** Drops keys whose value is undefined so spreading doesn't erase existing fields. */
const definedOnly = <T extends object>(value: T): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
