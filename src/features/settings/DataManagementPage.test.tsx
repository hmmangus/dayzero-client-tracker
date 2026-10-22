import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataManagementPage } from './DataManagementPage';
import { renderWithProviders } from '../../test/renderWithProviders';
import { datasetWith, makeClient } from '../../test/fixtures';

const jsonFile = (contents: unknown, name = 'backup.json') =>
  new File([typeof contents === 'string' ? contents : JSON.stringify(contents)], name, { type: 'application/json' });

describe('DataManagementPage', () => {
  it('rejects an invalid file and leaves data untouched', async () => {
    const { repository } = renderWithProviders(<DataManagementPage />, { data: datasetWith({ clients: [makeClient()] }) });

    await userEvent.upload(screen.getByLabelText('Choose backup file'), jsonFile({ schemaVersion: 1, clients: 'nope' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('failed validation');
    expect(await repository.listClients()).toHaveLength(1);
  });

  it('previews a valid file and imports it after confirmation', async () => {
    const incoming = datasetWith({ clients: [makeClient({ id: 'x', name: 'Imported Example' }), makeClient({ id: 'y', name: 'Second Example' })] });
    const { repository } = renderWithProviders(<DataManagementPage />, { data: datasetWith({ clients: [makeClient()] }) });

    await userEvent.upload(screen.getByLabelText('Choose backup file'), jsonFile(incoming, 'my-backup.json'));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('my-backup.json contains 2 clients');

    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(async () => expect((await repository.listClients()).map((c) => c.name)).toEqual(['Imported Example', 'Second Example']));
  });
});
