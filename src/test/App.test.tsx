import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

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
