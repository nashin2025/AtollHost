import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const { listMyMemberships, listJourneyTemplates } = vi.hoisted(() => ({
  listMyMemberships: vi.fn(),
  listJourneyTemplates: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

vi.mock('../lib/memberships', () => ({
  listMyMemberships: () => listMyMemberships(),
}));

vi.mock('../lib/journeyTemplates', () => ({
  listJourneyTemplates: () => listJourneyTemplates(),
  createJourneyTemplate: vi.fn(),
  toggleJourneyTemplate: vi.fn(),
}));

import { JourneyPage } from '../features/journey/JourneyPage';

const template = {
  id: 'jt1',
  organization_id: 'org-1',
  name: 'Check-in reminder',
  description: 'Send a reminder two days before arrival.',
  trigger_type: 'check_in_reminder',
  config: {},
  is_active: false,
  created_by: null,
  created_at: '2026-10-12T10:00:00.000Z',
  updated_at: '2026-10-12T10:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <JourneyPage />
    </MemoryRouter>,
  );
}

describe('JourneyPage', () => {
  it('renders templates with an inactive state and an activate control', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        organization: { name: 'Demo Agency', slug: 'demo-agency' },
      },
    ]);
    listJourneyTemplates.mockResolvedValue([template]);

    renderPage();

    expect(await screen.findByText('Check-in reminder')).toBeInTheDocument();
    expect(screen.getByText('Before check-in')).toBeInTheDocument();
    expect(screen.getByText('inactive')).toBeInTheDocument();
    expect(screen.getByText('1 template · 0 active')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Activate' }),
    ).toBeInTheDocument();
  });

  it('shows the empty state when no templates exist', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        organization: { name: 'Demo Agency', slug: 'demo-agency' },
      },
    ]);
    listJourneyTemplates.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'No journey templates yet' }),
    ).toBeInTheDocument();
  });
});
