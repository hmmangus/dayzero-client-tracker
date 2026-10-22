import type { Client, LeadSource, ProgramTier, Stage } from '../../schemas';

export type SortKey = 'name' | 'startDate' | 'nextCheckInDate';
export type SortDirection = 'asc' | 'desc';

export interface ClientListFilters {
  search: string;
  stage: Stage | 'all';
  leadSource: LeadSource | 'all';
  tier: ProgramTier | 'all';
}

export const DEFAULT_FILTERS: ClientListFilters = { search: '', stage: 'all', leadSource: 'all', tier: 'all' };

export function filterClients(clients: Client[], filters: ClientListFilters): Client[] {
  const query = filters.search.trim().toLowerCase();
  return clients.filter(
    (c) =>
      (query === '' || c.name.toLowerCase().includes(query)) &&
      (filters.stage === 'all' || c.stage === filters.stage) &&
      (filters.leadSource === 'all' || c.leadSource === filters.leadSource) &&
      (filters.tier === 'all' || c.programTier === filters.tier),
  );
}

/** Sorts by the chosen column. Clients with no date always sort last. */
export function sortClients(clients: Client[], key: SortKey, direction: SortDirection): Client[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...clients].sort((a, b) => {
    if (key === 'name') return sign * a.name.localeCompare(b.name);
    const av = a[key];
    const bv = b[key];
    if (av === bv) return a.name.localeCompare(b.name);
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    return sign * av.localeCompare(bv);
  });
}
