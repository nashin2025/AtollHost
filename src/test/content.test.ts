import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '../lib/supabase';
import {
  createContent,
  listContent,
  updateContentStatus,
  type ContentForm,
} from '../lib/content';

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
  } as unknown as SupabaseClient;
}

const contentForm: ContentForm = {
  property_id: 'p1',
  organization_id: 'org1',
  title: 'Welcome post',
  body: 'Welcome to our guesthouse!',
  channel: 'website',
  source: 'manual',
  status: 'draft',
  scheduled_for: null,
  external_id: null,
  external_url: null,
  metadata: {},
};

describe('createContent', () => {
  it('sends the form to the create-content function', async () => {
    const client = mockClient({ invoke: { data: { content_id: 'c1' } } });
    const result = await createContent(client, contentForm);
    expect(result.content_id).toBe('c1');
    expect(client.functions.invoke).toHaveBeenCalledWith('create-content', {
      body: contentForm,
    });
  });

  it('surfaces function errors', async () => {
    const client = mockClient({
      invoke: { data: null, error: { message: 'title is required' } },
    });
    await expect(createContent(client, contentForm)).rejects.toThrow(
      'title is required',
    );
  });
});

describe('listContent', () => {
  it('lists content for the property', async () => {
    const rows = [
      { id: 'c1', property_id: 'p1', title: 'Post 1', status: 'published' },
    ];
    const client = mockClient({ query: { data: rows } });
    const content = await listContent(client, 'p1');
    expect(content).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('content_calendar');
  });
});

describe('updateContentStatus', () => {
  it('updates content status', async () => {
    const client = mockClient({
      query: { data: [{ id: 'c1' }], error: null },
    });
    await updateContentStatus(client, 'c1', 'published');
    expect(client.from).toHaveBeenCalledWith('content_calendar');
  });
});