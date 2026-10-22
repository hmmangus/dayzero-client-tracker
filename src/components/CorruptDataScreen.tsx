import { useState } from 'react';
import { useRepository, type StorageCorruptedError } from '../repositories';
import { downloadFile } from '../lib/download';
import { emptyDataset } from '../schemas';
import { Icon } from './Icon';
import { buttonClass, cardClass } from './ui';

export function CorruptDataScreen({ error, onRecovered }: { error: StorageCorruptedError; onRecovered: () => void }) {
  const repository = useRepository();
  const [busy, setBusy] = useState(false);

  const recover = async (mode: 'demo' | 'empty') => {
    setBusy(true);
    try {
      if (mode === 'demo') await repository.resetToDemoData();
      else await repository.importAll(emptyDataset());
      onRecovered();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div role="alert" className={`${cardClass} w-full max-w-lg p-6`}>
        <div className="flex items-center gap-3">
          <Icon name="alert" className="h-6 w-6 text-amber-600" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Your saved data couldn't be read</h1>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {error.message}. Nothing has been deleted
          {error.backupKey ? ' — a backup copy was saved in this browser' : ''}. Download the raw data first if you want to
          try to repair it, then choose how to continue.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={buttonClass('secondary')}
            onClick={() => downloadFile('dayzero-unreadable-data.json', error.raw)}
          >
            Download raw data
          </button>
          <button type="button" className={buttonClass('primary')} disabled={busy} onClick={() => recover('demo')}>
            Load demo data
          </button>
          <button type="button" className={buttonClass('ghost')} disabled={busy} onClick={() => recover('empty')}>
            Start empty
          </button>
        </div>
      </div>
    </main>
  );
}
