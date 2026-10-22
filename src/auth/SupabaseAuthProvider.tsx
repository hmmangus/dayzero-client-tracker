import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import { AuthContext, type AuthState, type Role } from './AuthContext';

/** Tracks the Supabase session and asks the database which role this person has. */
export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    const resolve = async (session: Session | null) => {
      if (!session) {
        if (!cancelled) setState({ status: 'signed-out' });
        return;
      }
      const { data, error } = await supabase.rpc('my_role');
      if (cancelled) return;
      const role: Role = !error && (data === 'coach' || data === 'client') ? data : 'unlinked';
      setState({ status: 'signed-in', userId: session.user.id, email: session.user.email ?? '', role });
    };

    void supabase.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Token refreshes don't change who is signed in; skip the extra role lookup.
      if (event === 'TOKEN_REFRESHED') return;
      // Defer so we don't call Supabase from inside its own auth callback.
      setTimeout(() => void resolve(session), 0);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const value = useMemo(() => ({ state, signOut }), [state, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
