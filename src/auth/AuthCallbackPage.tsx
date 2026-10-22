import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { EmptyState, LoadingState } from '../components/States';
import { buttonClass } from '../components/ui';
import { useAuth } from './AuthContext';

/** Where the email link lands. Supabase finishes signing in from the URL; then we move on. */
export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const { state } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const linkError = new URLSearchParams(window.location.hash.slice(1)).get('error_description') ?? params.get('error_description');

  useEffect(() => {
    const id = window.setTimeout(() => setTimedOut(true), 10_000);
    return () => window.clearTimeout(id);
  }, []);

  if (state.status === 'signed-in') {
    const next = params.get('next');
    const fallback = state.role === 'coach' ? '/coach' : '/me';
    return <Navigate to={next && next.startsWith('/') && !next.startsWith('//') ? next : fallback} replace />;
  }

  if (linkError || (timedOut && state.status === 'signed-out')) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          as="h1"
          title="That sign-in link didn't work"
          description={linkError ? `${linkError}. Links expire after an hour and can only be used once.` : 'Links expire after an hour and can only be used once.'}
          action={
            <Link to="/auth/sign-in" className={buttonClass('primary')}>
              Send a new link
            </Link>
          }
        />
      </div>
    );
  }

  return <LoadingState label="Signing you in…" />;
}
