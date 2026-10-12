import { invokeFunction } from './api';
import type { SupabaseClient } from './supabase';

export interface ExportJob {
  id: string;
  organization_id: string;
  property_id: string | null;
  source_type: string;
  source_query: string | null;
  filters: Record<string, unknown>;
  format: 'csv' | 'json';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_path: string | null;
  row_count: number | null;
  error: string | null;
  requested_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CreateExportInput {
  organization_id: string;
  property_id: string | null;
  source_type: string;
  source_query: string | null;
  filters: Record<string, unknown>;
  format: 'csv' | 'json';
}

export const EXPORT_SOURCES = [
  'enquiries',
  'tasks',
  'reviews',
  'audits',
  'tax_transactions',
  'reservations',
  'guests',
  'conversations',
  'knowledge_items',
  'custom_query',
] as const;

export async function createExportJob(
  client: SupabaseClient,
  input: CreateExportInput,
): Promise<{ job_id: string }> {
  return invokeFunction<{ job_id: string }>(client, 'create-export-job', input);
}

export async function getExportJob(
  client: SupabaseClient,
  jobId: string,
): Promise<ExportJob | null> {
  return invokeFunction<ExportJob>(client, 'get-export-job', { job_id: jobId });
}

export async function listExportJobs(
  client: SupabaseClient,
  organizationId: string,
): Promise<ExportJob[]> {
  const { data, error } = await client
    .from('export_jobs')
    .select('id, organization_id, property_id, source_type, source_query, filters, format, status, file_path, row_count, error, requested_by, created_at, completed_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ExportJob[];
}