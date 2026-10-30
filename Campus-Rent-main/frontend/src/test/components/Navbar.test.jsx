import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';

// We need to use the real AuthContext shape so Navbar works
const createAuthContext = (overrides = {}) => {
  const mockLogout = vi.fn();
  return {
    user: null,
    token: null,
    login: vi.fn(),
    logout: mockLogout,
    ...overrides,
  };
};

const renderNavbar = (authValue) =>
  render(
    <BrowserRouter>
      <AuthContext value={authValue}>
        <Navbar />
      </AuthContext>
    </BrowserRouter>
  );

describe('Navbar', () => {
  it('shows Login and Sign Up buttons when user is not authenticated', () => {
    renderNavbar(createAuthContext());
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('shows marketplace, add listing, and chat links when authenticated', () => {
    renderNavbar(
      createAuthContext({
        user: { fullName: 'Alex Rivera' },
        token: 'fake-token',
      })
    );
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Add Listing')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('shows user avatar and name when authenticated', () => {
    renderNavbar(
      createAuthContext({
        user: { fullName: 'Alex Rivera' },
        token: 'fake-token',
      })
    );
    expect(screen.getByText('AL')).toBeInTheDocument();
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
  });

  it('renders Campus 360 logo', () => {
    renderNavbar(createAuthContext());
    expect(screen.getByText('Campus 360')).toBeInTheDocument();
  });

  it('does not show marketplace link when not authenticated', () => {
    renderNavbar(createAuthContext());
    expect(screen.queryByText('Marketplace')).not.toBeInTheDocument();
  });

  it('hides Login and Sign Up when authenticated', () => {
    renderNavbar(
      createAuthContext({
        user: { fullName: 'Alex Rivera' },
        token: 'fake-token',
      })
    );
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
  });
});
