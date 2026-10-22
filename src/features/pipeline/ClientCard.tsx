import { useDraggable } from '@dnd-kit/core';
import { Link } from 'react-router-dom';
import type { Client } from '../../schemas';
import { Badge, StageBadge } from '../../components/Badge';
import { Icon } from '../../components/Icon';
import { LEAD_SOURCE_LABELS, TIER_LABELS } from '../../lib/labels';
import { formatDay } from '../../lib/format';
import { isOverdue } from '../../lib/metrics';

interface ClientCardProps {
  client: Client;
  columnId: string;
  today: string;
  /** Only shown in the shared Paused / Churned column. */
  onToggleInactive?: (client: Client) => void;
}

export function ClientCard({ client, columnId, today, onToggleInactive }: ClientCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: client.id,
    data: { columnId, client },
  });

  return (
    <div
      ref={setNodeRef}
      data-testid={`card-${client.id}`}
      className={`flex rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <button
        type="button"
        className="flex w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-teal-600 active:cursor-grabbing dark:hover:bg-slate-700"
        aria-label={`Move ${client.name}`}
        {...attributes}
        {...listeners}
      >
        <Icon name="grip" className="h-4 w-4" />
      </button>
      <ClientCardBody client={client} today={today} onToggleInactive={onToggleInactive} />
    </div>
  );
}

/** Card contents, shared with the drag overlay. */
export function ClientCardBody({ client, today, onToggleInactive }: Omit<ClientCardProps, 'columnId'>) {
  const overdue = client.nextCheckInDate !== undefined && isOverdue(client.nextCheckInDate, today);
  const inactive = client.stage === 'paused' || client.stage === 'churned';

  return (
    <div className="min-w-0 flex-1 p-3">
      {/* Names wrap (up to two lines) rather than truncate, so narrow columns stay readable. */}
      <Link
        to={`/clients/${client.id}`}
        className="line-clamp-2 break-words font-medium leading-snug text-slate-900 hover:text-teal-700 hover:underline dark:text-white dark:hover:text-teal-400"
      >
        {client.name}
      </Link>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {inactive &&
          (onToggleInactive ? (
            <button
              type="button"
              onClick={() => onToggleInactive(client)}
              className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-teal-600"
              aria-label={`${client.name} is ${client.stage}. Mark as ${client.stage === 'paused' ? 'churned' : 'paused'}`}
              title={`Switch to ${client.stage === 'paused' ? 'churned' : 'paused'}`}
            >
              <StageBadge stage={client.stage} />
            </button>
          ) : (
            <StageBadge stage={client.stage} />
          ))}
        <Badge>{LEAD_SOURCE_LABELS[client.leadSource]}</Badge>
        <Badge tone="teal">{TIER_LABELS[client.programTier]}</Badge>
      </div>
      {client.nextCheckInDate && (
        <p className={`mt-2 flex items-center gap-1 text-xs ${overdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
          <Icon name="calendar" className="h-3.5 w-3.5" />
          {overdue ? 'Overdue: ' : 'Check-in '}
          {formatDay(client.nextCheckInDate)}
        </p>
      )}
    </div>
  );
}
