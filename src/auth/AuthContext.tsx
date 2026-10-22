import { createContext, useContext } from 'react';

export type Role = 'coach' | 'client' | 'unlinked';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; userId: string; email: string; role: Role };

export interface Auth {
  state: AuthState;
  signOut: () => Promise<void>;
}

/** Provided by SupabaseAuthProvider in the app, or directly by tests. */
export const AuthContext = createContext<Auth | null>(null);

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside an auth provider');
  return auth;
}
