import { describe, expect, it } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import { useClients } from './useData';
import { renderWithProviders } from '../test/renderWithProviders';
import { newClientInput } from '../test/fixtures';

function ClientNames() {
  const clients = useClients();
  if (clients.status !== 'success') return <p>loading</p>;
  return <p>{clients.data.map((c) => c.name).join(', ') || 'none'}</p>;
}

describe('useRepositoryQuery', () => {
  it('re-runs the query after the repository changes', async () => {
    const { repository } = renderWithProviders(<ClientNames />);
    expect(await screen.findByText('none')).toBeInTheDocument();

    await act(() => repository.createClient(newClientInput({ name: 'Amy Example' })));
    await waitFor(() => expect(screen.getByText('Amy Example')).toBeInTheDocument());
  });
});
