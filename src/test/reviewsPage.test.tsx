import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const {
  listMyMemberships,
  listProperties,
  listReviews,
  listReviewResponses,
} = vi.hoisted(() => ({
  listMyMemberships: vi.fn(),
  listProperties: vi.fn(),
  listReviews: vi.fn(),
  listReviewResponses: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

vi.mock('../lib/memberships', () => ({
  listMyMemberships: () => listMyMemberships(),
}));

vi.mock('../lib/properties', () => ({
  listProperties: () => listProperties(),
}));

vi.mock('../lib/reviews', () => ({
  listReviews: () => listReviews(),
}));

vi.mock('../lib/reviewResponses', () => ({
  listReviewResponses: () => listReviewResponses(),
  createReviewResponse: vi.fn(),
  approveReviewResponse: vi.fn(),
  publishReviewResponse: vi.fn(),
}));

import { ReviewsPage } from '../features/reviews/ReviewsPage';

const review = {
  id: 'r1',
  property_id: 'p1',
  source: 'google',
  external_id: 'rev-1',
  rating: 4.5,
  review_text: 'Wonderful staff and clean rooms.',
  status: 'new',
  ai_draft: null,
  published_response: null,
  reviewed_at: null,
  created_at: '2026-10-12T10:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ReviewsPage />
    </MemoryRouter>,
  );
}

describe('ReviewsPage', () => {
  it('renders reviews with rating, status, and response actions for admins', async () => {
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
    listReviews.mockResolvedValue([review]);
    listReviewResponses.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByText('Wonderful staff and clean rooms.'),
    ).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('new')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Respond' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'View responses' }),
    ).not.toBeInTheDocument();
  });

  it('hides management actions for non-admin members', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_staff',
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
    listReviews.mockResolvedValue([review]);
    listReviewResponses.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByText('Wonderful staff and clean rooms.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Respond' }),
    ).not.toBeInTheDocument();
  });
});
