import type { SupabaseClient } from './supabase';

export interface OverviewStats {
  properties: number;
  openEnquiries: number;
  unreadEnquiries: number;
  overdueTasks: number;
  pendingDrafts: number;
  pendingFindings: number;
  connectedIntegrations: number;
  erroringIntegrations: number;
}

// Server-side counts scoped by RLS to the caller's organizations, so the
// overview matches exactly what each feature page would list. No row data
// crosses the wire.
export async function loadOverviewStats(
  client: SupabaseClient,
): Promise<OverviewStats> {
  const nowIso = new Date().toISOString();

  const results = await Promise.all([
    client.from('properties').select('*', { count: 'exact', head: true }),
    client
      .from('enquiries')
      .select('*', { count: 'exact', head: true })
      .in('status', ['new', 'open', 'waiting']),
    client
      .from('enquiries')
      .select('*', { count: 'exact', head: true })
      .eq('unread', true),
    client
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .in('status', ['todo', 'in_progress', 'blocked'])
      .lt('due_at', nowIso),
    client
      .from('ai_drafts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft'),
    client
      .from('scanner_findings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_review'),
    client
      .from('integrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'connected'),
    client
      .from('integrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'error'),
  ]);

  for (const result of results) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const count = (index: number): number => results[index].count ?? 0;
  return {
    properties: count(0),
    openEnquiries: count(1),
    unreadEnquiries: count(2),
    overdueTasks: count(3),
    pendingDrafts: count(4),
    pendingFindings: count(5),
    connectedIntegrations: count(6),
    erroringIntegrations: count(7),
  };
}
