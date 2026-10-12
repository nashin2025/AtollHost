import type { SupabaseClient } from './supabase';

export interface Membership {
  organization_id: string;
  role: string;
  status: string;
  organization: { name: string; slug: string } | null;
}

export async function listMyMemberships(
  client: SupabaseClient,
): Promise<Membership[]> {
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) {
    return [];
  }
  const { data, error } = await client
    .from('organization_members')
    .select(
      'organization_id, role, status, organization:organizations(name, slug)',
    )
    .eq('user_id', userData.user.id)
    .eq('status', 'active');
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as Membership[];
}
