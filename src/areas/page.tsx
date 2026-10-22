import { Suspense, type ReactNode } from 'react';
import { LoadingState } from '../components/States';

/** Wraps a lazily loaded page so it shows a loading state while its code downloads. */
export const page = (element: ReactNode) => <Suspense fallback={<LoadingState />}>{element}</Suspense>;
