import { portalProfileSchema, type ClientCheckInInput, type PortalProfile, type ProgressLogInput } from '../schemas';
import type { LocalStorageRepository } from './LocalStorageRepository';
import type { DateRange, PortalRepository } from './types';

/**
 * The client portal for the demo: one fixed demo client's view of the shared
 * local data. Every method is pinned to that client, mirroring how the live
 * database pins a signed-in client to their own rows.
 */
export class LocalPortalRepository implements PortalRepository {
  private readonly repository: LocalStorageRepository;
  private readonly clientId: string;

  constructor(repository: LocalStorageRepository, clientId: string) {
    this.repository = repository;
    this.clientId = clientId;
  }

  async getMyProfile(): Promise<PortalProfile | null> {
    const client = await this.repository.getClient(this.clientId);
    return client ? portalProfileSchema.parse(client) : null;
  }

  listMyProgressLogs(range?: DateRange) {
    return this.repository.listProgressLogs(this.clientId, range);
  }

  upsertMyProgressLog(input: Omit<ProgressLogInput, 'clientId'>) {
    return this.repository.upsertProgressLog({ ...input, clientId: this.clientId });
  }

  listMyCheckIns() {
    return this.repository.listCheckIns(this.clientId);
  }

  submitCheckIn(input: ClientCheckInInput) {
    return this.repository.submitClientCheckIn(this.clientId, input);
  }

  subscribe(listener: () => void) {
    return this.repository.subscribe(listener);
  }
}
