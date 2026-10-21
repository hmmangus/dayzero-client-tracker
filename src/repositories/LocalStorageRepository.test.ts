import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageRepository, CORRUPT_BACKUP_PREFIX } from './LocalStorageRepository';
import { ImportValidationError, NotFoundError, StorageCorruptedError, StorageWriteError } from './errors';
import { MemoryStorage } from '../test/memoryStorage';
import { FIXED_NOW, datasetWith, makeClient, newClientInput } from '../test/fixtures';
import { CURRENT_SCHEMA_VERSION, type Dataset } from '../schemas';

const KEY = 'test:data';

describe('LocalStorageRepository', () => {
  let storage: MemoryStorage;
  let now: Date;
  let idCounter: number;

  const createRepo = (demoData?: (now: Date) => Dataset) =>
    new LocalStorageRepository({
      storage,
      key: KEY,
      now: () => now,
      generateId: () => `id-${++idCounter}`,
      demoData,
    });

  const stored = () => JSON.parse(storage.getItem(KEY)!) as Dataset;

  beforeEach(() => {
    storage = new MemoryStorage();
    now = new Date(FIXED_NOW);
    idCounter = 0;
  });

  describe('first run', () => {
    it('seeds storage with demo data when nothing is stored', async () => {
      const repo = createRepo(() => datasetWith({ clients: [makeClient()] }));
      expect(await repo.listClients()).toHaveLength(1);
      expect(stored().schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('starts empty when no demo data is provided', async () => {
      expect(await createRepo().listClients()).toEqual([]);
    });
  });

  describe('save and load', () => {
    it('persists a created client so a new repository instance can read it', async () => {
      const created = await createRepo().createClient(newClientInput());

      const reloaded = await createRepo().getClient(created.id);
      expect(reloaded).toEqual(created);
      expect(reloaded).toMatchObject({
        id: 'id-1',
        stage: 'lead',
        notes: '',
        stageHistory: [{ stage: 'lead', enteredAt: FIXED_NOW.toISOString() }],
        createdAt: FIXED_NOW.toISOString(),
      });
    });

    it('rejects invalid input without writing', async () => {
      const repo = createRepo();
      await expect(repo.createClient(newClientInput({ name: '  ' }))).rejects.toThrow();
      expect(await repo.listClients()).toEqual([]);
    });

    it('lists clients sorted by name', async () => {
      const repo = createRepo();
      await repo.createClient(newClientInput({ name: 'Zed Example' }));
      await repo.createClient(newClientInput({ name: 'Amy Example' }));
      expect((await repo.listClients()).map((c) => c.name)).toEqual(['Amy Example', 'Zed Example']);
    });

    it('updates editable fields and bumps updatedAt', async () => {
      const repo = createRepo();
      const client = await repo.createClient(newClientInput());
      now = new Date('2026-10-21T08:00:00.000Z');

      const updated = await repo.updateClient(client.id, { notes: 'Prefers mornings' });
      expect(updated.notes).toBe('Prefers mornings');
      expect(updated.updatedAt).toBe('2026-10-21T08:00:00.000Z');
      expect(updated.createdAt).toBe(client.createdAt);
    });

    it('throws NotFoundError for unknown clients', async () => {
      const repo = createRepo();
      await expect(repo.updateClient('missing', { notes: 'x' })).rejects.toBeInstanceOf(NotFoundError);
      await expect(repo.moveStage('missing', 'active')).rejects.toBeInstanceOf(NotFoundError);
      await expect(repo.deleteClient('missing')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('surfaces a StorageWriteError when storage is full', async () => {
      const repo = createRepo();
      await repo.listClients();
      storage.failWrites = true;
      await expect(repo.createClient(newClientInput())).rejects.toBeInstanceOf(StorageWriteError);
    });
  });

  describe('moveStage', () => {
    it('appends to stageHistory with the current time', async () => {
      const repo = createRepo();
      const client = await repo.createClient(newClientInput());
      now = new Date('2026-10-22T09:00:00.000Z');

      const moved = await repo.moveStage(client.id, 'consult');
      expect(moved.stage).toBe('consult');
      expect(moved.stageHistory).toEqual([
        { stage: 'lead', enteredAt: FIXED_NOW.toISOString() },
        { stage: 'consult', enteredAt: '2026-10-22T09:00:00.000Z' },
      ]);
    });

    it('does nothing when the stage is unchanged', async () => {
      const repo = createRepo();
      const client = await repo.createClient(newClientInput());
      const listener = vi.fn();
      repo.subscribe(listener);

      const result = await repo.moveStage(client.id, 'lead');
      expect(result.stageHistory).toHaveLength(1);
      expect(listener).not.toHaveBeenCalled();
    });

    it('sets startDate the first time a client starts a program', async () => {
      const repo = createRepo();
      const client = await repo.createClient(newClientInput());
      expect(client.startDate).toBeUndefined();

      const active = await repo.moveStage(client.id, 'active');
      expect(active.startDate).toBe('2026-10-20');

      now = new Date('2026-11-20T12:00:00.000Z');
      await repo.moveStage(client.id, 'paused');
      const resumed = await repo.moveStage(client.id, 'active');
      expect(resumed.startDate).toBe('2026-10-20');
    });
  });

  describe('progress logs', () => {
    it('keeps one log per client per day and merges fields', async () => {
      const repo = createRepo();
      const client = await repo.createClient(newClientInput());

      const morning = await repo.upsertProgressLog({ clientId: client.id, date: '2026-10-20', weightLbs: 190.4 });
      const evening = await repo.upsertProgressLog({ clientId: client.id, date: '2026-10-20', calories: 2050, proteinG: 160 });

      expect(evening.id).toBe(morning.id);
      expect(await repo.listProgressLogs(client.id)).toEqual([
        { id: morning.id, clientId: client.id, date: '2026-10-20', weightLbs: 190.4, calories: 2050, proteinG: 160 },
      ]);
    });

    it('lists logs by date ascending within an inclusive range', async () => {
      const repo = createRepo();
      const client = await repo.createClient(newClientInput());
      for (const date of ['2026-10-12', '2026-10-10', '2026-10-11', '2026-10-13']) {
        await repo.upsertProgressLog({ clientId: client.id, date, steps: 5000 });
      }
      const logs = await repo.listProgressLogs(client.id, { from: '2026-10-11', to: '2026-10-12' });
      expect(logs.map((l) => l.date)).toEqual(['2026-10-11', '2026-10-12']);
    });

    it('rejects logs for unknown clients', async () => {
      await expect(createRepo().upsertProgressLog({ clientId: 'nope', date: '2026-10-20' })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('check-ins', () => {
    it('creates check-ins and lists them newest first', async () => {
      const repo = createRepo();
      const client = await repo.createClient(newClientInput());
      await repo.createCheckIn({ clientId: client.id, date: '2026-10-06', adherenceRating: 3, coachNotes: '', nextActions: '' });
      await repo.createCheckIn({ clientId: client.id, date: '2026-10-13', adherenceRating: 4, coachNotes: '', nextActions: '' });
      expect((await repo.listCheckIns(client.id)).map((c) => c.date)).toEqual(['2026-10-13', '2026-10-06']);
    });

    it('validates adherence rating is 1–5', async () => {
      const repo = createRepo();
      const client = await repo.createClient(newClientInput());
      await expect(
        repo.createCheckIn({ clientId: client.id, date: '2026-10-13', adherenceRating: 6, coachNotes: '', nextActions: '' }),
      ).rejects.toThrow();
    });
  });

  it('deleting a client removes their logs and check-ins', async () => {
    const repo = createRepo();
    const keep = await repo.createClient(newClientInput({ name: 'Keep Example' }));
    const remove = await repo.createClient(newClientInput({ name: 'Remove Example' }));
    for (const client of [keep, remove]) {
      await repo.upsertProgressLog({ clientId: client.id, date: '2026-10-20', steps: 1 });
      await repo.createCheckIn({ clientId: client.id, date: '2026-10-20', adherenceRating: 3, coachNotes: '', nextActions: '' });
    }

    await repo.deleteClient(remove.id);
    const data = await repo.exportAll();
    expect(data.clients.map((c) => c.id)).toEqual([keep.id]);
    expect(data.progressLogs.every((l) => l.clientId === keep.id)).toBe(true);
    expect(data.checkIns.every((c) => c.clientId === keep.id)).toBe(true);
  });

  describe('subscribe', () => {
    it('notifies listeners after writes until unsubscribed', async () => {
      const repo = createRepo();
      const listener = vi.fn();
      const unsubscribe = repo.subscribe(listener);

      await repo.createClient(newClientInput());
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      await repo.createClient(newClientInput());
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('migration', () => {
    it('upgrades unversioned (v0) data on read and writes it back', async () => {
      const { stageHistory: _history, notes: _notes, ...legacyClient } = makeClient({ stage: 'active' });
      storage.setItem(
        KEY,
        JSON.stringify({
          clients: [legacyClient],
          logs: [{ id: 'log-1', clientId: 'client-1', date: '2026-10-19', weightLbs: 200 }],
        }),
      );

      const data = await createRepo().exportAll();
      expect(data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(data.clients[0]).toMatchObject({
        notes: '',
        stageHistory: [{ stage: 'active', enteredAt: legacyClient.createdAt }],
      });
      expect(data.progressLogs).toHaveLength(1);
      expect(data.checkIns).toEqual([]);
      expect(stored().schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('treats data from a newer app version as unreadable rather than guessing', async () => {
      storage.setItem(KEY, JSON.stringify({ ...datasetWith(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 }));
      await expect(createRepo().listClients()).rejects.toBeInstanceOf(StorageCorruptedError);
    });
  });

  describe('corrupted data', () => {
    const backups = () =>
      Array.from({ length: storage.length }, (_, i) => storage.key(i)!).filter((k) => k.startsWith(CORRUPT_BACKUP_PREFIX));

    it('throws StorageCorruptedError for invalid JSON and keeps the original value', async () => {
      storage.setItem(KEY, '{not json');
      const error = await createRepo().listClients().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(StorageCorruptedError);
      expect((error as StorageCorruptedError).raw).toBe('{not json');
      expect(storage.getItem(KEY)).toBe('{not json');
    });

    it('reports Zod issues for structurally invalid data', async () => {
      const bad = datasetWith({ clients: [makeClient({ stage: 'unknown' as never })] });
      storage.setItem(KEY, JSON.stringify(bad));

      const error = (await createRepo().listClients().catch((e: unknown) => e)) as StorageCorruptedError;
      expect(error).toBeInstanceOf(StorageCorruptedError);
      expect(error.issues.some((issue) => issue.path.join('.').startsWith('clients.0.stage'))).toBe(true);
    });

    it('rejects logs that reference a missing client', async () => {
      storage.setItem(KEY, JSON.stringify(datasetWith({ progressLogs: [{ id: 'l', clientId: 'ghost', date: '2026-10-20' }] })));
      await expect(createRepo().listClients()).rejects.toBeInstanceOf(StorageCorruptedError);
    });

    it('writes exactly one backup copy no matter how often it is read', async () => {
      storage.setItem(KEY, '[broken');
      const repo = createRepo();
      const first = (await repo.listClients().catch((e: unknown) => e)) as StorageCorruptedError;
      await repo.listClients().catch(() => undefined);

      expect(backups()).toEqual([first.backupKey]);
      expect(storage.getItem(first.backupKey!)).toBe('[broken');
    });

    it('can recover by resetting to demo data', async () => {
      storage.setItem(KEY, '[broken');
      const repo = createRepo(() => datasetWith({ clients: [makeClient()] }));
      await expect(repo.listClients()).rejects.toBeInstanceOf(StorageCorruptedError);

      await repo.resetToDemoData();
      expect(await repo.listClients()).toHaveLength(1);
      expect(backups()).toHaveLength(1);
    });
  });

  describe('import and export', () => {
    it('round-trips an export through import', async () => {
      const source = createRepo();
      const client = await source.createClient(newClientInput());
      await source.upsertProgressLog({ clientId: client.id, date: '2026-10-20', weightLbs: 190 });
      const exported = await source.exportAll();

      storage = new MemoryStorage();
      const target = createRepo();
      await target.importAll(JSON.parse(JSON.stringify(exported)));
      expect(await target.exportAll()).toEqual(exported);
    });

    it('rejects invalid imports and leaves existing data untouched', async () => {
      const repo = createRepo();
      await repo.createClient(newClientInput());
      const before = storage.getItem(KEY);

      await expect(repo.importAll({ schemaVersion: 1, clients: 'nope' })).rejects.toBeInstanceOf(ImportValidationError);
      await expect(repo.importAll('just a string')).rejects.toBeInstanceOf(ImportValidationError);
      await expect(repo.importAll({ schemaVersion: 99 })).rejects.toBeInstanceOf(ImportValidationError);
      expect(storage.getItem(KEY)).toBe(before);
    });
  });
});
