import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '../lib/supabase';
import {
  createJourneyTemplate,
  listJourneyTemplates,
  updateJourneyTemplate,
  toggleJourneyTemplate,
  type JourneyTemplateForm,
} from '../lib/journeyTemplates';

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

const templateForm: JourneyTemplateForm = {
  organization_id: 'org1',
  name: 'Pre-arrival email',
  description: 'Send welcome email 3 days before check-in',
  trigger_type: 'reservation.created',
  config: { days_before: 3, template_id: 'welcome' },
};

describe('createJourneyTemplate', () => {
  it('sends the form to the create-journey-template function', async () => {
    const client = mockClient({ invoke: { data: { template_id: 'jt1' } } });
    const result = await createJourneyTemplate(client, templateForm);
    expect(result.template_id).toBe('jt1');
    expect(client.functions.invoke).toHaveBeenCalledWith('create-journey-template', {
      body: templateForm,
    });
  });
});

describe('listJourneyTemplates', () => {
  it('lists templates for the organization', async () => {
    const rows = [
      { id: 'jt1', organization_id: 'org1', name: 'Template 1', is_active: true },
    ];
    const client = mockClient({ query: { data: rows } });
    const templates = await listJourneyTemplates(client, 'org1');
    expect(templates).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('journey_templates');
  });
});

describe('updateJourneyTemplate', () => {
  it('updates the template', async () => {
    const client = mockClient({ query: { data: [{ id: 'jt1' }] } });
    await updateJourneyTemplate(client, 'jt1', { name: 'Updated name' });
    expect(client.from).toHaveBeenCalledWith('journey_templates');
  });
});

describe('toggleJourneyTemplate', () => {
  it('toggles template active state', async () => {
    const client = mockClient({ query: { data: [{ id: 'jt1' }] } });
    await toggleJourneyTemplate(client, 'jt1', false);
    expect(client.from).toHaveBeenCalledWith('journey_templates');
  });
});