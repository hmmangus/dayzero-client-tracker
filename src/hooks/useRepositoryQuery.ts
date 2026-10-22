import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { StorageCorruptedError, usePortal, useRepository, type PortalRepository, type Repository } from '../repositories';

export type QueryResult<T> =
  | { status: 'loading'; data: undefined; error: undefined }
  | { status: 'success'; data: T; error: undefined }
  | { status: 'error'; data: undefined; error: Error };

type QueryState<T> = QueryResult<T> & { key: string };

interface Subscribable {
  subscribe(listener: () => void): () => void;
}

/**
 * Runs a read against a data source and re-runs it whenever the source reports
 * a change, so every view stays in sync after any write.
 * Corrupted storage is re-thrown so the app-level error boundary can offer recovery.
 */
export function useSubscribedQuery<S extends Subscribable, T>(
  source: S,
  query: (source: S) => Promise<T>,
  deps: DependencyList,
): QueryResult<T> & { refresh: () => void } {
  const key = JSON.stringify(deps);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<QueryState<T>>({ key, status: 'loading', data: undefined, error: undefined });
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => source.subscribe(refresh), [source, refresh]);

  useEffect(() => {
    let cancelled = false;
    query(source).then(
      (data) => !cancelled && setState({ key, status: 'success', data, error: undefined }),
      (error: unknown) =>
        !cancelled &&
        setState({ key, status: 'error', data: undefined, error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      cancelled = true;
    };
    // `query` is a fresh closure each render; `key` captures what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, key, version]);

  if (state.status === 'error' && state.error instanceof StorageCorruptedError) throw state.error;

  // Don't show the previous client's data while the next one loads.
  if (state.key !== key) return { status: 'loading', data: undefined, error: undefined, refresh };
  const { key: _key, ...result } = state;
  return { ...result, refresh };
}

/** A query against the coach's repository. */
export function useRepositoryQuery<T>(query: (repository: Repository) => Promise<T>, deps: DependencyList) {
  return useSubscribedQuery(useRepository(), query, deps);
}

/** A query against the signed-in client's portal. */
export function usePortalQuery<T>(query: (portal: PortalRepository) => Promise<T>, deps: DependencyList) {
  return useSubscribedQuery(usePortal(), query, deps);
}
