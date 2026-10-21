import { useEffect, useState } from 'react';
import { StorageCorruptedError, useRepository } from './repositories';

type Status =
  | { kind: 'loading' }
  | { kind: 'ready'; clients: number; logs: number; checkIns: number }
  | { kind: 'error'; message: string };

/** Phase 1 shell: proves the data layer loads. Replaced by the routed layout in Phase 2. */
export function App() {
  const repository = useRepository();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  useEffect(() => {
    repository
      .exportAll()
      .then((data) =>
        setStatus({ kind: 'ready', clients: data.clients.length, logs: data.progressLogs.length, checkIns: data.checkIns.length }),
      )
      .catch((error: unknown) =>
        setStatus({ kind: 'error', message: error instanceof StorageCorruptedError ? error.message : 'Failed to load data' }),
      );
  }, [repository]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <h1 className="text-2xl font-semibold">Dayzero Client Tracker</h1>
      {status.kind === 'loading' && <p className="mt-2 text-slate-500">Loading…</p>}
      {status.kind === 'error' && <p className="mt-2 text-red-600">{status.message}</p>}
      {status.kind === 'ready' && (
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {status.clients} clients · {status.logs} progress logs · {status.checkIns} check-ins
        </p>
      )}
    </main>
  );
}
