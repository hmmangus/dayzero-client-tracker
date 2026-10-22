import { Link } from 'react-router-dom';
import { isLiveConfigured } from '../../lib/config';
import { Icon, type IconName } from '../../components/Icon';
import { ThemeToggle } from '../../components/ThemeToggle';
import { cardClass } from '../../components/ui';

interface Entry {
  to: string;
  icon: IconName;
  title: string;
  description: string;
  disabled?: boolean;
}

export function LandingPage() {
  const demo: Entry[] = [
    { to: '/demo', icon: 'dashboard', title: 'Try the coach view', description: 'Pipeline, client progress charts and metrics, with fictional clients.' },
    { to: '/demo/portal', icon: 'users', title: 'Try the client portal', description: 'What a client sees: daily logging, weekly check-ins and their progress.' },
  ];
  const live: Entry[] = [
    { to: '/auth/sign-in?as=client', icon: 'check', title: 'Client sign in', description: 'Log your day and send your weekly check-in.', disabled: !isLiveConfigured },
    { to: '/auth/sign-in?as=coach', icon: 'board', title: 'Coach sign in', description: 'For the Dayzero coach.', disabled: !isLiveConfigured },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">D0</span>
            <span className="text-lg font-semibold">Dayzero Client Tracker</span>
          </div>
          <ThemeToggle />
        </div>

        <h1 className="mt-10 text-3xl font-semibold tracking-tight sm:text-4xl">Coaching pipeline and client progress, in one place.</h1>
        <p className="mt-3 max-w-xl text-slate-600 dark:text-slate-400">
          Built for Dayzerotraining to track leads through to paying clients, see each client's trend instead of daily noise,
          and let clients log their own progress and weekly check-ins.
        </p>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Explore the demo</h2>
        <EntryGrid entries={demo} />

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sign in</h2>
        <EntryGrid entries={live} />
        {!isLiveConfigured && <p className="mt-2 text-xs text-slate-500">Sign-in isn't switched on for this copy of the app.</p>}

        <p className="mt-12 text-xs text-slate-500 dark:text-slate-400">
          All demo data is fictional and stays in your browser.{' '}
          <a href="https://github.com/hmmangus/dayzero-client-tracker" className="underline hover:text-slate-900 dark:hover:text-white">
            Source code on GitHub
          </a>
        </p>
      </div>
    </div>
  );
}

function EntryGrid({ entries }: { entries: Entry[] }) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {entries.map((entry) =>
        entry.disabled ? (
          <div key={entry.to} aria-disabled="true" className={`${cardClass} flex gap-3 p-4 opacity-50`}>
            <EntryBody entry={entry} />
          </div>
        ) : (
          <Link key={entry.to} to={entry.to} className={`${cardClass} flex gap-3 p-4 transition hover:border-teal-500 hover:shadow-md dark:hover:border-teal-500`}>
            <EntryBody entry={entry} />
          </Link>
        ),
      )}
    </div>
  );
}

function EntryBody({ entry }: { entry: Entry }) {
  return (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
        <Icon name={entry.icon} />
      </span>
      <span>
        <span className="block font-semibold text-slate-900 dark:text-white">{entry.title}</span>
        <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{entry.description}</span>
      </span>
    </>
  );
}
