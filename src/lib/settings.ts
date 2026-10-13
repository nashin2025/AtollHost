import type { SupabaseClient } from './supabase';

export interface MyProfile {
  id: string;
  full_name: string;
  email: string | null;
}

export interface AuditLogEntry {
  id: string;
  organization_id: string | null;
  property_id: string | null;
  actor_user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function getMyProfile(
  client: SupabaseClient,
): Promise<MyProfile | null> {
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) {
    return null;
  }
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, updated_at')
    .eq('id', userData.user.id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }
  return {
    id: data.id,
    full_name: data.full_name ?? '',
    email: userData.user.email ?? null,
  };
}

export async function updateMyProfile(
  client: SupabaseClient,
  fullName: string,
): Promise<void> {
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) {
    throw new Error('Sign in is required.');
  }
  const { error } = await client
    .from('profiles')
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq('id', userData.user.id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listAuditLogs(
  client: SupabaseClient,
  organizationId: string,
): Promise<AuditLogEntry[]> {
  const { data, error } = await client
    .from('audit_logs')
    .select(
      'id, organization_id, property_id, actor_user_id, action, entity_type, entity_id, metadata, created_at',
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as AuditLogEntry[];
}
