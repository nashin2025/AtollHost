import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const {
  listMyMemberships,
  listOrganizationMembers,
  inviteMember,
  revokeMember,
} = vi.hoisted(() => ({
  listMyMemberships: vi.fn(),
  listOrganizationMembers: vi.fn(),
  inviteMember: vi.fn(),
  revokeMember: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: { id: 'user-1' } } }),
    },
  },
}));

vi.mock('../lib/memberships', () => ({
  listMyMemberships: () => listMyMemberships(),
  inviteMember: () => inviteMember(),
  revokeMember: () => revokeMember(),
}));

vi.mock('../lib/properties', () => ({
  listOrganizationMembers: () => listOrganizationMembers(),
}));

import { TeamPage } from '../features/team/TeamPage';

const members = [
  {
    user_id: 'user-1',
    role: 'agency_admin',
    full_name: 'Nashin',
    email: 'shannashin2018@gmail.com',
  },
  {
    user_id: 'user-2',
    role: 'agency_staff',
    full_name: null,
    email: 'staff@example.com',
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <TeamPage />
    </MemoryRouter>,
  );
}

describe('TeamPage', () => {
  it('renders the member roster with roles and hides revoke for the current user', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        status: 'active',
        organization: { name: 'Demo Agency', slug: 'demo-agency' },
      },
    ]);
    listOrganizationMembers.mockResolvedValue(members);

    renderPage();

    expect(await screen.findByText('Nashin')).toBeInTheDocument();
    expect(screen.getByText('staff@example.com')).toBeInTheDocument();
    expect(screen.getByText('agency admin')).toBeInTheDocument();
    expect(screen.getByText('agency staff')).toBeInTheDocument();
    expect(screen.getByText('you')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Revoke' })).toHaveLength(1);
  });

  it('tells non-admins that admin access is required', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_staff',
        status: 'active',
        organization: { name: 'Demo Agency', slug: 'demo-agency' },
      },
    ]);
    listOrganizationMembers.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Admin access required' }),
    ).toBeInTheDocument();
  });
});
