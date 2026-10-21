import { describe, expect, it } from 'vitest';
import { buildSeedDataset } from './seed';
import { datasetSchema, STAGES, LEAD_SOURCES } from '../schemas';
import { FIXED_NOW } from '../test/fixtures';
import { daysBetween, toIsoDate } from '../lib/dates';

describe('buildSeedDataset', () => {
  const data = buildSeedDataset(FIXED_NOW);
  const today = toIsoDate(FIXED_NOW);

  it('passes schema validation', () => {
    expect(datasetSchema.safeParse(data).success).toBe(true);
  });

  it('is deterministic for a given date', () => {
    expect(buildSeedDataset(FIXED_NOW)).toEqual(data);
  });

  it('has 8 clients covering every stage and lead source', () => {
    expect(data.clients).toHaveLength(8);
    expect(new Set(data.clients.map((c) => c.stage))).toEqual(new Set(STAGES));
    expect(new Set(data.clients.map((c) => c.leadSource))).toEqual(new Set(LEAD_SOURCES));
  });

  it('gives every active and beta client 8–12 weeks of logs with some missed days', () => {
    for (const client of data.clients.filter((c) => c.stage === 'active' || c.stage === 'beta')) {
      const dates = data.progressLogs.filter((l) => l.clientId === client.id).map((l) => l.date);
      const span = daysBetween(dates[0]!, dates[dates.length - 1]!) + 1;
      expect(span, client.name).toBeGreaterThanOrEqual(8 * 7);
      expect(span, client.name).toBeLessThanOrEqual(12 * 7);
      expect(dates.length, client.name).toBeLessThan(span);
    }
  });

  it('gives active clients weekly check-ins', () => {
    for (const client of data.clients.filter((c) => c.stage === 'active')) {
      expect(data.checkIns.filter((c) => c.clientId === client.id).length, client.name).toBeGreaterThanOrEqual(7);
    }
  });

  it('only contains clearly fictional contact details', () => {
    for (const client of data.clients) {
      if (client.email) expect(client.email).toMatch(/@example\.com$/);
      if (client.phone) expect(client.phone).toMatch(/^555-01\d\d$/);
    }
  });

  it('never logs in the future', () => {
    expect(data.progressLogs.every((l) => l.date <= today)).toBe(true);
    expect(data.checkIns.every((c) => c.date <= today)).toBe(true);
  });
});
