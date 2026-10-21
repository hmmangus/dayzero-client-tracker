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

/** migrations[n] upgrades data from version n to n + 1. */
export const migrations: Record<number, Migration> = {
  0: v0ToV1,
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
