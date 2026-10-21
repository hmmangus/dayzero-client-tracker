import { describe, expect, it } from 'vitest';
import { migrate, readSchemaVersion } from './migrations';
import { UnsupportedSchemaVersionError } from './errors';
import { CURRENT_SCHEMA_VERSION } from '../schemas';

describe('migrate', () => {
  it('leaves current-version data unchanged', () => {
    const data = { schemaVersion: CURRENT_SCHEMA_VERSION, clients: [], progressLogs: [], checkIns: [] };
    expect(migrate(data)).toEqual({ data, fromVersion: CURRENT_SCHEMA_VERSION });
  });

  it('treats a missing schemaVersion as v0 and renames legacy fields', () => {
    const { data, fromVersion } = migrate({ clients: [], logs: [{ id: 'x' }] });
    expect(fromVersion).toBe(0);
    expect(data).toEqual({ schemaVersion: 1, clients: [], progressLogs: [{ id: 'x' }], checkIns: [] });
  });

  it('keeps an existing stageHistory when upgrading v0 clients', () => {
    const history = [{ stage: 'lead', enteredAt: '2026-01-01T00:00:00.000Z' }];
    const { data } = migrate({ clients: [{ stage: 'lead', stageHistory: history, notes: 'hi' }] });
    expect(data).toMatchObject({ clients: [{ stageHistory: history, notes: 'hi' }] });
  });

  it('rejects versions newer than the app supports', () => {
    expect(() => migrate({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 })).toThrow(UnsupportedSchemaVersionError);
  });

  it('rejects malformed versions', () => {
    expect(() => readSchemaVersion({ schemaVersion: '1' })).toThrow(UnsupportedSchemaVersionError);
    expect(() => readSchemaVersion({ schemaVersion: -1 })).toThrow(UnsupportedSchemaVersionError);
  });
});
