import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const {
  listMyMemberships,
  listProperties,
  listReportDefinitions,
  listReportRuns,
} = vi.hoisted(() => ({
  listMyMemberships: vi.fn(),
  listProperties: vi.fn(),
  listReportDefinitions: vi.fn(),
  listReportRuns: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

vi.mock('../lib/memberships', () => ({
  listMyMemberships: () => listMyMemberships(),
}));

vi.mock('../lib/properties', () => ({
  listProperties: () => listProperties(),
}));

vi.mock('../lib/reports', () => ({
  listReportDefinitions: () => listReportDefinitions(),
  listReportRuns: () => listReportRuns(),
  executeReport: vi.fn(),
  getReportRun: vi.fn(),
}));

import { ReportsPage } from '../features/reports/ReportsPage';

const definition = {
  id: 'd1',
  name: 'Enquiry conversion',
  description: 'Enquiries and outcomes within a date range.',
  is_system: true,
  parameters: [
    { name: 'from_date', type: 'date', required: true },
    { name: 'to_date', type: 'date', required: true },
  ],
  created_at: '2026-10-01T10:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ReportsPage />
    </MemoryRouter>,
  );
}

describe('ReportsPage', () => {
  it('renders definitions with parameters and a run control', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        organization: { name: 'Demo Agency', slug: 'demo-agency' },
      },
    ]);
    listProperties.mockResolvedValue([]);
    listReportDefinitions.mockResolvedValue([definition]);
    listReportRuns.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Enquiry conversion')).toBeInTheDocument();
    expect(screen.getByText('system')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Parameters: from_date (date, required), to_date (date, required)',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Run report' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No runs yet. Run a report to see results here.'),
    ).toBeInTheDocument();
  });
});
