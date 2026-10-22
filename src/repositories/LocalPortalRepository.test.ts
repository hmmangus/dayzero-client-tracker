import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageRepository } from './LocalStorageRepository';
import { LocalPortalRepository } from './LocalPortalRepository';
import { MemoryStorage } from '../test/memoryStorage';
import { FIXED_NOW, newClientInput } from '../test/fixtures';
import type { Client } from '../schemas';

describe('LocalPortalRepository', () => {
  let repo: LocalStorageRepository;
  let alice: Client;
  let bob: Client;
  let portal: LocalPortalRepository;

  beforeEach(async () => {
    let id = 0;
    repo = new LocalStorageRepository({ storage: new MemoryStorage(), now: () => FIXED_NOW, generateId: () => `id-${++id}` });
    alice = await repo.createClient(newClientInput({ name: 'Alice Example', notes: 'Private coach note' }));
    bob = await repo.createClient(newClientInput({ name: 'Bob Example' }));
    await repo.upsertProgressLog({ clientId: bob.id, date: '2026-10-19', steps: 5000 });
    await repo.createCheckIn({ clientId: bob.id, date: '2026-10-13', adherenceRating: 2, coachNotes: 'Bob only', nextActions: '' });
    portal = new LocalPortalRepository(repo, alice.id);
  });

  it('shows the client their plan without sales details or private notes', async () => {
    const profile = await portal.getMyProfile();
    expect(profile).toMatchObject({ id: alice.id, name: 'Alice Example', targets: alice.targets });
    expect(profile).not.toHaveProperty('notes');
    expect(profile).not.toHaveProperty('leadSource');
    expect(profile).not.toHaveProperty('stageHistory');
  });

  it('only reads and writes the signed-in client’s own logs', async () => {
    expect(await portal.listMyProgressLogs()).toEqual([]);
    await portal.upsertMyProgressLog({ date: '2026-10-20', weightLbs: 180 });
    expect((await portal.listMyProgressLogs()).map((l) => l.clientId)).toEqual([alice.id]);
    expect((await repo.listProgressLogs(bob.id)).map((l) => l.steps)).toEqual([5000]);
  });

  it('sends check-ins that wait for the coach, and shows the reply once given', async () => {
    expect(await portal.listMyCheckIns()).toEqual([]);
    const sent = await portal.submitCheckIn({ date: '2026-10-20', adherenceRating: 4, wins: 'Good week', struggles: '', questions: '' });
    expect(sent).toMatchObject({ clientId: alice.id, status: 'awaiting_coach', submittedBy: 'client' });

    await repo.replyToCheckIn(sent.id, { coachNotes: 'Great work', nextActions: 'Keep going' });
    const [mine] = await portal.listMyCheckIns();
    expect(mine).toMatchObject({ status: 'complete', coachNotes: 'Great work', wins: 'Good week' });
    expect(await portal.listMyCheckIns()).toHaveLength(1);
  });
});
