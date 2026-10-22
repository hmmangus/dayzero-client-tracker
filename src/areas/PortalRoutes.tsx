import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PortalLayout, type PortalArea } from '../features/portal/PortalLayout';
import { page } from './page';

const PortalTodayPage = lazy(() => import('../features/portal/PortalTodayPage').then((m) => ({ default: m.PortalTodayPage })));
const PortalCheckInPage = lazy(() => import('../features/portal/PortalCheckInPage').then((m) => ({ default: m.PortalCheckInPage })));
const PortalProgressPage = lazy(() => import('../features/portal/PortalProgressPage').then((m) => ({ default: m.PortalProgressPage })));

/** The client portal screens. Mounted under /demo/portal and /me. */
export function PortalRoutes({ area }: { area: PortalArea }) {
  return (
    <Routes>
      <Route element={<PortalLayout area={area} />}>
        <Route index element={page(<PortalTodayPage />)} />
        <Route path="check-in" element={page(<PortalCheckInPage />)} />
        <Route path="progress" element={page(<PortalProgressPage />)} />
        <Route path="*" element={<Navigate to={area.base} replace />} />
      </Route>
    </Routes>
  );
}
