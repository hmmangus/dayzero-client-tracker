import { Link, NavLink, Outlet } from 'react-router-dom';
import { useArea } from './Area';
import { Icon, type IconName } from './Icon';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS: Array<{ path: string; label: string; icon: IconName; end?: boolean }> = [
  { path: '', label: 'Dashboard', icon: 'dashboard', end: true },
  { path: '/pipeline', label: 'Pipeline', icon: 'board' },
  { path: '/clients', label: 'Clients', icon: 'users' },
  { path: '/data', label: 'Data', icon: 'database' },
];

export function Layout() {
  const area = useArea();
  const to = (path: string) => area.base + path || '/';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-200 bg-white px-3 py-5 md:flex dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8 flex items-center gap-2 px-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">D0</span>
          <span className="font-semibold">Dayzero</span>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={to(item.path)}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {area.kind === 'coach' && area.userEmail && (
          <div className="mb-2 border-t border-slate-200 px-3 pt-3 text-xs dark:border-slate-800">
            <p className="truncate text-slate-500 dark:text-slate-400" title={area.userEmail}>
              {area.userEmail}
            </p>
            <button type="button" onClick={area.signOut} className="mt-1 font-medium text-slate-700 hover:underline dark:text-slate-200">
              Sign out
            </button>
          </div>
        )}
        <ThemeToggle showLabel />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-700 text-xs font-bold text-white">D0</span>
          <span className="font-semibold">Dayzero</span>
        </div>
        <div className="flex items-center gap-1">
          {area.kind === 'coach' && area.signOut && (
            <button type="button" onClick={area.signOut} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              Sign out
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {area.kind === 'demo' && <DemoBanner portalPreviewPath={area.portalPreviewPath} />}

      <main id="main" className="px-4 pb-28 pt-5 md:ml-60 md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-slate-800 dark:bg-slate-900"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={to(item.path)}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                isActive ? 'text-teal-700 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function DemoBanner({ portalPreviewPath }: { portalPreviewPath?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-violet-700 px-4 py-2 text-center text-xs text-white md:ml-60">
      <span>Demo mode: fictional clients, saved only in this browser.</span>
      {portalPreviewPath && (
        <Link to={portalPreviewPath} className="font-semibold underline">
          See the client portal
        </Link>
      )}
      <Link to="/" className="font-semibold underline">
        Home
      </Link>
    </div>
  );
}
