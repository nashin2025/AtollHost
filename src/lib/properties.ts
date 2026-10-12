import { invokeFunction } from './api';
import type { SupabaseClient } from './supabase';

export interface Property {
  id: string;
  organization_id: string;
  name: string;
  island: string;
  atoll: string | null;
  status: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  organization: { name: string } | null;
}

export interface TeamMember {
  user_id: string;
  role: string;
  full_name: string | null;
  status: string;
}

export interface OrganizationMember {
  user_id: string;
  role: string;
  full_name: string | null;
  email: string;
}

export interface PropertyForm {
  property_id: string | null;
  organization_id: string;
  name: string;
  island: string;
  atoll: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string | null;
}

export async function listProperties(
  client: SupabaseClient,
): Promise<Property[]> {
  const { data, error } = await client
    .from('properties')
    .select('id, organization_id, name, island, atoll, status, phone, email, address, organization:organizations(name)')
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as Property[];
}

export async function upsertProperty(
  client: SupabaseClient,
  form: PropertyForm,
): Promise<{ property_id: string }> {
  return invokeFunction<{ property_id: string }>(
    client,
    'upsert-property',
    form,
  );
}

export async function listPropertyTeam(
  client: SupabaseClient,
  propertyId: string,
): Promise<TeamMember[]> {
  const { data, error } = await client.rpc('list_property_team', {
    p_property_id: propertyId,
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as TeamMember[];
}

export async function listOrganizationMembers(
  client: SupabaseClient,
  organizationId: string,
): Promise<OrganizationMember[]> {
  const { data, error } = await client.rpc('list_organization_members', {
    p_organization_id: organizationId,
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as OrganizationMember[];
}

export async function assignPropertyMember(
  client: SupabaseClient,
  propertyId: string,
  userId: string,
  role: string,
): Promise<void> {
  await invokeFunction(client, 'assign-property-member', {
    property_id: propertyId,
    user_id: userId,
    role,
  });
}

export async function revokePropertyMember(
  client: SupabaseClient,
  propertyId: string,
  userId: string,
): Promise<void> {
  await invokeFunction(client, 'revoke-property-member', {
    property_id: propertyId,
    user_id: userId,
  });
}
