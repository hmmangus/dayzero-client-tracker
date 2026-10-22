import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { STAGES, type Client, type ProgressLog, type CheckIn } from '../../schemas';
import { useRepository } from '../../repositories';
import { useCheckIns, useClient, useProgressLogs, useToday } from '../../hooks';
import { DATE_RANGES, DATE_RANGE_LABELS, isOverdue, summarizeProgress, type DateRangeOption } from '../../lib/metrics';
import { GOAL_LABELS, LEAD_SOURCE_LABELS, STAGE_LABELS, TIER_LABELS } from '../../lib/labels';
import { formatDay, formatInt } from '../../lib/format';
import { Badge, StageBadge } from '../../components/Badge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Icon } from '../../components/Icon';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useToast } from '../../components/Toast';
import { buttonClass, cardClass, inputClass } from '../../components/ui';
import { ClientForm } from './ClientForm';
import { LogDayForm } from './LogDayForm';
import { SummaryStats } from './SummaryStats';
import { CheckInSection } from './CheckInSection';
import { LogHistoryTable } from './LogHistoryTable';
import { buildProgressSeries } from './progressSeries';
import { WeightChart } from './charts/WeightChart';
import { TargetBarChart } from './charts/TargetBarChart';
import { MacroChart } from './charts/MacroChart';
import { PortalAccessCard } from './PortalAccessCard';
import { useAreaPath } from '../../components/Area';

export function ClientDetailPage() {
  const { clientId = '' } = useParams();
  const client = useClient(clientId);
  const logs = useProgressLogs(clientId);
  const checkIns = useCheckIns(clientId);
  const path = useAreaPath();

  const failed = [client, logs, checkIns].find((q) => q.status === 'error');
  if (failed?.error) return <ErrorState error={failed.error} onRetry={failed.refresh} />;
  if (client.status !== 'success' || logs.status !== 'success' || checkIns.status !== 'success') {
    return <LoadingState label="Loading client…" />;
  }
  if (!client.data) {
    return (
      <EmptyState
        as="h1"
        title="Client not found"
        description="They may have been deleted."
        action={
          <Link to={path('/clients')} className={buttonClass('secondary')}>
            Back to clients
          </Link>
        }
      />
    );
  }
  return <ClientDetail client={client.data} logs={logs.data} checkIns={checkIns.data} />;
}

function ClientDetail({ client, logs, checkIns }: { client: Client; logs: ProgressLog[]; checkIns: CheckIn[] }) {
  const repository = useRepository();
  const navigate = useNavigate();
  const path = useAreaPath();
  const notify = useToast();
  const today = useToday();
  const [range, setRange] = useState<DateRangeOption>('4w');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const series = useMemo(() => buildProgressSeries(logs, range, today), [logs, range, today]);
  const summary = useMemo(() => summarizeProgress(series.inRange, client.targets), [series.inRange, client.targets]);
  const overdue = client.nextCheckInDate !== undefined && isOverdue(client.nextCheckInDate, today);

  return (
    <div className="space-y-6">
      <div>
        <Link to={path('/clients')} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          <Icon name="chevronLeft" className="h-4 w-4" />
          Clients
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {client.name}
              <StageBadge stage={client.stage} />
            </h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge>{LEAD_SOURCE_LABELS[client.leadSource]}</Badge>
              <Badge tone="teal">{TIER_LABELS[client.programTier]}</Badge>
              <Badge tone="blue">{GOAL_LABELS[client.goal]}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {client.startDate ? `Started ${formatDay(client.startDate)}` : 'Not started yet'}
              {client.nextCheckInDate && (
                <>
                  {' · '}
                  <span className={overdue ? 'font-semibold text-red-600 dark:text-red-400' : ''}>
                    {overdue ? 'Check-in overdue since' : 'Next check-in'} {formatDay(client.nextCheckInDate)}
                  </span>
                </>
              )}
            </p>
          </div>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Stage</span>
            <select
              value={client.stage}
              className={inputClass}
              onChange={async (e) => {
                const stage = e.target.value as Client['stage'];
                await repository.moveStage(client.id, stage);
                notify(`Moved to ${STAGE_LABELS[stage]}`);
              }}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <LogDayForm logs={logs} today={today} onSave={(input) => repository.upsertProgressLog({ ...input, clientId: client.id })} />

      <section aria-labelledby="progress-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="progress-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
            Progress
          </h2>
          <div role="group" aria-label="Date range" className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
            {DATE_RANGES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={range === option}
                onClick={() => setRange(option)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  range === option
                    ? 'bg-teal-700 text-white dark:bg-teal-600'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {DATE_RANGE_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        <SummaryStats summary={summary} targets={client.targets} />

        <div className="grid gap-4 lg:grid-cols-2">
          <WeightChart data={series.weight} goalWeight={client.targets.goalWeightLbs} />
          <TargetBarChart
            title="Daily calories"
            subtitle={`Target ${formatInt(client.targets.calories)} kcal`}
            seriesName="Calories"
            data={series.calories}
            target={client.targets.calories}
            tolerance={0.1}
            format={(v) => `${formatInt(v)} kcal`}
          />
          <MacroChart data={series.macros} targets={client.targets} />
          <TargetBarChart
            title="Daily steps"
            subtitle={`Target ${formatInt(client.targets.dailySteps)}`}
            seriesName="Steps"
            data={series.steps}
            target={client.targets.dailySteps}
            format={(v) => `${formatInt(v)} steps`}
          />
        </div>

        <LogHistoryTable logs={series.inRange} />
      </section>

      <PortalAccessCard client={client} />

      <section aria-label="Check-ins" className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Check-ins</h2>
        <CheckInSection clientId={client.id} checkIns={checkIns} today={today} />
      </section>

      <section aria-labelledby="profile-heading" className={`${cardClass} p-4`}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 id="profile-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
            Profile & targets
          </h2>
          {!editing && (
            <button type="button" className={buttonClass('secondary')} onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
        </div>
        {editing ? (
          <ClientForm
            client={client}
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            onSubmit={async ({ stage: _stage, ...patch }) => {
              try {
                await repository.updateClient(client.id, patch);
                setEditing(false);
                notify('Profile saved');
              } catch {
                notify("Couldn't save changes", 'error');
              }
            }}
          />
        ) : (
          <ProfileSummary client={client} />
        )}
      </section>

      <div className="flex justify-end">
        <button type="button" className={buttonClass('ghost', 'text-red-600 dark:text-red-400')} onClick={() => setConfirmDelete(true)}>
          Delete client
        </button>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${client.name}?`}
        confirmLabel="Delete client"
        tone="danger"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await repository.deleteClient(client.id);
          notify(`${client.name} deleted`);
          navigate(path('/clients'));
        }}
      >
        This also deletes all of their progress logs and check-ins. It can't be undone unless you have an export.
      </ConfirmDialog>
    </div>
  );
}

function ProfileSummary({ client }: { client: Client }) {
  const rows: Array<[string, string]> = [
    ['Email', client.email ?? '—'],
    ['Phone', client.phone ?? '—'],
    ['Calories', `${formatInt(client.targets.calories)} kcal`],
    ['Protein / Carbs / Fat', `${client.targets.proteinG} / ${client.targets.carbsG} / ${client.targets.fatG} g`],
    ['Daily steps', formatInt(client.targets.dailySteps)],
    ['Goal weight', `${client.targets.goalWeightLbs} lb`],
  ];
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
            <dd className="font-medium text-slate-900 dark:text-white">{value}</dd>
          </div>
        ))}
      </dl>
      {client.notes && (
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Notes</p>
          <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{client.notes}</p>
        </div>
      )}
    </div>
  );
}
