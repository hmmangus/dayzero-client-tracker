import { useMemo } from 'react';
import { Route, Routes } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';
import { PortalProvider, RepositoryProvider } from '../repositories';
import { SupabasePortalRepository, SupabaseRepository } from '../repositories/SupabaseRepository';
import { SupabaseAuthProvider } from '../auth/SupabaseAuthProvider';
import { RequireRole } from '../auth/RequireRole';
import { useAuth } from '../auth/AuthContext';
import { SignInPage } from '../auth/SignInPage';
import { AuthCallbackPage } from '../auth/AuthCallbackPage';
import { AreaProvider } from '../components/Area';
import { CoachRoutes } from './CoachRoutes';
import { PortalRoutes } from './PortalRoutes';

/**
 * Everything that needs the online database: sign-in, the coach area and the
 * client portal. Loaded only when someone visits one of these pages, so the
 * public demo never downloads the database code.
 */
export function LiveAreas({ area }: { area: 'coach' | 'me' | 'auth' }) {
  return (
    <SupabaseAuthProvider>
      {area === 'coach' && <RequireRole role="coach">{({ email }) => <CoachArea email={email} />}</RequireRole>}
      {area === 'me' && <RequireRole role="client">{({ userId, email }) => <ClientArea userId={userId} email={email} />}</RequireRole>}
      {area === 'auth' && (
        <Routes>
          <Route path="sign-in" element={<SignInPage />} />
          <Route path="callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<SignInPage />} />
        </Routes>
      )}
    </SupabaseAuthProvider>
  );
}

function CoachArea({ email }: { email: string }) {
  const { signOut } = useAuth();
  const repository = useMemo(() => new SupabaseRepository(getSupabase()), []);
  return (
    <RepositoryProvider repository={repository}>
      <AreaProvider area={{ base: '/coach', kind: 'coach', userEmail: email, signOut: () => void signOut() }}>
        <CoachRoutes />
      </AreaProvider>
    </RepositoryProvider>
  );
}

function ClientArea({ userId, email }: { userId: string; email: string }) {
  const { signOut } = useAuth();
  const portal = useMemo(() => new SupabasePortalRepository(getSupabase(), userId), [userId]);
  return (
    <PortalProvider portal={portal}>
      <PortalRoutes area={{ base: '/me', kind: 'live', userEmail: email, signOut: () => void signOut() }} />
    </PortalProvider>
  );
}
