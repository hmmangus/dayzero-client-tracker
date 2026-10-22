import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthContext, type AuthState } from './AuthContext';
import { RequireRole } from './RequireRole';

function ShowLocation() {
  const location = useLocation();
  return <p>at {location.pathname + location.search}</p>;
}

const renderGuard = (state: AuthState, role: 'coach' | 'client') =>
  render(
    <AuthContext.Provider value={{ state, signOut: vi.fn() }}>
      <MemoryRouter initialEntries={['/coach/clients']}>
        <Routes>
          <Route path="/coach/*" element={<RequireRole role={role}>{({ email }) => <p>secret for {email}</p>}</RequireRole>} />
          <Route path="/auth/sign-in" element={<ShowLocation />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('RequireRole', () => {
  it('waits while the sign-in is checked', () => {
    renderGuard({ status: 'loading' }, 'coach');
    expect(screen.getByRole('status')).toHaveTextContent('Checking your sign-in');
    expect(screen.queryByText(/secret/)).not.toBeInTheDocument();
  });

  it('sends signed-out visitors to sign in, remembering where they were going', () => {
    renderGuard({ status: 'signed-out' }, 'coach');
    expect(screen.getByText('at /auth/sign-in?as=coach&next=%2Fcoach%2Fclients')).toBeInTheDocument();
  });

  it('lets the right role in', () => {
    renderGuard({ status: 'signed-in', userId: 'u1', email: 'coach@example.com', role: 'coach' }, 'coach');
    expect(screen.getByText('secret for coach@example.com')).toBeInTheDocument();
  });

  it('keeps clients out of the coach area', () => {
    renderGuard({ status: 'signed-in', userId: 'u2', email: 'client@example.com', role: 'client' }, 'coach');
    expect(screen.queryByText(/secret/)).not.toBeInTheDocument();
    expect(screen.getByText('This account is not a coach account')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to my portal' })).toBeInTheDocument();
  });

  it('tells people whose email hasn’t been added yet what to do', () => {
    renderGuard({ status: 'signed-in', userId: 'u3', email: 'new@example.com', role: 'unlinked' }, 'client');
    expect(screen.getByText("We couldn't find your client profile")).toBeInTheDocument();
    expect(screen.getByText(/new@example.com/)).toBeInTheDocument();
  });
});
