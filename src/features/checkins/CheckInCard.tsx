import type { ReactNode } from 'react';
import type { CheckIn } from '../../schemas';
import { formatDayLong } from '../../lib/format';
import { Badge } from '../../components/Badge';
import { cardClass } from '../../components/ui';

/**
 * One weekly check-in: the client's answers (when they sent it from the portal)
 * and the coach's reply. Shared by the coach's client page and the client portal.
 */
export function CheckInCard({
  checkIn,
  viewer,
  actions,
  children,
}: {
  checkIn: CheckIn;
  viewer: 'coach' | 'client';
  /** Small controls in the header, e.g. Delete. */
  actions?: ReactNode;
  /** Shown below, e.g. the coach's reply form. */
  children?: ReactNode;
}) {
  const awaiting = checkIn.status === 'awaiting_coach';
  const answers: Array<[string, string]> = [
    ['Wins', checkIn.wins],
    ['Struggles', checkIn.struggles],
    ['Questions', checkIn.questions],
  ].filter((entry): entry is [string, string] => entry[1] !== '');
  const reply: Array<[string, string]> = [
    [viewer === 'client' ? 'Coach' : 'Coach notes', checkIn.coachNotes],
    ['Next', checkIn.nextActions],
  ].filter((entry): entry is [string, string] => entry[1] !== '');

  return (
    <article className={`${cardClass} p-4 ${awaiting ? 'ring-1 ring-amber-400/60' : ''}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">{formatDayLong(checkIn.date)}</h3>
          {awaiting && <Badge tone="amber">{viewer === 'coach' ? 'Needs your reply' : 'Waiting for coach'}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <AdherenceDots rating={checkIn.adherenceRating} />
          {actions}
        </div>
      </header>

      {answers.length > 0 && (
        <dl className="mt-3 space-y-1.5 text-sm">
          {answers.map(([label, text]) => (
            <div key={label}>
              <dt className="inline font-medium text-slate-700 dark:text-slate-200">{label}: </dt>
              <dd className="inline text-slate-600 dark:text-slate-300">{text}</dd>
            </div>
          ))}
        </dl>
      )}

      {reply.length > 0 && (
        <dl className={`mt-3 space-y-1.5 text-sm ${answers.length > 0 ? 'border-t border-slate-100 pt-3 dark:border-slate-800' : ''}`}>
          {reply.map(([label, text]) => (
            <div key={label}>
              <dt className="inline font-medium text-teal-800 dark:text-teal-300">{label}: </dt>
              <dd className="inline text-slate-600 dark:text-slate-300">{text}</dd>
            </div>
          ))}
        </dl>
      )}

      {children}
    </article>
  );
}

export function AdherenceDots({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`Adherence ${rating} out of 5`} title={`Adherence ${rating}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden="true" className={`h-2 w-2 rounded-full ${i <= rating ? 'bg-teal-600 dark:bg-teal-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
      ))}
      <span aria-hidden="true" className="ml-1 text-xs font-medium text-slate-600 dark:text-slate-300">
        {rating}/5
      </span>
    </span>
  );
}
