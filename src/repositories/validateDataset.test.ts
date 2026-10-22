import { describe, expect, it } from 'vitest';
import { parseDatasetJson, validateDataset } from './validateDataset';
import { ImportValidationError } from './errors';
import { buildSeedDataset } from '../seed/seed';
import { FIXED_NOW } from '../test/fixtures';

describe('validateDataset', () => {
  it('accepts a valid export', () => {
    const data = buildSeedDataset(FIXED_NOW);
    expect(validateDataset(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'hello'],
    ['a newer schema version', { schemaVersion: 999, clients: [], progressLogs: [], checkIns: [] }],
    ['a bad client', { schemaVersion: 1, clients: [{ name: 'No id' }], progressLogs: [], checkIns: [] }],
  ])('rejects %s', (_label, raw) => {
    expect(() => validateDataset(raw)).toThrow(ImportValidationError);
  });

  it('reports where validation failed', () => {
    const data = buildSeedDataset(FIXED_NOW);
    const broken = { ...data, checkIns: [{ ...data.checkIns[0], adherenceRating: 9 }] };
    try {
      validateDataset(broken);
      expect.unreachable();
    } catch (error) {
      expect((error as ImportValidationError).issues[0]?.path).toEqual(['checkIns', 0, 'adherenceRating']);
    }
  });
});

describe('parseDatasetJson', () => {
  it('turns JSON syntax errors into ImportValidationError', () => {
    expect(() => parseDatasetJson('{oops')).toThrow(ImportValidationError);
  });
});
