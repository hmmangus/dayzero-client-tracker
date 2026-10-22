import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { emptyDataset, type Dataset } from '../../schemas';
import { ImportValidationError, parseDatasetJson, useRepository } from '../../repositories';
import { downloadFile } from '../../lib/download';
import { toIsoDate } from '../../lib/dates';
import { useDataset } from '../../hooks';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { buttonClass, cardClass } from '../../components/ui';

type Pending =
  | { kind: 'import'; data: Dataset; fileName: string }
  | { kind: 'demo' }
  | { kind: 'clear' };

const describe = (data: Dataset) =>
  `${data.clients.length} clients, ${data.progressLogs.length} progress logs and ${data.checkIns.length} check-ins`;

export function DataManagementPage() {
  const repository = useRepository();
  const notify = useToast();
  const current = useDataset();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [importError, setImportError] = useState<{ message: string; details: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    const data = await repository.exportAll();
    downloadFile(`dayzero-backup-${toIsoDate(new Date())}.json`, JSON.stringify(data, null, 2));
    notify('Backup downloaded');
  };

  const onFileChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow choosing the same file again
    if (!file) return;
    setImportError(null);
    try {
      const data = parseDatasetJson(await file.text());
      setPending({ kind: 'import', data, fileName: file.name });
    } catch (error) {
      if (error instanceof ImportValidationError) {
        setImportError({
          message: error.message,
          details: error.issues.slice(0, 5).map((issue) => `${issue.path.join('.') || 'file'}: ${issue.message}`),
        });
      } else {
        setImportError({ message: "Couldn't read that file.", details: [] });
      }
    }
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === 'import') {
        await repository.importAll(pending.data);
        notify(`Imported ${pending.fileName}`);
      } else if (pending.kind === 'demo') {
        await repository.resetToDemoData();
        notify('Demo data loaded');
      } else {
        await repository.importAll(emptyDataset());
        notify('All data cleared');
      }
      setPending(null);
    } catch {
      notify('Something went wrong', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Data"
        description="Your data is saved in this browser only. Export a backup regularly, especially before clearing site data or switching devices."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <ActionCard title="Export backup" description={current.data ? `Download ${describe(current.data)} as a JSON file.` : 'Download everything as a JSON file.'}>
          <button type="button" className={buttonClass('primary')} onClick={exportData}>
            Download backup
          </button>
        </ActionCard>

        <ActionCard title="Import backup" description="Replace all current data with a Dayzero JSON backup. The file is checked before anything changes.">
          <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" onChange={onFileChosen} aria-label="Choose backup file" />
          <button type="button" className={buttonClass('secondary')} onClick={() => fileInput.current?.click()}>
            Choose file…
          </button>
          {importError && (
            <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <p className="font-medium">{importError.message}. Nothing was changed.</p>
              {importError.details.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {importError.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </ActionCard>

        <ActionCard title="Reset to demo data" description="Replace everything with the fictional demo clients. Useful for showing the app to someone.">
          <button type="button" className={buttonClass('secondary')} onClick={() => setPending({ kind: 'demo' })}>
            Load demo data
          </button>
        </ActionCard>

        <ActionCard title="Start fresh" description="Delete all clients, logs and check-ins to start using the app with real clients.">
          <button type="button" className={buttonClass('danger')} onClick={() => setPending({ kind: 'clear' })}>
            Delete all data
          </button>
        </ActionCard>
      </div>

      <ConfirmDialog
        open={pending !== null}
        busy={busy}
        title={
          pending?.kind === 'import' ? 'Replace all data with this backup?' : pending?.kind === 'demo' ? 'Replace all data with demo data?' : 'Delete all data?'
        }
        confirmLabel={pending?.kind === 'import' ? 'Import' : pending?.kind === 'demo' ? 'Load demo data' : 'Delete everything'}
        tone={pending?.kind === 'import' ? 'primary' : 'danger'}
        onCancel={() => setPending(null)}
        onConfirm={confirm}
      >
        {pending?.kind === 'import' && <p>{pending.fileName} contains {describe(pending.data)}.</p>}
        <p className="mt-1">Your current data will be replaced. Download a backup first if you might need it.</p>
      </ConfirmDialog>
    </>
  );
}

function ActionCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className={`${cardClass} p-5`}>
      <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {children}
    </section>
  );
}
