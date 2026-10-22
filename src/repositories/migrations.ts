import { CURRENT_SCHEMA_VERSION } from '../schemas';
import { UnsupportedSchemaVersionError } from './errors';

type UnknownRecord = Record<string, unknown>;
type Migration = (data: UnknownRecord) => UnknownRecord;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Version 0 is the unversioned prototype format: progress logs lived under `logs`
 * and clients had no stageHistory. Kept as a worked example of how to add a migration.
 */
const v0ToV1: Migration = (data) => {
  const clients = Array.isArray(data.clients) ? data.clients : [];
  return {
    schemaVersion: 1,
    clients: clients.map((client) => {
      if (!isRecord(client)) return client;
      const stageHistory = Array.isArray(client.stageHistory)
        ? client.stageHistory
        : [{ stage: client.stage, enteredAt: client.createdAt }];
      return { notes: '', ...client, stageHistory };
    }),
    progressLogs: data.progressLogs ?? data.logs ?? [],
    checkIns: data.checkIns ?? [],
  };
};

/**
 * Version 2 lets clients start check-ins from the portal. Every existing
 * check-in was recorded by the coach, so it becomes a complete coach check-in.
 */
const v1ToV2: Migration = (data) => ({
  ...data,
  schemaVersion: 2,
  checkIns: (Array.isArray(data.checkIns) ? data.checkIns : []).map((checkIn) =>
    isRecord(checkIn)
      ? {
          wins: '',
          struggles: '',
          questions: '',
          submittedBy: 'coach',
          status: 'complete',
          ...checkIn,
        }
      : checkIn,
  ),
});

/** migrations[n] upgrades data from version n to n + 1. */
export const migrations: Record<number, Migration> = {
  0: v0ToV1,
  1: v1ToV2,
};

export const readSchemaVersion = (data: UnknownRecord): number => {
  const version = data.schemaVersion ?? 0;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    throw new UnsupportedSchemaVersionError(version);
  }
  return version;
};

/**
 * Upgrades parsed JSON to the current schema version. Does not validate the
 * result; callers run the Zod schema afterwards.
 */
export const migrate = (raw: unknown): { data: unknown; fromVersion: number } => {
  if (!isRecord(raw)) return { data: raw, fromVersion: CURRENT_SCHEMA_VERSION };

  const fromVersion = readSchemaVersion(raw);
  if (fromVersion > CURRENT_SCHEMA_VERSION) throw new UnsupportedSchemaVersionError(fromVersion);

  let data = raw;
  for (let version = fromVersion; version < CURRENT_SCHEMA_VERSION; version++) {
    const step = migrations[version];
    if (!step) throw new UnsupportedSchemaVersionError(version);
    data = step(data);
  }
  return { data, fromVersion };
};
