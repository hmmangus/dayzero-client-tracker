import { useState } from 'react';
import type { ProgressLog } from '../../schemas';
import { useRepository } from '../../repositories';
import { formatDay, formatInt, formatLbs } from '../../lib/format';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { cardClass } from '../../components/ui';

/** Table view of the logs behind the charts; also where a mistaken entry can be deleted. */
export function LogHistoryTable({ logs }: { logs: ProgressLog[] }) {
  const repository = useRepository();
  const notify = useToast();
  const [toDelete, setToDelete] = useState<ProgressLog | null>(null);
  const newestFirst = [...logs].reverse();

  return (
    <details className={`${cardClass} group`}>
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
        Log history ({logs.length} {logs.length === 1 ? 'day' : 'days'})
      </summary>
      {logs.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-slate-500 dark:text-slate-400">Nothing logged in this period.</p>
      ) : (
        <div className="max-h-96 overflow-auto border-t border-slate-200 dark:border-slate-800">
          <table className="w-full text-right text-sm tabular-nums">
            <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">Date</th>
                <th scope="col" className="px-3 py-2 font-medium">Weight</th>
                <th scope="col" className="px-3 py-2 font-medium">Calories</th>
                <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">P / C / F (g)</th>
                <th scope="col" className="px-3 py-2 font-medium">Steps</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {newestFirst.map((log) => (
                <tr key={log.id} className="text-slate-700 dark:text-slate-300">
                  <td className="px-3 py-2 text-left">
                    {formatDay(log.date)}
                    {log.note && <div className="max-w-40 truncate text-xs text-slate-400" title={log.note}>{log.note}</div>}
                  </td>
                  <td className="px-3 py-2">{formatLbs(log.weightLbs)}</td>
                  <td className="px-3 py-2">{formatInt(log.calories)}</td>
                  <td className="hidden px-3 py-2 sm:table-cell">
                    {formatInt(log.proteinG)} / {formatInt(log.carbsG)} / {formatInt(log.fatG)}
                  </td>
                  <td className="px-3 py-2">{formatInt(log.steps)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs text-slate-400 hover:text-red-600"
                      onClick={() => setToDelete(log)}
                      aria-label={`Delete log for ${formatDay(log.date)}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title={toDelete ? `Delete the log for ${formatDay(toDelete.date)}?` : ''}
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await repository.deleteProgressLog(toDelete.id);
          setToDelete(null);
          notify('Log deleted');
        }}
      />
    </details>
  );
}
