import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const TABLE_COUNTS: Record<string, number[]> = {
  properties: [3],
  enquiries: [2, 1],
  tasks: [1],
  ai_drafts: [2],
  scanner_findings: [1],
  integrations: [2, 1],
};

// Counts are consumed in query order per table: enquiries (open, then
// unread) and integrations (connected, then erroring).
vi.mock('../lib/supabase', () => {
  const seen: Record<string, number> = {};
  return {
    supabase: {
      from: (table: string) => {
        const query: Record<string, unknown> = {};
        for (const method of ['select', 'in', 'eq', 'lt']) {
          query[method] = vi.fn(() => query);
        }
        const index = seen[table] ?? 0;
        seen[table] = index + 1;
        query.then = (resolve: (value: unknown) => unknown) =>
          resolve({ count: TABLE_COUNTS[table]?.[index] ?? 0, error: null });
        return query;
      },
    },
    resetCountSeen: () => {
      for (const key of Object.keys(seen)) {
        delete seen[key];
      }
    },
  };
});

import * as supabaseModule from '../lib/supabase';
import { OverviewPage } from '../features/overview/OverviewPage';

// The mock adds this export; the real module has no such member.
const resetCountSeen = (
  supabaseModule as unknown as { resetCountSeen: () => void }
).resetCountSeen;

beforeEach(() => {
  resetCountSeen();
});

const EMPTY_COUNTS: Record<string, number[]> = {
  properties: [0],
  enquiries: [0, 0],
  tasks: [0],
  ai_drafts: [0],
  scanner_findings: [0],
  integrations: [0, 0],
};

function setTableCounts(next: Record<string, number[]>) {
  for (const key of Object.keys(TABLE_COUNTS)) {
    delete TABLE_COUNTS[key];
  }
  Object.assign(TABLE_COUNTS, next);
}

function renderOverview() {
  return render(
    <MemoryRouter>
      <OverviewPage />
    </MemoryRouter>,
  );
}

describe('OverviewPage', () => {
  it('renders live counts with context for each metric', async () => {
    renderOverview();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Overview' }),
    ).toBeInTheDocument();
    for (const title of [
      'Properties',
      'Open enquiries',
      'Unread enquiries',
      'Overdue tasks',
      'Pending approvals',
      'Integration health',
    ]) {
      expect(
        screen.getByRole('heading', { level: 3, name: title }),
      ).toBeInTheDocument();
    }
    expect(screen.getByText('Across your organizations')).toBeInTheDocument();
    expect(screen.getByText('New, open, and waiting')).toBeInTheDocument();
    expect(screen.getByText('Marked unread')).toBeInTheDocument();
    expect(screen.getByText('Past their due date')).toBeInTheDocument();
    expect(
      screen.getByText('2 AI drafts · 1 scan finding'),
    ).toBeInTheDocument();
    expect(screen.getByText('1 needs attention')).toBeInTheDocument();

    const cardValues = document.querySelectorAll('.stat-value');
    expect(Array.from(cardValues).map((node) => node.textContent)).toEqual([
      '3',
      '2',
      '1',
      '1',
      '3',
      '2',
    ]);
  });

  it('hides the getting-started panel once properties exist', async () => {
    renderOverview();
    await screen.findByText('Across your organizations');

    expect(
      screen.queryByRole('heading', { name: 'Get started' }),
    ).not.toBeInTheDocument();
  });

  it('shows the getting-started panel and empty contexts when there is no data', async () => {
    setTableCounts(EMPTY_COUNTS);
    renderOverview();

    expect(
      await screen.findByRole('heading', { name: 'Get started' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No properties yet')).toBeInTheDocument();
    expect(screen.getByText('Nothing open')).toBeInTheDocument();
    expect(screen.getByText('Nothing pending review')).toBeInTheDocument();
    expect(screen.getByText('No integrations configured')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /create your first property/i }),
    ).toHaveAttribute('href', '/properties');
  });
});
