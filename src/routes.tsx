import { lazy } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { EmptyState } from './components/States';
import { buttonClass } from './components/ui';
import { isLiveConfigured } from './lib/config';
import { page } from './areas/page';
import { NotConfigured } from './areas/NotConfigured';

const LandingPage = lazy(() => import('./features/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const DemoArea = lazy(() => import('./areas/DemoArea').then((m) => ({ default: m.DemoArea })));
const LiveAreas = lazy(() => import('./areas/LiveAreas').then((m) => ({ default: m.LiveAreas })));

const live = (area: 'coach' | 'me' | 'auth') => (isLiveConfigured ? page(<LiveAreas area={area} />) : <NotConfigured />);

export function AppRoutes() {
  return (
    <Routes>
      <Route index element={page(<LandingPage />)} />
      <Route path="demo/*" element={page(<DemoArea />)} />
      <Route path="coach/*" element={live('coach')} />
      <Route path="me/*" element={live('me')} />
      <Route path="auth/*" element={live('auth')} />
      {/* Links from before the demo moved to /demo keep working. */}
      <Route path="pipeline" element={<LegacyRedirect />} />
      <Route path="clients/*" element={<LegacyRedirect />} />
      <Route path="data" element={<LegacyRedirect />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function LegacyRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate to={`/demo${pathname}${search}`} replace />;
}

function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16 dark:bg-slate-950">
      <EmptyState
        as="h1"
        title="Page not found"
        action={
          <Link to="/" className={buttonClass('secondary')}>
            Go to the home page
          </Link>
        }
      />
    </div>
  );
}
