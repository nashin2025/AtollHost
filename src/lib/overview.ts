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

export interface UnansweredEnquiry {
  id: string;
  subject: string | null;
  channel: string;
  property_name: string;
  created_at: string;
}

export interface PendingApproval {
  id: string;
  type: 'ai_draft' | 'scan_finding';
  property_name: string;
  confidence: number;
  created_at: string;
}

export interface OverdueTask {
  id: string;
  title: string;
  property_name: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  due_at: string;
}

export interface ActivityItem {
  id: string;
  type: 'enquiry' | 'message' | 'task' | 'approval' | 'scan';
  title: string;
  property_name: string;
  meta?: string;
  created_at: string;
}

// Server-side counts scoped by RLS to the caller's organizations, so the
// overview matches exactly what each feature page would list. No row data
// crosses the wire. Tables added in later phases (ai_drafts, scanner_findings)
// may not exist in every connected project, so those queries degrade
// gracefully to zero rather than crashing the whole load.

async function safeCount(client: SupabaseClient, query: Promise<{ error: unknown; count: number | null }>): Promise<number> {
  try {
    const { error, count } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function safeSelect<T>(
  client: SupabaseClient,
  query: Promise<{ error: unknown; data: T[] | null }>,
): Promise<T[]> {
  try {
    const { error, data } = await query;
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function loadOverviewStats(
  client: SupabaseClient,
): Promise<OverviewStats> {
  const nowIso = new Date().toISOString();

  const [
    propertiesResult,
    openEnquiriesResult,
    unreadEnquiriesResult,
    overdueTasksResult,
    aiDraftsResult,
    scannerFindingsResult,
    connectedIntegrationsResult,
    erroringIntegrationsResult,
  ] = await Promise.all([
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
      .in('status', ['backlog', 'todo', 'in_progress', 'in_review'])
      .lt('due_at', nowIso),
    safeCount(
      client,
      client
        .from('ai_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft'),
    ),
    safeCount(
      client,
      client
        .from('scanner_findings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_review'),
    ),
    client
      .from('integrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'connected'),
    client
      .from('integrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'error'),
  ]);

  for (const result of [
    propertiesResult,
    openEnquiriesResult,
    unreadEnquiriesResult,
    overdueTasksResult,
    connectedIntegrationsResult,
    erroringIntegrationsResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const count = (result: { count: number | null }): number => result.count ?? 0;
  return {
    properties: count(propertiesResult),
    openEnquiries: count(openEnquiriesResult),
    unreadEnquiries: count(unreadEnquiriesResult),
    overdueTasks: count(overdueTasksResult),
    pendingDrafts: aiDraftsResult,
    pendingFindings: scannerFindingsResult,
    connectedIntegrations: count(connectedIntegrationsResult),
    erroringIntegrations: count(erroringIntegrationsResult),
  };
}

export async function loadUnansweredEnquiries(
  client: SupabaseClient,
): Promise<UnansweredEnquiry[]> {
  const { data, error } = await client
    .from('enquiries')
    .select(`
      id,
      subject,
      channel,
      created_at,
      property:properties!enquiries_property_id_fkey(name)
    `)
    .in('status', ['new', 'open', 'waiting'])
    .eq('unread', true)
    .order('created_at', { ascending: true })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: {
    id: string;
    subject: string | null;
    channel: string;
    created_at: string;
    property: { name: string }[] | null;
  }) => ({
    id: row.id,
    subject: row.subject,
    channel: row.channel,
    property_name: row.property?.[0]?.name ?? 'Unknown property',
    created_at: row.created_at,
  }));
}

export async function loadPendingApprovals(
  client: SupabaseClient,
): Promise<PendingApproval[]> {
  const [drafts, findings] = await Promise.all([
    safeSelect(
      client,
      client
        .from('ai_drafts')
        .select(`
        id,
        created_at,
        confidence,
        property:properties!ai_drafts_property_id_fkey(name)
      `)
        .eq('status', 'draft')
        .order('created_at', { ascending: true })
        .limit(10),
    ),
    safeSelect(
      client,
      client
        .from('scanner_findings')
        .select(`
        id,
        created_at,
        property:properties!scanner_findings_property_id_fkey(name)
      `)
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true })
        .limit(10),
    ),
  ]);

  const results: PendingApproval[] = [
    ...(drafts as { id: string; created_at: string; confidence: number | null; property: { name: string }[] | null }[]).map(
      (row) => ({
        id: row.id,
        type: 'ai_draft' as const,
        property_name: row.property?.[0]?.name ?? 'Unknown property',
        confidence: row.confidence ?? 0,
        created_at: row.created_at,
      }),
    ),
    ...(findings as { id: string; created_at: string; property: { name: string }[] | null }[]).map(
      (row) => ({
        id: row.id,
        type: 'scan_finding' as const,
        property_name: row.property?.[0]?.name ?? 'Unknown property',
        confidence: 0,
        created_at: row.created_at,
      }),
    ),
  ];

  return results.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(0, 15);
}

export async function loadOverdueTasks(
  client: SupabaseClient,
): Promise<OverdueTask[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await client
    .from('tasks')
    .select(`
      id,
      title,
      priority,
      due_at,
      property:properties!tasks_property_id_fkey(name)
    `)
    .in('status', ['backlog', 'todo', 'in_progress', 'in_review'])
    .lt('due_at', nowIso)
    .order('due_at', { ascending: true })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: {
    id: string;
    title: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    due_at: string;
    property: { name: string }[] | null;
  }) => ({
    id: row.id,
    title: row.title,
    property_name: row.property?.[0]?.name ?? 'Unknown property',
    priority: row.priority,
    due_at: row.due_at,
  }));
}

export async function loadRecentActivity(
  client: SupabaseClient,
): Promise<ActivityItem[]> {
  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [enquiries, messages, tasks, approvals, scans] = await Promise.all([
    client
      .from('enquiries')
      .select(`
        id,
        subject,
        channel,
        created_at,
        property:properties!enquiries_property_id_fkey(name)
      `)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(10),
    client
      .from('conversation_messages')
      .select(`
        id,
        body,
        created_at,
        conversation:conversations!conversation_messages_conversation_id_fkey(
          id,
          property:properties!conversations_property_id_fkey(name)
        )
      `)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(10),
    client
      .from('tasks')
      .select(`
        id,
        title,
        status,
        created_at,
        property:properties!tasks_property_id_fkey(name)
      `)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(10),
    safeSelect(
      client,
      client
        .from('ai_drafts')
        .select(`
        id,
        status,
        created_at,
        property:properties!ai_drafts_property_id_fkey(name)
      `)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(10),
    ),
    safeSelect(
      client,
      client
        .from('scanner_findings')
        .select(`
        id,
        status,
        created_at,
        property:properties!scanner_findings_property_id_fkey(name)
      `)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(10),
    ),
  ]);

  if (enquiries.error) throw new Error(enquiries.error.message);
  if (messages.error) throw new Error(messages.error.message);
  if (tasks.error) throw new Error(tasks.error.message);

  const results: ActivityItem[] = [
    ...(enquiries.data ?? []).map((row: {
      id: string;
      subject: string | null;
      channel: string;
      created_at: string;
      property: { name: string }[] | null;
    }) => ({
      id: row.id,
      type: 'enquiry' as const,
      title: `New enquiry: ${row.subject ?? 'Untitled'}`,
      property_name: row.property?.[0]?.name ?? 'Unknown property',
      meta: `Channel: ${row.channel}`,
      created_at: row.created_at,
    })),
    ...(messages.data ?? []).map((row: {
      id: string;
      body: string | null;
      created_at: string;
      conversation: { id: string; property: { name: string }[] | null }[] | null;
    }) => ({
      id: row.id,
      type: 'message' as const,
      title: `New message${row.body ? `: ${row.body.slice(0, 50)}...` : ''}`,
      property_name: row.conversation?.[0]?.property?.[0]?.name ?? 'Unknown property',
      meta: 'Message received',
      created_at: row.created_at,
    })),
    ...(tasks.data ?? []).map((row: {
      id: string;
      title: string;
      status: string;
      created_at: string;
      property: { name: string }[] | null;
    }) => ({
      id: row.id,
      type: 'task' as const,
      title: `Task ${row.status}: ${row.title}`,
      property_name: row.property?.[0]?.name ?? 'Unknown property',
      meta: `Status: ${row.status}`,
      created_at: row.created_at,
    })),
    ...(approvals as { id: string; status: string; created_at: string; property: { name: string }[] | null }[]).map((row) => ({
      id: row.id,
      type: 'approval' as const,
      title: `AI draft ${row.status}`,
      property_name: row.property?.[0]?.name ?? 'Unknown property',
      meta: `Status: ${row.status}`,
      created_at: row.created_at,
    })),
    ...(scans as { id: string; status: string; created_at: string; property: { name: string }[] | null }[]).map((row) => ({
      id: row.id,
      type: 'scan' as const,
      title: `Scan finding ${row.status}`,
      property_name: row.property?.[0]?.name ?? 'Unknown property',
      meta: `Status: ${row.status}`,
      created_at: row.created_at,
    })),
  ];

  return results
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);
}