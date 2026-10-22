import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { PipelineBoard } from './PipelineBoard';
import { PipelinePage } from './PipelinePage';
import { renderWithProviders } from '../../test/renderWithProviders';
import { FIXED_NOW, datasetWith, makeClient } from '../../test/fixtures';

/**
 * jsdom has no layout, so give each column (and the cards inside it) a fake
 * position: column i spans x = i*300 … i*300+280. This lets dnd-kit's
 * collision detection work exactly as it does in a browser.
 */
function mockColumnLayout() {
  const rect = (x: number, y: number, width: number, height: number) =>
    ({ x, y, left: x, top: y, width, height, right: x + width, bottom: y + height, toJSON: () => ({}) }) as DOMRect;

  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const column = this.closest('[data-column-index]');
    // Anything outside a column (e.g. the drag overlay) is card-sized, starting in column 0.
    if (!column) return rect(10, 50, 260, 90);
    const index = Number(column.getAttribute('data-column-index'));
    if (this === column) return rect(index * 300, 0, 280, 800);
    return rect(index * 300 + 10, 50, 260, 90);
  });
}

describe('PipelineBoard', () => {
  beforeEach(() => {
    mockColumnLayout();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const lead = makeClient({ id: 'c-lead', name: 'Lorem Ipsum Lunges' });
  const paused = makeClient({
    id: 'c-paused',
    name: 'Demo Dan Deadlift',
    stage: 'paused',
    stageHistory: [
      { stage: 'lead', enteredAt: '2026-08-01T10:00:00.000Z' },
      { stage: 'active', enteredAt: '2026-08-10T10:00:00.000Z' },
      { stage: 'paused', enteredAt: '2026-10-01T10:00:00.000Z' },
    ],
  });

  /** Presses a key, then lets dnd-kit's layout measurement (scheduled on the next tick) run. */
  const press = async (target: Element | Document, code: string, key = code) => {
    await act(async () => {
      fireEvent.keyDown(target, { code, key });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  };

  const columnFor = (title: string) => screen.getByRole('region', { name: new RegExp(`^${title.replace('/', '\\/')}`) });

  it('moves a client to the next stage with the keyboard and records it in stageHistory', async () => {
    const data = datasetWith({ clients: [lead] });
    const { repository } = renderWithProviders(<PipelinePage />, { data });

    const handle = await screen.findByRole('button', { name: 'Move Lorem Ipsum Lunges' });
    handle.focus();

    // Space picks up, ArrowRight moves one column, Space drops.
    await press(handle, 'Space', ' ');
    await press(document, 'ArrowRight');
    await press(document, 'Space', ' ');

    await waitFor(async () => {
      const saved = await repository.getClient('c-lead');
      expect(saved?.stage).toBe('consult');
    });
    const saved = await repository.getClient('c-lead');
    expect(saved?.stageHistory.map((entry) => entry.stage)).toEqual(['lead', 'consult']);
    expect(saved?.stageHistory[1]?.enteredAt).toBe(FIXED_NOW.toISOString());

    // The board re-reads from the repository and shows the card in its new column.
    await waitFor(() => expect(within(columnFor('Consult')).getByText('Lorem Ipsum Lunges')).toBeInTheDocument());
    expect(within(columnFor('Lead')).queryByText('Lorem Ipsum Lunges')).not.toBeInTheDocument();
  });

  it('cancels a keyboard move with Escape', async () => {
    const data = datasetWith({ clients: [lead] });
    const { repository } = renderWithProviders(<PipelineBoard clients={data.clients} today="2026-10-20" />, { data });

    const handle = screen.getByRole('button', { name: 'Move Lorem Ipsum Lunges' });
    handle.focus();
    await press(handle, 'Space', ' ');
    await press(document, 'ArrowRight');
    await press(document, 'Escape');

    expect((await repository.getClient('c-lead'))?.stage).toBe('lead');
  });

  it('toggles a client between paused and churned from the badge', async () => {
    const data = datasetWith({ clients: [paused] });
    const { repository } = renderWithProviders(<PipelineBoard clients={data.clients} today="2026-10-20" />, { data });

    fireEvent.click(screen.getByRole('button', { name: /is paused\. Mark as churned/ }));

    await waitFor(async () => expect((await repository.getClient('c-paused'))?.stage).toBe('churned'));
    expect((await repository.getClient('c-paused'))?.stageHistory.at(-1)?.stage).toBe('churned');
  });

  it('shows overdue check-ins in red text', () => {
    const overdue = makeClient({ id: 'c-od', name: 'Placeholder Priya Press', nextCheckInDate: '2026-10-18' });
    const data = datasetWith({ clients: [overdue] });
    renderWithProviders(<PipelineBoard clients={data.clients} today="2026-10-20" />, { data });

    expect(screen.getByText(/Overdue:/)).toHaveClass('text-red-600');
  });
});
