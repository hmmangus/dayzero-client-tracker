import { Route, Routes } from 'react-router-dom';
import { LocalPortalRepository, LocalStorageRepository, PortalProvider, RepositoryProvider } from '../repositories';
import { buildSeedDataset } from '../seed/seed';
import { AreaProvider } from '../components/Area';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { CoachRoutes } from './CoachRoutes';
import { PortalRoutes } from './PortalRoutes';

/** The fictional client whose portal the demo shows. */
export const DEMO_PORTAL_CLIENT_ID = 'client-testy-mcliftface';

const repository = new LocalStorageRepository({ demoData: buildSeedDataset });
const portal = new LocalPortalRepository(repository, DEMO_PORTAL_CLIENT_ID);

/** Public demo: the whole app on fictional data kept in this browser. */
export function DemoArea() {
  return (
    <RepositoryProvider repository={repository}>
      <ErrorBoundary recoverStorage>
        <Routes>
          <Route
            path="portal/*"
            element={
              <PortalProvider portal={portal}>
                <PortalRoutes area={{ base: '/demo/portal', kind: 'demo', exitPath: `/demo/clients/${DEMO_PORTAL_CLIENT_ID}` }} />
              </PortalProvider>
            }
          />
          <Route
            path="*"
            element={
              <AreaProvider area={{ base: '/demo', kind: 'demo', portalPreviewPath: '/demo/portal' }}>
                <CoachRoutes />
              </AreaProvider>
            }
          />
        </Routes>
      </ErrorBoundary>
    </RepositoryProvider>
  );
}
