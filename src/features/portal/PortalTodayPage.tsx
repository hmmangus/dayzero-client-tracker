import { Link } from 'react-router-dom';
import { usePortal } from '../../repositories';
import { useMyCheckIns, useMyProgressLogs, useToday } from '../../hooks';
import { formatDay, formatInt } from '../../lib/format';
import { isOverdue } from '../../lib/metrics';
import { ErrorState, LoadingState } from '../../components/States';
import { useToast } from '../../components/Toast';
import { buttonClass, cardClass } from '../../components/ui';
import { LogDayForm } from '../clients/LogDayForm';
import { usePortalContext } from './PortalLayout';

export function PortalTodayPage() {
  const { profile, area } = usePortalContext();
  const portal = usePortal();
  const notify = useToast();
  const logs = useMyProgressLogs();
  const checkIns = useMyCheckIns();
  const today = useToday();
  const { targets } = profile;

  const checkInDue = profile.nextCheckInDate !== undefined && profile.nextCheckInDate <= today;
  const alreadySent = checkIns.data?.some((c) => c.status === 'awaiting_coach');

  return (
    <div className="space-y-5">
      <h1 className="sr-only">Today</h1>
      {checkInDue && !alreadySent && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            Your weekly check-in is {isOverdue(profile.nextCheckInDate!, today) ? `overdue (was due ${formatDay(profile.nextCheckInDate!)})` : 'due today'}.
          </p>
          <Link to={`${area.base}/check-in`} className={buttonClass('primary')}>
            Start check-in
          </Link>
        </div>
      )}

      {logs.status === 'loading' && <LoadingState />}
      {logs.status === 'error' && <ErrorState error={logs.error} onRetry={logs.refresh} />}
      {logs.status === 'success' && (
        <LogDayForm
          logs={logs.data}
          today={today}
          onSave={async (input) => {
            await portal.upsertMyProgressLog(input);
            notify('Saved, nice work!');
          }}
        />
      )}

      <section className={`${cardClass} p-4`} aria-labelledby="targets-heading">
        <h2 id="targets-heading" className="font-semibold text-slate-900 dark:text-white">
          Your daily targets
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {[
            ['Calories', `${formatInt(targets.calories)} kcal`],
            ['Protein', `${targets.proteinG} g`],
            ['Carbs', `${targets.carbsG} g`],
            ['Fat', `${targets.fatG} g`],
            ['Steps', formatInt(targets.dailySteps)],
            ['Goal weight', `${targets.goalWeightLbs} lb`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>
        {profile.nextCheckInDate && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Next check-in: {formatDay(profile.nextCheckInDate)}</p>
        )}
      </section>
    </div>
  );
}
