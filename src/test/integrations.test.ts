import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '../lib/supabase';
import {
  listIntegrations,
  createIntegration,
  updateIntegration,
  setIntegrationCredential,
  createIntegrationWebhook,
  recordIntegrationEvent,
  processIntegrationEvent,
  recordIntegrationHealth,
  listIntegrationEvents,
  getIntegrationHealth,
  type IntegrationForm,
} from '../lib/integrations';

function mockQuery(data: unknown, error: unknown = null) {
  const thenable: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'eq', 'update', 'single', 'limit']) {
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

const integrationForm: IntegrationForm = {
  organization_id: 'org1',
  property_id: 'p1',
  name: 'Booking.com',
  provider: 'booking.com',
  status: 'pending',
  auth_type: 'api_key',
  config_schema: {},
  sandbox_mode: false,
};

describe('listIntegrations', () => {
  it('lists integrations for the organization', async () => {
    const rows = [
      { id: 'i1', organization_id: 'org1', provider: 'booking.com', status: 'connected' },
    ];
    const client = mockClient({ query: { data: rows } });
    const integrations = await listIntegrations(client, 'org1');
    expect(integrations).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('integrations');
  });
});

describe('createIntegration', () => {
  it('sends the form to the create-integration function', async () => {
    const client = mockClient({ invoke: { data: { integration_id: 'i1' } } });
    const result = await createIntegration(client, integrationForm);
    expect(result.integration_id).toBe('i1');
    expect(client.functions.invoke).toHaveBeenCalledWith('create-integration', {
      body: integrationForm,
    });
  });
});

describe('updateIntegration', () => {
  it('updates the integration', async () => {
    const client = mockClient({ query: { data: [{ id: 'i1' }] } });
    await updateIntegration(client, 'i1', { name: 'Updated name' });
    expect(client.from).toHaveBeenCalledWith('integrations');
  });
});

describe('setIntegrationCredential', () => {
  it('sends credential to set-integration-credential function', async () => {
    const client = mockClient({ invoke: { data: { saved: true } } });
    await setIntegrationCredential(client, 'i1', 'api_key', 'secret-key', null);
    expect(client.functions.invoke).toHaveBeenCalledWith('set-integration-credential', {
      body: { integration_id: 'i1', credential_type: 'api_key', value: 'secret-key', expires_at: null },
    });
  });
});

describe('createIntegrationWebhook', () => {
  it('sends webhook config to create-integration-webhook function', async () => {
    const client = mockClient({ invoke: { data: { webhook_id: 'wh1' } } });
    const result = await createIntegrationWebhook(client, 'i1', 'https://example.com/webhook', ['booking.created'], 'secret-hash');
    expect(result.webhook_id).toBe('wh1');
    expect(client.functions.invoke).toHaveBeenCalledWith('create-integration-webhook', {
      body: { integration_id: 'i1', url: 'https://example.com/webhook', events: ['booking.created'], secret_hash: 'secret-hash', signature_header: undefined, signature_algorithm: undefined },
    });
  });
});

describe('recordIntegrationEvent', () => {
  it('records an integration event', async () => {
    const client = mockClient({ invoke: { data: { event_id: 'e1', idempotency_key: 'idem1' } } });
    const result = await recordIntegrationEvent(client, 'i1', 'inbound', 'booking.created', 'idem1', { booking_id: 'b1' });
    expect(result.event_id).toBe('e1');
    expect(client.functions.invoke).toHaveBeenCalledWith('record-integration-event', {
      body: { integration_id: 'i1', direction: 'inbound', event_type: 'booking.created', idempotency_key: 'idem1', payload: { booking_id: 'b1' }, headers: {} },
    });
  });
});

describe('processIntegrationEvent', () => {
  it('processes an integration event', async () => {
    const client = mockClient({ invoke: { data: { processed: true } } });
    await processIntegrationEvent(client, 'e1', 'handleBookingCreated');
    expect(client.functions.invoke).toHaveBeenCalledWith('process-integration-event', {
      body: { event_id: 'e1', handler: 'handleBookingCreated' },
    });
  });
});

describe('recordIntegrationHealth', () => {
  it('records integration health', async () => {
    const client = mockClient({ invoke: { data: { recorded: true } } });
    await recordIntegrationHealth(client, 'i1', 'healthy', 150, null);
    expect(client.functions.invoke).toHaveBeenCalledWith('record-integration-health', {
      body: { integration_id: 'i1', status: 'healthy', latency_ms: 150, error: null },
    });
  });
});

describe('listIntegrationEvents', () => {
  it('lists events for the integration', async () => {
    const rows = [
      { id: 'e1', integration_id: 'i1', direction: 'inbound', event_type: 'booking.created', status: 'completed' },
    ];
    const client = mockClient({ query: { data: rows } });
    const events = await listIntegrationEvents(client, 'i1');
    expect(events).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('integration_events');
  });
});

describe('getIntegrationHealth', () => {
  it('gets health history for the integration', async () => {
    const rows = [
      { id: 'h1', integration_id: 'i1', status: 'healthy', latency_ms: 100, checked_at: '2026-10-12T00:00:00Z' },
    ];
    const client = mockClient({ query: { data: rows } });
    const health = await getIntegrationHealth(client, 'i1');
    expect(health).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('integration_health');
  });
});