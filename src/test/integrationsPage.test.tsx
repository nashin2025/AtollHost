import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const {
  listMyMemberships,
  listIntegrations,
  listIntegrationEvents,
} = vi.hoisted(() => ({
  listMyMemberships: vi.fn(),
  listIntegrations: vi.fn(),
  listIntegrationEvents: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

vi.mock('../lib/memberships', () => ({
  listMyMemberships: () => listMyMemberships(),
}));

vi.mock('../lib/integrations', () => ({
  listIntegrations: () => listIntegrations(),
  listIntegrationEvents: () => listIntegrationEvents(),
  setIntegrationCredential: vi.fn(),
  recordIntegrationHealth: vi.fn(),
}));

import { IntegrationsPage } from '../features/integrations/IntegrationsPage';

const integration = {
  id: 'i1',
  organization_id: 'org-1',
  property_id: null,
  name: 'Booking provider',
  provider: 'bookings_pro',
  status: 'connected',
  auth_type: 'api_key',
  config_schema: {},
  webhook_url: null,
  webhook_secret: null,
  health_check_url: null,
  health_check_interval: '6 hours',
  last_health_check: '2026-10-12T10:00:00.000Z',
  health_status: 'healthy',
  rate_limit_requests: 120,
  rate_limit_window: 'minute',
  retry_config: {},
  sandbox_mode: false,
  metadata: {},
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-12T10:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <IntegrationsPage />
    </MemoryRouter>,
  );
}

describe('IntegrationsPage', () => {
  it('renders the registry with connection and health state', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        organization: { name: 'Demo Agency', slug: 'demo-agency' },
      },
    ]);
    listIntegrations.mockResolvedValue([integration]);
    listIntegrationEvents.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Booking provider')).toBeInTheDocument();
    expect(screen.getByText('connected')).toBeInTheDocument();
    expect(screen.getByText('healthy')).toBeInTheDocument();
    expect(screen.getByText('120 per minute')).toBeInTheDocument();
    expect(screen.getByText('Auth: api_key')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Manage' }),
    ).toBeInTheDocument();
  });

  it('explains that integrations are provisioned when the registry is empty', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        organization: { name: 'Demo Agency', slug: 'demo-agency' },
      },
    ]);
    listIntegrations.mockResolvedValue([]);
    listIntegrationEvents.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'No integrations yet' }),
    ).toBeInTheDocument();
  });
});
