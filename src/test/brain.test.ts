import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '../lib/supabase';
import {
  createKnowledgeFact,
  listKnowledgeCategories,
  listKnowledgeItems,
  retrieveKnowledgeFacts,
  reviewKnowledgeFact,
  type KnowledgeForm,
} from '../lib/knowledge';

function mockQuery(data: unknown, error: unknown = null) {
  const thenable: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'in', 'eq']) {
    thenable[method] = vi.fn(() => thenable);
  }
  thenable.then = (resolve: (value: unknown) => unknown) =>
    resolve({ data, error });
  return thenable;
}

function mockClient(options: {
  query?: { data: unknown; error?: unknown };
  invoke?: { data: unknown; error?: unknown };
  rpc?: { data: unknown; error?: unknown };
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
    rpc: vi.fn(() =>
      Promise.resolve({
        data: options.rpc?.data ?? [],
        error: options.rpc?.error ?? null,
      }),
    ),
  } as unknown as SupabaseClient;
}

const form: KnowledgeForm = {
  fact_key: null,
  organization_id: 'org1',
  property_id: 'p1',
  category_id: 'c1',
  title: 'Check-in time',
  content: 'Guests may check in from 3pm.',
  source: 'manual',
  expires_at: null,
};

describe('listKnowledgeItems', () => {
  it('lists facts newest first for the property', async () => {
    const rows = [
      {
        id: 'k1',
        property_id: 'p1',
        title: 'Check-in time',
        version: 2,
        status: 'approved',
      },
    ];
    const client = mockClient({ query: { data: rows } });
    const items = await listKnowledgeItems(client, 'p1');
    expect(items).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('knowledge_items');
  });

  it('propagates query errors', async () => {
    const client = mockClient({
      query: { data: null, error: { message: 'denied' } },
    });
    await expect(listKnowledgeItems(client, 'p1')).rejects.toThrow('denied');
  });
});

describe('listKnowledgeCategories', () => {
  it('lists categories for the property', async () => {
    const rows = [
      { id: 'c1', property_id: 'p1', name: 'Housekeeping' },
    ];
    const client = mockClient({ query: { data: rows } });
    const categories = await listKnowledgeCategories(client, 'p1');
    expect(categories).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('knowledge_categories');
  });
});

describe('createKnowledgeFact', () => {
  it('sends the fact to the upsert-knowledge function', async () => {
    const client = mockClient({ invoke: { data: { fact_id: 'k1' } } });
    const result = await createKnowledgeFact(client, form);
    expect(result.fact_id).toBe('k1');
    expect(client.functions.invoke).toHaveBeenCalledWith('upsert-knowledge', {
      body: form,
    });
  });

  it('surfaces function errors', async () => {
    const client = mockClient({
      invoke: { data: null, error: { message: 'title is required' } },
    });
    await expect(createKnowledgeFact(client, form)).rejects.toThrow(
      'title is required',
    );
  });
});

describe('reviewKnowledgeFact', () => {
  it('sends the verdict to the review-knowledge function', async () => {
    const client = mockClient({ invoke: { data: { reviewed: true } } });
    const result = await reviewKnowledgeFact(client, 'k1', 'approved');
    expect(result.reviewed).toBe(true);
    expect(client.functions.invoke).toHaveBeenCalledWith('review-knowledge', {
      body: { fact_id: 'k1', status: 'approved' },
    });
  });
});

describe('retrieveKnowledgeFacts', () => {
  it('returns only the current approved facts', async () => {
    const rows = [
      {
        id: 'k1',
        fact_key: 'check-in',
        version: 2,
        title: 'Check-in time',
      },
    ];
    const client = mockClient({ rpc: { data: rows } });
    const facts = await retrieveKnowledgeFacts(client, 'p1');
    expect(facts).toEqual(rows);
    expect(client.rpc).toHaveBeenCalledWith('retrieve_knowledge_facts', {
      p_property_id: 'p1',
    });
  });

  it('propagates rpc errors', async () => {
    const client = mockClient({
      rpc: { data: null, error: { message: 'forbidden' } },
    });
    await expect(retrieveKnowledgeFacts(client, 'p1')).rejects.toThrow(
      'forbidden',
    );
  });
});
