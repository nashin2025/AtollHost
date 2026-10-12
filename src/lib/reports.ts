import { invokeFunction } from './api';
import type { SupabaseClient } from './supabase';

export interface ReportDefinition {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  parameters: ReportParameter[];
  created_at: string;
}

export interface ReportParameter {
  name: string;
  type: 'uuid' | 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
}

export interface ReportRun {
  id: string;
  definition_id: string;
  organization_id: string;
  property_id: string | null;
  parameters: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  row_count: number | null;
  result_csv: string | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  triggered_by: string | null;
}

export interface ExecuteReportInput {
  definition_id: string;
  organization_id: string;
  property_id: string | null;
  parameters: Record<string, unknown>;
}

export async function listReportDefinitions(
  client: SupabaseClient,
  organizationId: string,
): Promise<ReportDefinition[]> {
  return invokeFunction<{ definitions: ReportDefinition[] }>(client, 'list-report-definitions', {
    organization_id: organizationId,
  }).then(r => r.definitions);
}

export async function executeReport(
  client: SupabaseClient,
  input: ExecuteReportInput,
): Promise<{ run_id: string }> {
  return invokeFunction<{ run_id: string }>(client, 'execute-report', input);
}

export async function getReportRun(
  client: SupabaseClient,
  runId: string,
): Promise<ReportRun | null> {
  const { data, error } = await client
    .from('report_runs')
    .select('id, definition_id, organization_id, property_id, parameters, status, row_count, result_csv, error, started_at, completed_at, triggered_by')
    .eq('id', runId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }
  return data as unknown as ReportRun;
}