import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LocalStorageRepository, RepositoryProvider } from '../repositories';
import { ToastProvider } from '../components/Toast';
import type { Dataset } from '../schemas';
import { MemoryStorage } from './memoryStorage';
import { FIXED_NOW, datasetWith } from './fixtures';

/** Renders UI against a real repository backed by in-memory storage. */
export function renderWithProviders(ui: ReactElement, { data = datasetWith(), route = '/' }: { data?: Dataset; route?: string } = {}) {
  const repository = new LocalStorageRepository({
    storage: new MemoryStorage(),
    now: () => FIXED_NOW,
    demoData: () => data,
  });
  const result = render(
    <RepositoryProvider repository={repository}>
      <MemoryRouter initialEntries={[route]}>
        <ToastProvider>{ui}</ToastProvider>
      </MemoryRouter>
    </RepositoryProvider>,
  );
  return { ...result, repository };
}
