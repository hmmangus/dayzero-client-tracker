import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useClients, useToday } from '../../hooks';
import { LEAD_SOURCES, PROGRAM_TIERS, STAGES, type Client } from '../../schemas';
import { LEAD_SOURCE_LABELS, STAGE_LABELS, TIER_LABELS } from '../../lib/labels';
import { formatDay } from '../../lib/format';
import { isOverdue } from '../../lib/metrics';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { StageBadge } from '../../components/Badge';
import { Icon } from '../../components/Icon';
import { buttonClass, cardClass, inputClass } from '../../components/ui';
import {
  DEFAULT_FILTERS,
  filterClients,
  sortClients,
  type ClientListFilters,
  type SortDirection,
  type SortKey,
} from './clientListModel';

export function ClientListPage() {
  const clients = useClients();
  const [filters, setFilters] = useState<ClientListFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'asc' });

  const visible = useMemo(
    () => (clients.data ? sortClients(filterClients(clients.data, filters), sort.key, sort.direction) : []),
    [clients.data, filters, sort],
  );

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, direction: s.key === key && s.direction === 'asc' ? 'desc' : 'asc' }));

  const update = <K extends keyof ClientListFilters>(key: K, value: ClientListFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const isFiltered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <>
      <PageHeader
        title="Clients"
        description={clients.data ? `${clients.data.length} total` : undefined}
        actions={
          <Link to="/clients/new" className={buttonClass('primary')}>
            <Icon name="plus" className="h-4 w-4" />
            New client
          </Link>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Search by name</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search by name"
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            className={`${inputClass} pl-9`}
          />
        </label>
        <FilterSelect label="Stage" value={filters.stage} onChange={(v) => update('stage', v)} options={STAGES} labels={STAGE_LABELS} />
        <FilterSelect
          label="Lead source"
          value={filters.leadSource}
          onChange={(v) => update('leadSource', v)}
          options={LEAD_SOURCES}
          labels={LEAD_SOURCE_LABELS}
        />
        <FilterSelect label="Tier" value={filters.tier} onChange={(v) => update('tier', v)} options={PROGRAM_TIERS} labels={TIER_LABELS} />
      </div>

      {clients.status === 'loading' && <LoadingState label="Loading clients…" />}
      {clients.status === 'error' && <ErrorState error={clients.error} onRetry={clients.refresh} />}
      {clients.status === 'success' &&
        (clients.data.length === 0 ? (
          <EmptyState
            title="No clients yet"
            description="Add your first client to get started."
            action={
              <Link to="/clients/new" className={buttonClass('primary')}>
                New client
              </Link>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No clients match"
            description="Try a different search or clear the filters."
            action={
              isFiltered && (
                <button type="button" className={buttonClass('secondary')} onClick={() => setFilters(DEFAULT_FILTERS)}>
                  Clear filters
                </button>
              )
            }
          />
        ) : (
          <ClientTable clients={visible} sort={sort} onSort={toggleSort} />
        ))}
    </>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: T | 'all';
  onChange: (value: T | 'all') => void;
  options: readonly T[];
  labels: Record<T, string>;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T | 'all')} className={inputClass} aria-label={label}>
        <option value="all">All {label.toLowerCase()}s</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}

function ClientTable({
  clients,
  sort,
  onSort,
}: {
  clients: Client[];
  sort: { key: SortKey; direction: SortDirection };
  onSort: (key: SortKey) => void;
}) {
  const navigate = useNavigate();
  const today = useToday();

  const header = (key: SortKey, label: string, className = '') => {
    const active = sort.key === key;
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`px-4 py-3 text-left font-medium ${className}`}
      >
        <button type="button" onClick={() => onSort(key)} className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white">
          {label}
          <span aria-hidden="true" className={active ? '' : 'opacity-30'}>
            {active && sort.direction === 'desc' ? '↓' : '↑'}
          </span>
        </button>
      </th>
    );
  };

  return (
    <div className={`${cardClass} overflow-hidden`}>
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <tr>
            {header('name', 'Name')}
            <th scope="col" className="px-4 py-3 text-left font-medium">Stage</th>
            <th scope="col" className="hidden px-4 py-3 text-left font-medium md:table-cell">Source</th>
            <th scope="col" className="hidden px-4 py-3 text-left font-medium lg:table-cell">Tier</th>
            {header('startDate', 'Start date', 'hidden md:table-cell')}
            {header('nextCheckInDate', 'Next check-in', 'hidden sm:table-cell')}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {clients.map((client) => {
            const overdue = client.nextCheckInDate !== undefined && isOverdue(client.nextCheckInDate, today);
            return (
              <tr
                key={client.id}
                onClick={() => navigate(`/clients/${client.id}`)}
                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="px-4 py-3">
                  {/* The link makes rows reachable by keyboard; the row click is a mouse/touch convenience. */}
                  <Link to={`/clients/${client.id}`} className="font-medium text-slate-900 hover:underline dark:text-white" onClick={(e) => e.stopPropagation()}>
                    {client.name}
                  </Link>
                  {client.email && <div className="text-xs text-slate-500 dark:text-slate-400">{client.email}</div>}
                </td>
                <td className="px-4 py-3">
                  <StageBadge stage={client.stage} />
                </td>
                <td className="hidden px-4 py-3 text-slate-600 md:table-cell dark:text-slate-300">{LEAD_SOURCE_LABELS[client.leadSource]}</td>
                <td className="hidden px-4 py-3 text-slate-600 lg:table-cell dark:text-slate-300">{TIER_LABELS[client.programTier]}</td>
                <td className="hidden px-4 py-3 text-slate-600 md:table-cell dark:text-slate-300">
                  {client.startDate ? formatDay(client.startDate) : '—'}
                </td>
                <td className={`hidden px-4 py-3 sm:table-cell ${overdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  {client.nextCheckInDate ? `${formatDay(client.nextCheckInDate)}${overdue ? ' (overdue)' : ''}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
