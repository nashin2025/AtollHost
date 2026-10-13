import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const {
  listMyMemberships,
  listProperties,
  listScannerRuns,
  listFindings,
  startScannerRun,
  reviewFinding,
} = vi.hoisted(() => ({
  listMyMemberships: vi.fn(),
  listProperties: vi.fn(),
  listScannerRuns: vi.fn(),
  listFindings: vi.fn(),
  startScannerRun: vi.fn(),
  reviewFinding: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: [] }),
        }),
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
}));

vi.mock('../lib/scanner', () => ({
  listScannerRuns: () => listScannerRuns(),
  listFindings: () => listFindings(),
  startScannerRun: () => startScannerRun(),
  reviewFinding: () => reviewFinding(),
}));

import { ScannerPage } from '../features/scanner/ScannerPage';

const run = {
  id: 'run-1',
  organization_id: 'org-1',
  property_id: 'p1',
  target_name: 'Coral Lagoon Guesthouse',
  target_url: 'https://coral-lagoon.example.com',
  status: 'completed',
  score: 62,
  summary: 'Reachable over HTTPS with gaps in discoverability.',
  created_at: '2026-10-13T10:00:00.000Z',
  property: { name: 'Coral Lagoon Guesthouse' },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ScannerPage />
    </MemoryRouter>,
  );
}

describe('ScannerPage', () => {
  it('renders scan run cards with score bar, property, and pending badge', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        organization: { name: 'Demo Agency' },
      },
    ]);
    listProperties.mockResolvedValue([]);
    listScannerRuns.mockResolvedValue([run]);
    listFindings.mockResolvedValue([
      {
        id: 'f1',
        scanner_audit_id: 'run-1',
        category: 'discoverability',
        source: 'scanner',
        severity: 'medium',
        status: 'pending_review',
        confidence: 0.8,
        title: 'No sitemap found',
        finding: 'The site does not publish a sitemap.',
        recommendation: 'Publish an XML sitemap.',
      },
    ]);

    renderPage();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Coral Lagoon Guesthouse',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('https://coral-lagoon.example.com'),
    ).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('62%')).toBeInTheDocument();
    expect(screen.getByText('1 awaiting review')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'View findings' }),
    ).toBeInTheDocument();
  });

  it('shows the empty state with a start-scan action when properties exist', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        organization: { name: 'Demo Agency' },
      },
    ]);
    listProperties.mockResolvedValue([
      { id: 'p1', organization_id: 'org-1', name: 'Coral Lagoon Guesthouse', island: 'Thulusdhoo', atoll: 'Kaafu', status: 'active', phone: null, email: null, address: null, organization: { name: 'Demo Agency' } },
    ]);
    listScannerRuns.mockResolvedValue([]);
    listFindings.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'No scans yet' }),
    ).toBeInTheDocument();
    // One CTA in the page header plus one inside the empty state.
    expect(
      screen.getAllByRole('button', { name: 'Start scan' }),
    ).toHaveLength(2);
  });
});
