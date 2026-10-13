import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const { listMyMemberships, listProperties, listContent } = vi.hoisted(() => ({
  listMyMemberships: vi.fn(),
  listProperties: vi.fn(),
  listContent: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

vi.mock('../lib/memberships', () => ({
  listMyMemberships: () => listMyMemberships(),
}));

vi.mock('../lib/properties', () => ({
  listProperties: () => listProperties(),
}));

vi.mock('../lib/content', () => ({
  listContent: () => listContent(),
  createContent: vi.fn(),
  updateContentStatus: vi.fn(),
  CONTENT_CHANNELS: ['website', 'email', 'other'],
  CONTENT_SOURCES: ['manual', 'integration'],
  CONTENT_STATUSES: ['draft', 'scheduled', 'published', 'failed', 'cancelled'],
}));

import { ContentPage } from '../features/content/ContentPage';

const row = {
  id: 'c1',
  property_id: 'p1',
  organization_id: 'org-1',
  title: 'Monsoon offer post',
  body: 'Three nights for the price of two.',
  channel: 'social_instagram',
  source: 'manual',
  status: 'scheduled',
  scheduled_for: '2026-11-01T09:00:00.000Z',
  published_at: null,
  external_id: null,
  external_url: null,
  metadata: {},
  created_by: null,
  updated_by: null,
  created_at: '2026-10-12T10:00:00.000Z',
  updated_at: '2026-10-12T10:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ContentPage />
    </MemoryRouter>,
  );
}

describe('ContentPage', () => {
  it('renders calendar rows with channel, source, status, and schedule', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        organization: { name: 'Demo Agency', slug: 'demo-agency' },
      },
    ]);
    listProperties.mockResolvedValue([
      {
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
      },
    ]);
    listContent.mockResolvedValue([row]);

    renderPage();

    expect(await screen.findByText('Monsoon offer post')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('manual')).toBeInTheDocument();
    expect(screen.getByText('scheduled')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mark published' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('shows the empty state when a property has no content', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        organization: { name: 'Demo Agency', slug: 'demo-agency' },
      },
    ]);
    listProperties.mockResolvedValue([
      {
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
      },
    ]);
    listContent.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByText('No content yet for this property.'),
    ).toBeInTheDocument();
  });
});
