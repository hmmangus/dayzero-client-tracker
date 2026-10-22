import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientForm } from './ClientForm';

describe('ClientForm', () => {
  it('shows field errors and does not submit invalid input', async () => {
    const onSubmit = vi.fn();
    render(<ClientForm submitLabel="Create client" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Email (optional)'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: 'Create client' }));

    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email (optional)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Goal weight (lb)')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits parsed values, treating blank optional fields as missing', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ClientForm showStage submitLabel="Create client" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Lorem Ipsum Lunges');
    await userEvent.type(screen.getByLabelText('Goal weight (lb)'), '150.5');
    await userEvent.selectOptions(screen.getByLabelText('Stage'), 'consult');
    await userEvent.click(screen.getByRole('button', { name: 'Create client' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Lorem Ipsum Lunges',
        email: undefined,
        stage: 'consult',
        targets: expect.objectContaining({ goalWeightLbs: 150.5, calories: 2000 }),
      }),
    );
  });
});
