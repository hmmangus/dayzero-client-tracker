import { createContext, useContext, type ReactNode } from 'react';

/**
 * The coach screens run in two places: /demo (fictional data in this browser)
 * and /coach (the real, signed-in app). The area tells links where they live
 * and what to show in the header.
 */
export interface Area {
  /** Path prefix for this area's screens, e.g. "/demo". */
  base: string;
  kind: 'demo' | 'coach';
  /** Demo only: where "View as client" goes. */
  portalPreviewPath?: string;
  /** Coach only: who is signed in. */
  userEmail?: string;
  signOut?: () => void;
}

const AreaContext = createContext<Area>({ base: '', kind: 'demo' });

export function AreaProvider({ area, children }: { area: Area; children: ReactNode }) {
  return <AreaContext.Provider value={area}>{children}</AreaContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useArea = () => useContext(AreaContext);

/** Builds a link inside the current area: path("/clients") → "/demo/clients". */
// eslint-disable-next-line react-refresh/only-export-components
export function useAreaPath() {
  const { base } = useArea();
  return (path: string) => base + path || '/';
}
