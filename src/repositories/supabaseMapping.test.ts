import { describe, expect, it } from 'vitest';
import { clientFieldsToRow, progressLogToRow, rowToCheckIn, rowToClient, rowToPortalProfile, rowToProgressLog, type ClientRow } from './supabaseMapping';

const clientRow: ClientRow = {
  id: 'c1',
  name: 'Testy McLiftface',
  email: 'testy@example.com',
  phone: null,
  lead_source: 'referral',
  stage: 'active',
  stage_history: [
    { stage: 'lead', enteredAt: '2026-08-01T10:00:00.000Z' },
    { stage: 'active', enteredAt: '2026-08-10T10:00:00.000Z' },
  ],
  start_date: '2026-08-10',
  program_tier: 'tier_2',
  next_check_in_date: null,
  goal: 'fat_loss',
  targets: { calories: 2100, proteinG: 180, carbsG: 190, fatG: 70, dailySteps: 10000, goalWeightLbs: 185 },
  created_at: '2026-08-01 10:00:00.123456+00',
  updated_at: '2026-10-20T12:00:00+00:00',
  user_id: 'u1',
  client_private: { notes: 'Prefers texts' },
};

describe('rowToClient', () => {
  it('maps columns, turns nulls into missing fields and normalises timestamps', () => {
    const client = rowToClient(clientRow);
    expect(client).toMatchObject({ leadSource: 'referral', programTier: 'tier_2', notes: 'Prefers texts', startDate: '2026-08-10' });
    expect(client).not.toHaveProperty('phone', null);
    expect(client.phone).toBeUndefined();
    expect(client.nextCheckInDate).toBeUndefined();
    expect(client.createdAt).toBe('2026-08-01T10:00:00.123Z');
    expect(client.updatedAt).toBe('2026-10-20T12:00:00.000Z');
  });

  it('reads private notes whether PostgREST embeds an object or an array', () => {
    expect(rowToClient({ ...clientRow, client_private: [{ notes: 'From array' }] }).notes).toBe('From array');
    expect(rowToClient({ ...clientRow, client_private: null }).notes).toBe('');
  });

  it('rejects rows that break the schema instead of passing bad data to the UI', () => {
    expect(() => rowToClient({ ...clientRow, stage: 'mystery' })).toThrow();
    expect(() => rowToClient({ ...clientRow, targets: { calories: 'lots' } })).toThrow();
  });
});

describe('rowToPortalProfile', () => {
  it('keeps only what a client may see', () => {
    const profile = rowToPortalProfile(clientRow);
    expect(profile).toMatchObject({ id: 'c1', name: 'Testy McLiftface', programTier: 'tier_2', startDate: '2026-08-10' });
    for (const hidden of ['email', 'phone', 'leadSource', 'stage', 'stageHistory', 'notes', 'createdAt']) {
      expect(profile).not.toHaveProperty(hidden);
    }
  });
});

describe('clientFieldsToRow', () => {
  it('includes only the fields given, lower-cases email and turns undefined into null to clear a field', () => {
    expect(clientFieldsToRow({ email: 'Testy@Example.com', nextCheckInDate: undefined, programTier: 'tier_3' })).toEqual({
      email: 'testy@example.com',
      next_check_in_date: null,
      program_tier: 'tier_3',
    });
  });
});

describe('progress logs', () => {
  it('sends only filled-in fields so the day merges with what was saved', () => {
    expect(progressLogToRow({ clientId: 'c1', date: '2026-10-20', weightLbs: 190.4 })).toEqual({ client_id: 'c1', date: '2026-10-20', weight_lbs: 190.4 });
  });

  it('maps rows back with nulls as missing values', () => {
    const log = rowToProgressLog({
      id: 'l1',
      client_id: 'c1',
      date: '2026-10-20',
      weight_lbs: 190.4,
      calories: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      steps: 8000,
      note: null,
    });
    expect(log).toEqual({ id: 'l1', clientId: 'c1', date: '2026-10-20', weightLbs: 190.4, steps: 8000 });
  });
});

describe('rowToCheckIn', () => {
  it('maps and validates a check-in', () => {
    const row = {
      id: 'k1',
      client_id: 'c1',
      date: '2026-10-20',
      adherence_rating: 4,
      wins: 'Steps',
      struggles: '',
      questions: '',
      coach_notes: '',
      next_actions: '',
      submitted_by: 'client',
      status: 'awaiting_coach',
    };
    expect(rowToCheckIn(row)).toMatchObject({ clientId: 'c1', adherenceRating: 4, submittedBy: 'client', status: 'awaiting_coach' });
    expect(() => rowToCheckIn({ ...row, adherence_rating: 9 })).toThrow();
  });
});
