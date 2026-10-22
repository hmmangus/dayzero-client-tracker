import type { DateRange } from '../repositories';
import { usePortalQuery, useRepositoryQuery } from './useRepositoryQuery';

export const useClients = () => useRepositoryQuery((repo) => repo.listClients(), []);

export const useClient = (id: string) => useRepositoryQuery((repo) => repo.getClient(id), [id]);

export const useProgressLogs = (clientId: string, range?: DateRange) =>
  useRepositoryQuery((repo) => repo.listProgressLogs(clientId, range), [clientId, range?.from, range?.to]);

export const useCheckIns = (clientId: string) => useRepositoryQuery((repo) => repo.listCheckIns(clientId), [clientId]);

/** Everything at once, for cross-client views like the dashboard. */
export const useDataset = () => useRepositoryQuery((repo) => repo.exportAll(), []);

export const usePortalStatus = (clientId: string) => useRepositoryQuery((repo) => repo.getPortalStatus(clientId), [clientId]);

// --- Client portal ---

export const useMyProfile = () => usePortalQuery((portal) => portal.getMyProfile(), []);
export const useMyProgressLogs = () => usePortalQuery((portal) => portal.listMyProgressLogs(), []);
export const useMyCheckIns = () => usePortalQuery((portal) => portal.listMyCheckIns(), []);
