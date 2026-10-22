import { describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DemoArea, DEMO_PORTAL_CLIENT_ID } from '../../areas/DemoArea';
import { ToastProvider } from '../../components/Toast';

const visit = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <Routes>
          <Route path="/demo/*" element={<DemoArea />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );

const cardContaining = async (text: string) => (await screen.findByText(text)).closest('article') as HTMLElement;

describe('weekly check-in flow (demo)', () => {
  it('client sends a check-in, the coach replies, and the client sees the reply', async () => {
    const user = userEvent.setup();

    // 1. Client sends their check-in from the portal.
    visit('/demo/portal/check-in');
    await screen.findByRole('heading', { name: 'Weekly check-in' });
    await user.click(screen.getByRole('radio', { name: '4' }));
    await user.type(screen.getByLabelText('Wins this week'), 'Deadlifted 300 lb');
    await user.type(screen.getByLabelText('Questions for your coach (optional)'), 'More carbs on leg day?');
    await user.click(screen.getByRole('button', { name: 'Send check-in' }));
    const sent = await cardContaining('Deadlifted 300 lb');
    expect(within(sent).getByText('Waiting for coach')).toBeInTheDocument();
    cleanup();

    // 2. Coach sees it on the client's page and replies.
    visit(`/demo/clients/${DEMO_PORTAL_CLIENT_ID}`);
    const toReply = await cardContaining('Deadlifted 300 lb');
    expect(within(toReply).getByText('Needs your reply')).toBeInTheDocument();
    await user.type(within(toReply).getByLabelText('Your reply'), 'Yes, add 50 g carbs on leg days.');
    await user.click(within(toReply).getByRole('button', { name: 'Send reply' }));
    const replied = await cardContaining('Yes, add 50 g carbs on leg days.');
    expect(within(replied).queryByText('Needs your reply')).not.toBeInTheDocument();
    cleanup();

    // 3. Client sees the coach's reply.
    visit('/demo/portal/check-in');
    const answered = await cardContaining('Deadlifted 300 lb');
    expect(within(answered).getByText('Yes, add 50 g carbs on leg days.')).toBeInTheDocument();
    expect(within(answered).queryByText('Waiting for coach')).not.toBeInTheDocument();
  });

  it('asks for a rating before sending', async () => {
    const user = userEvent.setup();
    visit('/demo/portal/check-in');
    await user.click(await screen.findByRole('button', { name: 'Send check-in' }));
    expect(await screen.findByText('Choose a rating from 1 to 5.')).toBeInTheDocument();
  });
});
