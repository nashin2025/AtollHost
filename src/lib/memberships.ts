import { invokeFunction } from './api';
import type { SupabaseClient } from './supabase';

export interface Membership {
  organization_id: string;
  role: string;
  status: string;
  organization: { name: string; slug: string } | null;
}

export interface InvitationResult {
  invitation_id: string;
  token: string;
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

// Invites are issued by the deployed invite-member function. Email delivery
// is not configured, so the caller receives the invitation token and is
// responsible for sharing the accept-invitation link with the recipient.
export async function inviteMember(
  client: SupabaseClient,
  input: { organization_id: string; email: string; role: string },
): Promise<InvitationResult> {
  return invokeFunction<InvitationResult>(client, 'invite-member', input);
}

export async function revokeMember(
  client: SupabaseClient,
  input: { organization_id: string; user_id: string },
): Promise<void> {
  await invokeFunction(client, 'revoke-membership', input);
}
