import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const {
  listMyMemberships,
  getMyProfile,
  listAuditLogs,
  listOrganizationMembers,
} = vi.hoisted(() => ({
  listMyMemberships: vi.fn(),
  getMyProfile: vi.fn(),
  listAuditLogs: vi.fn(),
  listOrganizationMembers: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

vi.mock('../lib/memberships', () => ({
  listMyMemberships: () => listMyMemberships(),
}));

vi.mock('../lib/settings', () => ({
  getMyProfile: () => getMyProfile(),
  listAuditLogs: () => listAuditLogs(),
  updateMyProfile: vi.fn(),
}));

vi.mock('../lib/properties', () => ({
  listOrganizationMembers: () => listOrganizationMembers(),
}));

import { SettingsPage } from '../features/settings/SettingsPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  it('renders the profile, organization details, and audit log', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        status: 'active',
        organization: { name: 'Demo Agency', slug: 'demo-agency' },
      },
    ]);
    getMyProfile.mockResolvedValue({
      id: 'user-1',
      full_name: 'Nashin',
      email: 'shannashin2018@gmail.com',
    });
    listOrganizationMembers.mockResolvedValue([
      { user_id: 'user-1', role: 'agency_admin', full_name: 'Nashin', email: 'n@example.com' },
      { user_id: 'user-2', role: 'agency_staff', full_name: null, email: 's@example.com' },
    ]);
    listAuditLogs.mockResolvedValue([
      {
        id: 'a1',
        organization_id: 'org-1',
        property_id: null,
        actor_user_id: 'user-1',
        action: 'property.created',
        entity_type: 'property',
        entity_id: 'p1',
        metadata: { name: 'Coral Lagoon' },
        created_at: '2026-10-12T10:00:00.000Z',
      },
    ]);

    renderPage();

    // The audit log loads last, so wait on it before the sync assertions.
    expect(await screen.findByText('property.created')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Nashin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('shannashin2018@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('Demo Agency')).toBeInTheDocument();
    expect(screen.getByText('demo-agency')).toBeInTheDocument();
    expect(screen.getByText('agency admin')).toBeInTheDocument();
    expect(screen.getByText('property.created')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
  });
});
