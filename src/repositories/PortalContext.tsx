import { createContext, useContext, type ReactNode } from 'react';
import type { PortalRepository } from './types';

const PortalContext = createContext<PortalRepository | null>(null);

export function PortalProvider({ portal, children }: { portal: PortalRepository; children: ReactNode }) {
  return <PortalContext.Provider value={portal}>{children}</PortalContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePortal(): PortalRepository {
  const portal = useContext(PortalContext);
  if (!portal) throw new Error('usePortal must be used inside <PortalProvider>');
  return portal;
}
