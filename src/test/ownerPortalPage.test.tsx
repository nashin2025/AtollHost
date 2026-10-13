import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const { listOwnerPropertyAccess, getOwnerDashboard } = vi.hoisted(() => ({
  listOwnerPropertyAccess: vi.fn(),
  getOwnerDashboard: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: { id: 'user-1' } } }),
    },
  },
}));

vi.mock('../lib/ownerPortal', () => ({
  listOwnerPropertyAccess: () => listOwnerPropertyAccess(),
  getOwnerDashboard: () => getOwnerDashboard(),
}));

import { OwnerPortalPage } from '../features/owner/OwnerPortalPage';

const dashboard = {
  property_name: 'Coral Lagoon Guesthouse',
  revenue: { total: 120000, last_30d: 45000, currency: 'MVR' },
  occupancy: { total_rooms: 6, occupied_last_30d: 42 },
  enquiries: { total: 30, open: 5, won: 12, conversion_rate: 40 },
  reviews: { total: 18, published: 15, avg_rating: 4.6 },
  tasks: { total: 20, completed: 16, overdue: 1 },
  knowledge: { total_facts: 40, approved: 32 },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <OwnerPortalPage />
    </MemoryRouter>,
  );
}

describe('OwnerPortalPage', () => {
  it('renders the shared metrics and hides ungranted sections', async () => {
    listOwnerPropertyAccess.mockResolvedValue([
      {
        id: 'a1',
        owner_id: 'user-1',
        property_id: 'p1',
        organization_id: 'org-1',
        granted_by: 'admin-1',
        can_view_revenue: false,
        can_view_occupancy: true,
        can_view_reviews: true,
        can_view_tasks: false,
        can_view_knowledge: true,
        can_view_reports: false,
        can_manage_portal: false,
        granted_at: '2026-10-01T10:00:00.000Z',
        revoked_at: null,
      },
    ]);
    getOwnerDashboard.mockResolvedValue(dashboard);

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Coral Lagoon Guesthouse' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Open enquiries' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Occupancy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reviews' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Verified facts' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Revenue' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Tasks' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
  });

  it('explains that nothing is shared yet when there are no grants', async () => {
    listOwnerPropertyAccess.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByRole('heading', {
        name: 'No properties shared with you yet',
      }),
    ).toBeInTheDocument();
  });
});
