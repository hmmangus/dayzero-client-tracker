import { lazy, Suspense, type ReactNode } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { EmptyState, LoadingState } from './components/States';
import { buttonClass } from './components/ui';

// Each page is its own chunk, so the charting library only loads on pages that use it.
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const PipelinePage = lazy(() => import('./features/pipeline/PipelinePage').then((m) => ({ default: m.PipelinePage })));
const ClientListPage = lazy(() => import('./features/clients/ClientListPage').then((m) => ({ default: m.ClientListPage })));
const NewClientPage = lazy(() => import('./features/clients/NewClientPage').then((m) => ({ default: m.NewClientPage })));
const ClientDetailPage = lazy(() => import('./features/clients/ClientDetailPage').then((m) => ({ default: m.ClientDetailPage })));
const DataManagementPage = lazy(() => import('./features/settings/DataManagementPage').then((m) => ({ default: m.DataManagementPage })));

const page = (element: ReactNode) => <Suspense fallback={<LoadingState />}>{element}</Suspense>;

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={page(<DashboardPage />)} />
        <Route path="pipeline" element={page(<PipelinePage />)} />
        <Route path="clients" element={page(<ClientListPage />)} />
        <Route path="clients/new" element={page(<NewClientPage />)} />
        <Route path="clients/:clientId" element={page(<ClientDetailPage />)} />
        <Route path="data" element={page(<DataManagementPage />)} />
        <Route
          path="*"
          element={
            <EmptyState
              title="Page not found"
              action={
                <Link to="/" className={buttonClass('secondary')}>
                  Go to dashboard
                </Link>
              }
            />
          }
        />
      </Route>
    </Routes>
  );
}
