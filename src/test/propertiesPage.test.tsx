import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const {
  listMyMemberships,
  listProperties,
  listPropertyTeam,
  listOrganizationMembers,
} = vi.hoisted(() => ({
  listMyMemberships: vi.fn(),
  listProperties: vi.fn(),
  listPropertyTeam: vi.fn(),
  listOrganizationMembers: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: () => Promise.resolve({ data: [] }),
      }),
    }),
  },
}));

vi.mock('../lib/memberships', () => ({
  listMyMemberships: () => listMyMemberships(),
}));

vi.mock('../lib/properties', () => ({
  listProperties: () => listProperties(),
  listPropertyTeam: () => listPropertyTeam(),
  listOrganizationMembers: () => listOrganizationMembers(),
  assignPropertyMember: vi.fn(),
  revokePropertyMember: vi.fn(),
  upsertProperty: vi.fn(),
}));

import { PropertiesPage } from '../features/properties/PropertiesPage';

const property = {
  id: 'p1',
  organization_id: 'org-1',
  name: 'Coral Lagoon Guesthouse',
  island: 'Thulusdhoo',
  atoll: 'Kaafu',
  status: 'active',
  phone: null,
  email: null,
  address: null,
  organization: { name: 'Demo Agency' },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <PropertiesPage />
    </MemoryRouter>,
  );
}

describe('PropertiesPage', () => {
  it('renders property cards with location, status, team size, and admin actions', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        organization: { name: 'Demo Agency' },
      },
    ]);
    listProperties.mockResolvedValue([property]);

    renderPage();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Coral Lagoon Guesthouse',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Thulusdhoo, Kaafu')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('0 members')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Team' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Archive' }),
    ).toBeInTheDocument();
  });

  it('shows the organization only when the user belongs to several', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        organization: { name: 'Demo Agency' },
      },
      {
        organization_id: 'org-2',
        role: 'agency_staff',
        organization: { name: 'Second Agency' },
      },
    ]);
    listProperties.mockResolvedValue([property]);

    renderPage();

    expect(await screen.findByText('Demo Agency')).toBeInTheDocument();
  });

  it('hides the organization when the user belongs to one', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        organization: { name: 'Demo Agency' },
      },
    ]);
    listProperties.mockResolvedValue([property]);

    renderPage();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Coral Lagoon Guesthouse',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Demo Agency')).not.toBeInTheDocument();
  });

  it('shows the empty state with a create action for admins', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        organization: { name: 'Demo Agency' },
      },
    ]);
    listProperties.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'No properties yet' }),
    ).toBeInTheDocument();
    // One CTA in the page header plus one inside the empty state.
    expect(
      screen.getAllByRole('button', { name: 'Add property' }),
    ).toHaveLength(2);
  });
});
