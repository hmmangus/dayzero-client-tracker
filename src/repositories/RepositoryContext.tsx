import { createContext, useContext, type ReactNode } from 'react';
import type { Repository } from './types';

const RepositoryContext = createContext<Repository | null>(null);

/** Supplies the data layer to the component tree. Swap the implementation here, nowhere else. */
export function RepositoryProvider({ repository, children }: { repository: Repository; children: ReactNode }) {
  return <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRepository(): Repository {
  const repository = useContext(RepositoryContext);
  if (!repository) throw new Error('useRepository must be used inside <RepositoryProvider>');
  return repository;
}
