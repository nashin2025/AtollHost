import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';

vi.mock('../lib/config', () => ({
  isAuthConfigured: false,
  supabaseUrl: '',
  supabaseAnonKey: '',
}));

vi.mock('../lib/supabase', () => ({ supabase: null }));

describe('App', () => {
  it('routes unauthenticated users to the sign-in page', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
  });

  it('explains that authentication is not configured', () => {
    render(<App />);
    expect(
      screen.getByText(/authentication is not configured/i, {
        selector: 'p',
      }),
    ).toBeInTheDocument();
  });
});
