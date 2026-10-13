import { invokeFunction } from './api';
import type { SupabaseClient } from './supabase';

export interface ScannerRun {
  id: string;
  organization_id: string;
  property_id: string | null;
  target_name: string;
  target_url: string | null;
  status: string;
  score: number | null;
  summary: string | null;
  created_by: string;
  created_at: string;
  property: { name: string } | null;
}

export interface Finding {
  id: string;
  scanner_audit_id: string;
  source: string;
  category: string;
  title: string;
  severity: string;
  confidence: number;
  finding: string;
  recommendation: string;
  status: string;
  reviewed_by: string | null;
  created_at: string;
}

export interface ScanRequest {
  organization_id: string;
  property_id: string;
  target_name: string;
  target_url: string;
}

// Mirrors the relaxed server-side check in migration 0021: https scheme,
// lowercase or uppercase host characters, optional port, and an optional
// path, query, or fragment. http:// is rejected so a scan never downgrades
// the target the way the old regex forced users to notice by trial.
const TARGET_URL_PATTERN = /^https:\/\/[a-z0-9.-]+(:\d+)?([/?#].*)?$/i;

// Returns a normalized https target URL, or null when the input cannot be
// scanned. Bare domains (example.com) get https:// prepended; http:// and
// malformed input return null so the caller can show an inline error
// instead of failing a round-trip.
export function normalizeTargetUrl(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (/^http:\/\//i.test(trimmed)) {
    return null;
  }
  const withScheme = /^https:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return TARGET_URL_PATTERN.test(withScheme) ? withScheme : null;
}

export interface ScanResult {
  audit_id: string;
  status: string;
  score: number | null;
  summary: string;
  findings_count: number;
  robots_blocked: boolean;
}

export async function listScannerRuns(
  client: SupabaseClient,
): Promise<ScannerRun[]> {
  const { data, error } = await client
    .from('scanner_audits')
    .select(
      'id, organization_id, property_id, target_name, target_url, status, score, summary, created_by, created_at, property:properties(name)',
    )
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as ScannerRun[];
}

export async function listFindings(
  client: SupabaseClient,
  auditIds: string[],
): Promise<Finding[]> {
  if (auditIds.length === 0) {
    return [];
  }
  const { data, error } = await client
    .from('scanner_findings')
    .select(
      'id, scanner_audit_id, source, category, title, severity, confidence, finding, recommendation, status, reviewed_by, created_at',
    )
    .in('scanner_audit_id', auditIds)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as Finding[];
}

export async function startScannerRun(
  client: SupabaseClient,
  request: ScanRequest,
): Promise<ScanResult> {
  return invokeFunction<ScanResult>(client, 'run-scanner', request);
}

export async function reviewFinding(
  client: SupabaseClient,
  findingId: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  await invokeFunction(client, 'review-finding', {
    finding_id: findingId,
    status,
  });
}
