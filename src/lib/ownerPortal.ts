import { invokeFunction } from './api';
import type { SupabaseClient } from './supabase';

export interface OwnerDashboard {
  revenue: {
    total: number;
    last_30d: number;
    currency: string;
  };
  occupancy: {
    total_rooms: number;
    occupied_last_30d: number;
  };
  enquiries: {
    total: number;
    open: number;
    won: number;
    conversion_rate: number;
  };
  reviews: {
    total: number;
    published: number;
    avg_rating: number;
  };
  tasks: {
    total: number;
    completed: number;
    overdue: number;
  };
  knowledge: {
    total_facts: number;
    approved: number;
  };
}

export interface OwnerPropertyAccess {
  id: string;
  owner_id: string;
  property_id: string;
  organization_id: string;
  granted_by: string;
  can_view_revenue: boolean;
  can_view_occupancy: boolean;
  can_view_reviews: boolean;
  can_view_tasks: boolean;
  can_view_knowledge: boolean;
  can_view_reports: boolean;
  can_manage_portal: boolean;
  granted_at: string;
  revoked_at: string | null;
}

export interface OwnerPropertyAccessForm {
  owner_id: string;
  property_id: string;
  organization_id: string;
  permissions?: {
    can_view_revenue?: boolean;
    can_view_occupancy?: boolean;
    can_view_reviews?: boolean;
    can_view_tasks?: boolean;
    can_view_knowledge?: boolean;
    can_view_reports?: boolean;
    can_manage_portal?: boolean;
  };
}

export interface SecurityAudit {
  id: string;
  organization_id: string;
  property_id: string | null;
  audit_type: 'dependency_scan' | 'secrets_scan' | 'backup_restore' | 'privacy_review' | 'penetration_test' | 'access_review';
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  findings: unknown[];
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  scheduled_for: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SecurityAuditForm {
  organization_id: string;
  property_id: string | null;
  audit_type: 'dependency_scan' | 'secrets_scan' | 'backup_restore' | 'privacy_review' | 'penetration_test' | 'access_review';
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  findings?: unknown[];
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info' | null;
  scheduled_for: string | null;
}

export interface BackupJob {
  id: string;
  organization_id: string;
  backup_type: 'full' | 'incremental' | 'schema_only' | 'data_only';
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  storage_path: string | null;
  size_bytes: number | null;
  tables: string[];
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  triggered_by: string | null;
  created_at: string;
}

export interface BackupJobForm {
  organization_id: string;
  backup_type: 'full' | 'incremental' | 'schema_only' | 'data_only';
  tables?: string[];
}

export async function getOwnerDashboard(
  client: SupabaseClient,
  ownerId: string,
  propertyId: string,
): Promise<OwnerDashboard> {
  return invokeFunction<OwnerDashboard>(client, 'get-owner-dashboard', {
    owner_id: ownerId,
    property_id: propertyId,
  });
}

export async function grantOwnerAccess(
  client: SupabaseClient,
  form: OwnerPropertyAccessForm,
): Promise<{ access_id: string }> {
  return invokeFunction<{ access_id: string }>(client, 'grant-owner-access', form);
}

export async function revokeOwnerAccess(
  client: SupabaseClient,
  ownerId: string,
  propertyId: string,
): Promise<{ revoked: true }> {
  return invokeFunction<{ revoked: true }>(client, 'revoke-owner-access', {
    owner_id: ownerId,
    property_id: propertyId,
  });
}

export async function recordSecurityAudit(
  client: SupabaseClient,
  form: SecurityAuditForm,
): Promise<{ audit_id: string }> {
  return invokeFunction<{ audit_id: string }>(client, 'record-security-audit', form);
}

export async function updateSecurityAudit(
  client: SupabaseClient,
  auditId: string,
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed',
  findings: unknown[],
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | null,
): Promise<void> {
  await invokeFunction(client, 'update-security-audit', {
    audit_id: auditId,
    status,
    findings,
    severity,
  });
}

export async function scheduleBackupJob(
  client: SupabaseClient,
  form: BackupJobForm,
): Promise<{ job_id: string }> {
  return invokeFunction<{ job_id: string }>(client, 'schedule-backup-job', form);
}

export async function completeBackupJob(
  client: SupabaseClient,
  jobId: string,
  status: 'completed' | 'failed',
  storagePath: string | null,
  sizeBytes: number | null,
  error: string | null,
): Promise<void> {
  await invokeFunction(client, 'complete-backup-job', {
    job_id: jobId,
    status,
    storage_path: storagePath,
    size_bytes: sizeBytes,
    error,
  });
}

export async function listSecurityAudits(
  client: SupabaseClient,
  organizationId: string,
): Promise<SecurityAudit[]> {
  const { data, error } = await client
    .from('security_audit_log')
    .select('id, organization_id, property_id, audit_type, status, findings, severity, reviewed_by, reviewed_at, scheduled_for, completed_at, created_by, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SecurityAudit[];
}

export async function listBackupJobs(
  client: SupabaseClient,
  organizationId: string,
): Promise<BackupJob[]> {
  const { data, error } = await client
    .from('backup_jobs')
    .select('id, organization_id, backup_type, status, storage_path, size_bytes, tables, error, started_at, completed_at, triggered_by, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as BackupJob[];
}

export async function listOwnerPropertyAccess(
  client: SupabaseClient,
  ownerId: string,
): Promise<OwnerPropertyAccess[]> {
  const { data, error } = await client
    .from('owner_property_access')
    .select('id, owner_id, property_id, organization_id, granted_by, can_view_revenue, can_view_occupancy, can_view_reviews, can_view_tasks, can_view_knowledge, can_view_reports, can_manage_portal, granted_at, revoked_at')
    .eq('owner_id', ownerId)
    .order('granted_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OwnerPropertyAccess[];
}