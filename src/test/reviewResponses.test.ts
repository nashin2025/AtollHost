import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '../lib/supabase';
import {
  createReviewResponse,
  listReviewResponses,
  approveReviewResponse,
  publishReviewResponse,
  type ReviewResponseForm,
} from '../lib/reviewResponses';

function mockQuery(data: unknown, error: unknown = null) {
  const thenable: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'eq', 'update']) {
    thenable[method] = vi.fn(() => thenable);
  }
  thenable.then = (resolve: (value: unknown) => unknown) =>
    resolve({ data, error });
  return thenable;
}

function mockClient(options: {
  query?: { data: unknown; error?: unknown };
  invoke?: { data: unknown; error?: unknown };
  auth?: { getUser: () => Promise<{ data: { user: { id: string } } }> };
}) {
  return {
    from: vi.fn(() =>
      mockQuery(options.query?.data ?? [], options.query?.error ?? null),
    ),
    functions: {
      invoke: vi.fn(() =>
        Promise.resolve({
          data: options.invoke?.data ?? {},
          error: options.invoke?.error ?? null,
        }),
      ),
    },
    auth: {
      getUser: options.auth?.getUser ?? vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
  } as unknown as SupabaseClient;
}

const responseForm: ReviewResponseForm = {
  review_id: 'r1',
  property_id: 'p1',
  organization_id: 'org1',
  draft_body: 'Thank you for your review!',
  confidence: 0.9,
  source_references: [],
};

describe('createReviewResponse', () => {
  it('sends the form to the create-review-response function', async () => {
    const client = mockClient({ invoke: { data: { response_id: 'rr1' } } });
    const result = await createReviewResponse(client, responseForm);
    expect(result.response_id).toBe('rr1');
    expect(client.functions.invoke).toHaveBeenCalledWith('create-review-response', {
      body: responseForm,
    });
  });
});

describe('listReviewResponses', () => {
  it('lists responses for the review', async () => {
    const rows = [
      { id: 'rr1', review_id: 'r1', draft_body: 'Response 1', status: 'draft' },
    ];
    const client = mockClient({ query: { data: rows } });
    const responses = await listReviewResponses(client, 'r1');
    expect(responses).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('review_responses');
  });
});

describe('approveReviewResponse', () => {
  it('approves the response', async () => {
    const client = mockClient({ query: { data: [{ id: 'rr1' }] } });
    await approveReviewResponse(client, 'rr1');
    expect(client.from).toHaveBeenCalledWith('review_responses');
  });
});

describe('publishReviewResponse', () => {
  it('publishes the response', async () => {
    const client = mockClient({ query: { data: [{ id: 'rr1' }] } });
    await publishReviewResponse(client, 'rr1');
    expect(client.from).toHaveBeenCalledWith('review_responses');
  });
});