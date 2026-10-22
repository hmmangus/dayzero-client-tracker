import { lazy } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { EmptyState } from '../components/States';
import { buttonClass } from '../components/ui';
import { useAreaPath } from '../components/Area';
import { page } from './page';

const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const PipelinePage = lazy(() => import('../features/pipeline/PipelinePage').then((m) => ({ default: m.PipelinePage })));
const ClientListPage = lazy(() => import('../features/clients/ClientListPage').then((m) => ({ default: m.ClientListPage })));
const NewClientPage = lazy(() => import('../features/clients/NewClientPage').then((m) => ({ default: m.NewClientPage })));
const ClientDetailPage = lazy(() => import('../features/clients/ClientDetailPage').then((m) => ({ default: m.ClientDetailPage })));
const DataManagementPage = lazy(() => import('../features/settings/DataManagementPage').then((m) => ({ default: m.DataManagementPage })));

/** The coach screens. Mounted under /demo and /coach with a different repository each. */
export function CoachRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={page(<DashboardPage />)} />
        <Route path="pipeline" element={page(<PipelinePage />)} />
        <Route path="clients" element={page(<ClientListPage />)} />
        <Route path="clients/new" element={page(<NewClientPage />)} />
        <Route path="clients/:clientId" element={page(<ClientDetailPage />)} />
        <Route path="data" element={page(<DataManagementPage />)} />
        <Route path="*" element={<AreaNotFound />} />
      </Route>
    </Routes>
  );
}

function AreaNotFound() {
  const path = useAreaPath();
  return (
    <EmptyState
      title="Page not found"
      action={
        <Link to={path('')} className={buttonClass('secondary')}>
          Go to dashboard
        </Link>
      }
    />
  );
}
