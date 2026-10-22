import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { EmptyState, LoadingState } from '../components/States';
import { buttonClass } from '../components/ui';
import { useAuth, type Role } from './AuthContext';

/**
 * Only renders `children` for someone signed in with the given role.
 * This is a convenience for the UI; the database's security rules are what
 * actually protect the data.
 */
export function RequireRole({ role, children }: { role: Exclude<Role, 'unlinked'>; children: (auth: { userId: string; email: string }) => ReactNode }) {
  const { state, signOut } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') return <LoadingState label="Checking your sign-in…" />;

  if (state.status === 'signed-out') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/sign-in?as=${role}&next=${next}`} replace />;
  }

  if (state.role !== role) {
    const isCoachInPortal = role === 'client' && state.role === 'coach';
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          as="h1"
          title={isCoachInPortal ? "You're signed in as the coach" : role === 'coach' ? 'This account is not a coach account' : "We couldn't find your client profile"}
          description={
            isCoachInPortal
              ? 'The client portal is for clients. Open the coach area instead, or use "Preview the client portal" in the demo.'
              : role === 'coach'
                ? `You're signed in as ${state.email}. If you're a client, use the client portal.`
                : `You're signed in as ${state.email}, but your coach hasn't added this email yet. Ask them to add it, then sign in again.`
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {state.role === 'coach' && (
                <Link to="/coach" className={buttonClass('primary')}>
                  Go to coach area
                </Link>
              )}
              {state.role === 'client' && (
                <Link to="/me" className={buttonClass('primary')}>
                  Go to my portal
                </Link>
              )}
              <button type="button" className={buttonClass('secondary')} onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
          }
        />
      </div>
    );
  }

  return <>{children({ userId: state.userId, email: state.email })}</>;
}
