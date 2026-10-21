import { CURRENT_SCHEMA_VERSION, type Client, type Dataset, type NewClient } from '../schemas';

export const FIXED_NOW = new Date('2026-10-20T12:00:00.000Z');

export const newClientInput = (overrides: Partial<NewClient> = {}): NewClient => ({
  name: 'Testy McLiftface',
  email: 'testy@example.com',
  leadSource: 'referral',
  programTier: 'tier_1',
  goal: 'fat_loss',
  targets: { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65, dailySteps: 10000, goalWeightLbs: 180 },
  ...overrides,
});

export const makeClient = (overrides: Partial<Client> = {}): Client => ({
  id: 'client-1',
  name: 'Testy McLiftface',
  leadSource: 'referral',
  stage: 'lead',
  stageHistory: [{ stage: 'lead', enteredAt: '2026-10-01T10:00:00.000Z' }],
  programTier: 'tier_1',
  goal: 'fat_loss',
  targets: { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65, dailySteps: 10000, goalWeightLbs: 180 },
  notes: '',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  ...overrides,
});

export const datasetWith = (partial: Partial<Dataset> = {}): Dataset => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  clients: [],
  progressLogs: [],
  checkIns: [],
  ...partial,
});
