import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { OverviewPage } from '../features/overview/OverviewPage';
import { paths } from '../router';

function renderOverview() {
  return render(
    <MemoryRouter>
      <OverviewPage />
    </MemoryRouter>,
  );
}

describe('OverviewPage', () => {
  it('renders the six metric cards with their empty-state context', () => {
    renderOverview();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Overview' }),
    ).toBeInTheDocument();
    const titles = [
      'Properties',
      'Open enquiries',
      'Unread conversations',
      'Overdue tasks',
      'Pending approvals',
      'Integration health',
    ];
    for (const title of titles) {
      expect(
        screen.getByRole('heading', { level: 3, name: title }),
      ).toBeInTheDocument();
    }
    expect(screen.getByText('No properties yet')).toBeInTheDocument();
    expect(screen.getByText('No integrations configured')).toBeInTheDocument();
  });

  it('points the placeholder value as decorative so the context text carries the meaning', () => {
    const { container } = renderOverview();
    const values = container.querySelectorAll('.stat-value');
    expect(values).toHaveLength(6);
    values.forEach((value) => {
      expect(value).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('links the getting-started steps to built pages', () => {
    renderOverview();
    expect(
      screen.getByRole('link', { name: /create your first property/i }),
    ).toHaveAttribute('href', paths.properties);
    expect(
      screen.getByRole('link', { name: /scan your website/i }),
    ).toHaveAttribute('href', paths.scanner);
    expect(
      screen.getByRole('link', { name: /track enquiries/i }),
    ).toHaveAttribute('href', paths.enquiries);
  });
});
