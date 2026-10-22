import { useDroppable } from '@dnd-kit/core';
import type { Client } from '../../schemas';
import type { StageColumn } from './stageColumns';
import { ClientCard } from './ClientCard';

interface PipelineColumnProps {
  column: StageColumn;
  index: number;
  clients: Client[];
  today: string;
  onToggleInactive: (client: Client) => void;
}

export function PipelineColumn({ column, index, clients, today, onToggleInactive }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const headingId = `column-${column.id}`;

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      data-column-index={index}
      className={`flex w-[78vw] max-w-72 shrink-0 snap-start flex-col rounded-xl border p-2 transition-colors sm:w-64 xl:w-auto xl:max-w-none xl:shrink ${
        isOver
          ? 'border-teal-500 bg-teal-50/70 dark:border-teal-500 dark:bg-teal-950/40'
          : 'border-transparent bg-slate-100 dark:bg-slate-900'
      }`}
    >
      <h2 id={headingId} className="flex items-center justify-between px-2 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {column.title}
        <span className="rounded-full bg-white px-2 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {clients.length}
        </span>
      </h2>
      <div className="flex min-h-24 flex-1 flex-col gap-2 p-1">
        {clients.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-700">
            No clients
          </p>
        ) : (
          clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              columnId={column.id}
              today={today}
              onToggleInactive={column.id === 'inactive' ? onToggleInactive : undefined}
            />
          ))
        )}
      </div>
    </section>
  );
}
