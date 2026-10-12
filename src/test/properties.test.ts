import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '../lib/supabase';
import {
  assignPropertyMember,
  listOrganizationMembers,
  listProperties,
  listPropertyTeam,
  revokePropertyMember,
  upsertProperty,
} from '../lib/properties';

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
  rpc?: { data: unknown; error?: unknown };
  invoke?: { data: unknown; error?: unknown };
}) {
  return {
    from: vi.fn(() =>
      mockQuery(options.query?.data ?? [], options.query?.error ?? null),
    ),
    rpc: vi.fn(() =>
      Promise.resolve({
        data: options.rpc?.data ?? [],
        error: options.rpc?.error ?? null,
      }),
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

describe('listProperties', () => {
  it('lists properties with their organization name', async () => {
    const rows = [
      {
        id: 'p1',
        name: 'Coral House',
        organization: { name: 'Agency' },
      },
    ];
    const client = mockClient({ query: { data: rows } });
    const properties = await listProperties(client);
    expect(properties).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('properties');
  });

  it('propagates query errors', async () => {
    const client = mockClient({
      query: { data: null, error: { message: 'denied' } },
    });
    await expect(listProperties(client)).rejects.toThrow('denied');
  });
});

describe('upsertProperty', () => {
  it('sends the full form to the upsert-property function', async () => {
    const client = mockClient({
      invoke: { data: { property_id: 'p1' } },
    });
    const result = await upsertProperty(client, {
      property_id: null,
      organization_id: 'org1',
      name: 'Coral House',
      island: 'Maafushi',
      atoll: 'Kaafu',
      phone: null,
      email: null,
      address: null,
      status: 'onboarding',
    });
    expect(result).toEqual({ property_id: 'p1' });
    expect(client.functions.invoke).toHaveBeenCalledWith(
      'upsert-property',
      {
        body: {
          property_id: null,
          organization_id: 'org1',
          name: 'Coral House',
          island: 'Maafushi',
          atoll: 'Kaafu',
          phone: null,
          email: null,
          address: null,
          status: 'onboarding',
        },
      },
    );
  });

  it('propagates function errors', async () => {
    const client = mockClient({
      invoke: {
        data: null,
        error: {
          message: 'only organization admins can create or edit properties',
          context: {
            error: {
              code: 'FORBIDDEN',
              message:
                'only organization admins can create or edit properties',
              request_id: 'req-1',
              details: [],
            },
          },
        },
      },
    });
    await expect(
      upsertProperty(client, {
        property_id: null,
        organization_id: 'org1',
        name: 'Coral House',
        island: 'Maafushi',
        atoll: null,
        phone: null,
        email: null,
        address: null,
        status: null,
      }),
    ).rejects.toThrow(
      'only organization admins can create or edit properties',
    );
  });
});

describe('listPropertyTeam', () => {
  it('requests the roster for the given property', async () => {
    const client = mockClient({
      rpc: { data: [{ user_id: 'u1', role: 'property_owner' }] },
    });
    const team = await listPropertyTeam(client, 'p1');
    expect(team).toHaveLength(1);
    expect(client.rpc).toHaveBeenCalledWith('list_property_team', {
      p_property_id: 'p1',
    });
  });
});

describe('listOrganizationMembers', () => {
  it('requests the member directory for the given organization', async () => {
    const client = mockClient({
      rpc: { data: [{ user_id: 'u1', role: 'agency_admin' }] },
    });
    const members = await listOrganizationMembers(client, 'org1');
    expect(members).toHaveLength(1);
    expect(client.rpc).toHaveBeenCalledWith('list_organization_members', {
      p_organization_id: 'org1',
    });
  });
});

describe('property assignments', () => {
  it('assigns a member through the edge function', async () => {
    const client = mockClient({ invoke: { data: {} } });
    await assignPropertyMember(client, 'p1', 'u1', 'property_manager');
    expect(client.functions.invoke).toHaveBeenCalledWith(
      'assign-property-member',
      {
        body: { property_id: 'p1', user_id: 'u1', role: 'property_manager' },
      },
    );
  });

  it('revokes a member through the edge function', async () => {
    const client = mockClient({ invoke: { data: {} } });
    await revokePropertyMember(client, 'p1', 'u1');
    expect(client.functions.invoke).toHaveBeenCalledWith(
      'revoke-property-member',
      { body: { property_id: 'p1', user_id: 'u1' } },
    );
  });
});
