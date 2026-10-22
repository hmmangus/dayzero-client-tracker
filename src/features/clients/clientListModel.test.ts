import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, filterClients, sortClients } from './clientListModel';
import { makeClient } from '../../test/fixtures';

const clients = [
  makeClient({ id: '1', name: 'Testy McLiftface', leadSource: 'referral', programTier: 'tier_2', startDate: '2026-08-01', nextCheckInDate: '2026-10-24' }),
  makeClient({ id: '2', name: 'Sample Sally', leadSource: 'social', programTier: 'tier_1', startDate: '2026-07-01' }),
  makeClient({
    id: '3',
    name: 'Lorem Ipsum',
    leadSource: 'social',
    programTier: 'tier_1',
    stage: 'consult',
    stageHistory: [{ stage: 'consult', enteredAt: '2026-10-01T10:00:00.000Z' }],
    nextCheckInDate: '2026-10-21',
  }),
];

describe('filterClients', () => {
  it('returns everyone with default filters', () => {
    expect(filterClients(clients, DEFAULT_FILTERS)).toHaveLength(3);
  });

  it('searches names case-insensitively', () => {
    expect(filterClients(clients, { ...DEFAULT_FILTERS, search: '  sALLy ' }).map((c) => c.id)).toEqual(['2']);
  });

  it('combines stage, lead source and tier filters', () => {
    expect(filterClients(clients, { ...DEFAULT_FILTERS, leadSource: 'social', tier: 'tier_1' }).map((c) => c.id)).toEqual(['2', '3']);
    expect(filterClients(clients, { ...DEFAULT_FILTERS, leadSource: 'social', stage: 'consult' }).map((c) => c.id)).toEqual(['3']);
  });
});

describe('sortClients', () => {
  it('sorts by name both ways', () => {
    expect(sortClients(clients, 'name', 'asc').map((c) => c.id)).toEqual(['3', '2', '1']);
    expect(sortClients(clients, 'name', 'desc').map((c) => c.id)).toEqual(['1', '2', '3']);
  });

  it('keeps clients without a date last in either direction', () => {
    expect(sortClients(clients, 'startDate', 'asc').map((c) => c.id)).toEqual(['2', '1', '3']);
    expect(sortClients(clients, 'startDate', 'desc').map((c) => c.id)).toEqual(['1', '2', '3']);
    expect(sortClients(clients, 'nextCheckInDate', 'asc').map((c) => c.id)).toEqual(['3', '1', '2']);
  });

  it('does not mutate the input', () => {
    const copy = [...clients];
    sortClients(clients, 'name', 'asc');
    expect(clients).toEqual(copy);
  });
});
