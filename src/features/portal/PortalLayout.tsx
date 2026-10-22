import { createContext, useContext } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import type { PortalProfile } from '../../schemas';
import { useMyProfile } from '../../hooks';
import { Icon, type IconName } from '../../components/Icon';
import { ThemeToggle } from '../../components/ThemeToggle';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { buttonClass } from '../../components/ui';

export interface PortalArea {
  /** Path prefix, e.g. "/me" or "/demo/portal". */
  base: string;
  kind: 'demo' | 'live';
  /** Demo: back to the coach view. */
  exitPath?: string;
  userEmail?: string;
  signOut?: () => void;
}

const ProfileContext = createContext<{ profile: PortalProfile; area: PortalArea } | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function usePortalContext() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('usePortalContext must be used inside <PortalLayout>');
  return value;
}

const TABS: Array<{ path: string; label: string; icon: IconName; end?: boolean }> = [
  { path: '', label: 'Today', icon: 'calendar', end: true },
  { path: '/check-in', label: 'Check-in', icon: 'check' },
  { path: '/progress', label: 'Progress', icon: 'dashboard' },
];

/** Frame for the client portal: loads the signed-in client's profile once for every page. */
export function PortalLayout({ area }: { area: PortalArea }) {
  const profile = useMyProfile();
  const firstName = profile.data?.name.split(' ')[0];

  const tabClass = (isActive: boolean) =>
    isActive ? 'text-teal-700 dark:text-teal-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {area.kind === 'demo' && (
        <div className="bg-violet-700 px-4 py-2 text-center text-xs text-white">
          Demo: this is what a client sees.{' '}
          {area.exitPath && (
            <Link to={area.exitPath} className="font-semibold underline">
              Back to the coach view
            </Link>
          )}
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-700 text-xs font-bold text-white">D0</span>
            <span className="font-semibold">{firstName ? `Hi, ${firstName}` : 'Dayzero'}</span>
          </div>
          <nav aria-label="Portal" className="hidden gap-1 sm:flex">
            {TABS.map((tab) => (
              <NavLink key={tab.path} to={area.base + tab.path} end={tab.end} className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm font-medium ${tabClass(isActive)}`}>
                {tab.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {area.signOut && (
              <button type="button" onClick={area.signOut} className={buttonClass('ghost', 'px-2 py-1 text-xs')}>
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-5 sm:pb-10">
        {profile.status === 'loading' && <LoadingState label="Loading your plan…" />}
        {profile.status === 'error' && <ErrorState error={profile.error} onRetry={profile.refresh} />}
        {profile.status === 'success' &&
          (profile.data ? (
            <ProfileContext.Provider value={{ profile: profile.data, area }}>
              <Outlet />
            </ProfileContext.Provider>
          ) : (
            <EmptyState
              as="h1"
              title="We couldn't find your client profile"
              description={`You're signed in${area.userEmail ? ` as ${area.userEmail}` : ''}, but your coach hasn't added this email yet. Ask them to add it, then sign in again.`}
              action={
                area.signOut && (
                  <button type="button" className={buttonClass('secondary')} onClick={area.signOut}>
                    Sign out
                  </button>
                )
              }
            />
          ))}
      </main>

      <nav
        aria-label="Portal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden dark:border-slate-800 dark:bg-slate-900"
      >
        {TABS.map((tab) => (
          <NavLink key={tab.path} to={area.base + tab.path} end={tab.end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${tabClass(isActive)}`}>
            <Icon name={tab.icon} />
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
