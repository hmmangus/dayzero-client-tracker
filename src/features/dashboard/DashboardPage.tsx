import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LEAD_SOURCES, STAGES } from '../../schemas';
import { useDataset, useToday } from '../../hooks';
import {
  averageAdherence,
  checkInsAwaitingReply,
  checkInsDueThisWeek,
  clientsNeedingFollowUp,
  conversionByLeadSource,
  countByLeadSource,
  countByStage,
  isCoachingStage,
  leadToActiveConversion,
  weekStart,
} from '../../lib/metrics';
import { LEAD_SOURCE_LABELS, STAGE_LABELS } from '../../lib/labels';
import { formatDay, formatPercent } from '../../lib/format';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { Badge } from '../../components/Badge';
import { STAGE_TONES } from '../../components/badgeTones';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { buttonClass, cardClass } from '../../components/ui';
import { useAreaPath } from '../../components/Area';
import { axisProps } from '../clients/charts/chartTheme';
import { ChartTooltip } from '../clients/charts/ChartTooltip';

export function DashboardPage() {
  const dataset = useDataset();
  const today = useToday();
  const path = useAreaPath();

  const metrics = useMemo(() => {
    if (!dataset.data) return null;
    const { clients, progressLogs, checkIns } = dataset.data;
    return {
      coaching: clients.filter((c) => isCoachingStage(c.stage)).length,
      conversion: leadToActiveConversion(clients),
      conversionBySource: conversionByLeadSource(clients),
      bySource: countByLeadSource(clients),
      byStage: countByStage(clients),
      due: checkInsDueThisWeek(clients, today),
      awaitingReply: checkInsAwaitingReply(clients, checkIns, today),
      followUps: clientsNeedingFollowUp(clients, progressLogs, today),
      adherence: averageAdherence(clients, checkIns, today),
      total: clients.length,
    };
  }, [dataset.data, today]);

  if (dataset.status === 'loading') return <LoadingState label="Loading dashboard…" />;
  if (dataset.status === 'error') return <ErrorState error={dataset.error} onRetry={dataset.refresh} />;
  if (!metrics) return null;

  if (metrics.total === 0) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <EmptyState
          title="No data yet"
          description="Add a client, or load the demo data from the Data page to explore the dashboard."
          action={
            <div className="flex gap-2">
              <Link to={path('/clients/new')} className={buttonClass('primary')}>New client</Link>
              <Link to={path('/data')} className={buttonClass('secondary')}>Data</Link>
            </div>
          }
        />
      </>
    );
  }

  const overdueCount = metrics.due.filter((d) => d.overdue).length;
  const sourceData = LEAD_SOURCES.map((source) => ({ name: LEAD_SOURCE_LABELS[source], value: metrics.bySource[source] }));

  return (
    <>
      <PageHeader title="Dashboard" description={`Week of ${formatDay(weekStart(today))}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Coaching now" value={metrics.coaching} hint="Active and beta clients" />
        <StatCard
          label="Lead → Active conversion"
          value={formatPercent(metrics.conversion.rate)}
          hint={`${metrics.conversion.converted} of ${metrics.conversion.leads} leads`}
        />
        <StatCard
          label="Avg adherence"
          value={metrics.adherence.average === null ? '—' : `${metrics.adherence.average.toFixed(1)} / 5`}
          hint={`Active clients, last 4 weeks (${metrics.adherence.clientCount})`}
        />
        <StatCard
          label="Check-ins due this week"
          value={metrics.due.length}
          hint={overdueCount > 0 ? `${overdueCount} overdue` : 'None overdue'}
          tone={overdueCount > 0 ? 'alert' : undefined}
        />
      </div>

      <section aria-labelledby="pipeline-counts" className="mt-6">
        <h2 id="pipeline-counts" className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Pipeline by stage
        </h2>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {STAGES.map((stage) => (
            <li key={stage} className={`${cardClass} flex flex-col items-start gap-1 p-3`}>
              <Badge tone={STAGE_TONES[stage]}>{STAGE_LABELS[stage]}</Badge>
              <span className="text-xl font-semibold text-slate-900 dark:text-white">{metrics.byStage[stage]}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {metrics.awaitingReply.length > 0 && (
          <ListCard title="Check-ins awaiting your reply" subtitle="Sent by clients from the portal" empty="">
            {metrics.awaitingReply.map(({ client, checkIn, daysWaiting }) => (
              <ListRow key={checkIn.id} to={path(`/clients/${client.id}`)} name={client.name}>
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  {daysWaiting === 0 ? 'Sent today' : `Waiting ${daysWaiting} day${daysWaiting === 1 ? '' : 's'}`}
                </span>
              </ListRow>
            ))}
          </ListCard>
        )}
        <ListCard title="Check-ins due this week" empty="Nothing due this week.">
          {metrics.due.map(({ client, date, overdue }) => (
            <ListRow key={client.id} to={path(`/clients/${client.id}`)} name={client.name}>
              <span className={overdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}>
                {overdue ? `Overdue · ${formatDay(date)}` : formatDay(date)}
              </span>
            </ListRow>
          ))}
        </ListCard>

        <ListCard title="Needs follow-up" subtitle="No progress log in the last 3 days" empty="Everyone has logged recently.">
          {metrics.followUps.map(({ client, lastLogDate, daysSinceLog }) => (
            <ListRow key={client.id} to={path(`/clients/${client.id}`)} name={client.name}>
              <span className="text-amber-700 dark:text-amber-400">
                {lastLogDate ? `Last log ${daysSinceLog} days ago` : 'Never logged'}
              </span>
            </ListRow>
          ))}
        </ListCard>

        <section className={`${cardClass} p-4`} aria-labelledby="by-source-heading">
          <h2 id="by-source-heading" className="text-sm font-semibold text-slate-900 dark:text-white">
            Clients by lead source
          </h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">All stages</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} axisLine={false} width={72} />
                <Tooltip
                  cursor={{ fill: 'var(--chart-band)' }}
                  content={({ active, payload }) => (
                    <ChartTooltip active={active} payload={payload} label={payload?.[0]?.payload?.name} format={(v) => `${v} clients`} />
                  )}
                />
                <Bar dataKey="value" name="Clients" fill="var(--series-1)" maxBarSize={24} radius={[0, 4, 4, 0]} isAnimationActive={false}
                  label={{ position: 'right', fill: 'var(--chart-ink-muted)', fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={`${cardClass} p-4`} aria-labelledby="conversion-heading">
          <h2 id="conversion-heading" className="text-sm font-semibold text-slate-900 dark:text-white">
            Lead → Active conversion by source
          </h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Share of leads who ever reached Active</p>
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 dark:text-slate-400">
              <tr>
                <th scope="col" className="py-1.5 text-left font-medium">Source</th>
                <th scope="col" className="py-1.5 text-right font-medium">Leads</th>
                <th scope="col" className="py-1.5 text-right font-medium">Active</th>
                <th scope="col" className="w-2/5 py-1.5 pl-4 text-left font-medium">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums dark:divide-slate-800">
              {LEAD_SOURCES.map((source) => {
                const stats = metrics.conversionBySource[source];
                return (
                  <tr key={source}>
                    <td className="py-2 text-slate-700 dark:text-slate-300">{LEAD_SOURCE_LABELS[source]}</td>
                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">{stats.leads}</td>
                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">{stats.converted}</td>
                    <td className="py-2 pl-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-2 rounded-full" style={{ width: `${(stats.rate ?? 0) * 100}%`, background: 'var(--series-1)' }} />
                        </div>
                        <span className="w-10 text-right text-xs font-medium text-slate-700 dark:text-slate-300">{formatPercent(stats.rate)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

function ListCard({ title, subtitle, empty, children }: { title: string; subtitle?: string; empty: string; children: ReactNode[] }) {
  return (
    <section className={`${cardClass} p-4`} aria-label={title}>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      {children.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{children}</ul>
      )}
    </section>
  );
}

function ListRow({ to, name, children }: { to: string; name: string; children: ReactNode }) {
  return (
    <li>
      <Link to={to} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
        <span className="font-medium text-slate-900 dark:text-white">{name}</span>
        <span className="text-xs">{children}</span>
      </Link>
    </li>
  );
}
