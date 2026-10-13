import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

const VALID_AUDIT_TYPES = new Set(['dependency_scan', 'secrets_scan', 'backup_restore', 'privacy_review', 'penetration_test', 'access_review']);
const VALID_STATUSES = new Set(['scheduled', 'in_progress', 'completed', 'failed']);
const VALID_SEVERITIES = new Set(['critical', 'high', 'medium', 'low', 'info']);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: { organization_id?: unknown; property_id?: unknown; audit_type?: unknown; status?: unknown; findings?: unknown; severity?: unknown; scheduled_for?: unknown };
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  if (typeof body.organization_id !== 'string' || !isUuid(body.organization_id)) {
    return errorResponse('VALIDATION_ERROR', 'organization_id is required.', 400);
  }
  const propertyId = typeof body.property_id === 'string' && isUuid(body.property_id) ? body.property_id : null;
  if (typeof body.audit_type !== 'string' || !VALID_AUDIT_TYPES.has(body.audit_type)) {
    return errorResponse('VALIDATION_ERROR', 'audit_type is required and must be valid.', 400);
  }
  if (typeof body.status !== 'string' || !VALID_STATUSES.has(body.status)) {
    return errorResponse('VALIDATION_ERROR', 'status is required and must be valid.', 400);
  }
  const severity = typeof body.severity === 'string' && VALID_SEVERITIES.has(body.severity) ? body.severity : null;
  const scheduledFor = typeof body.scheduled_for === 'string' && body.scheduled_for.length > 0 ? body.scheduled_for : null;
  const findings = body.findings ?? [];

  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('record_security_audit', {
      p_organization_id: body.organization_id,
      p_property_id: propertyId,
      p_audit_type: body.audit_type,
      p_status: body.status,
      p_severity: severity,
      p_scheduled_for: scheduledFor,
      p_created_by: caller.uid,
      p_findings: findings,
    });
    if (error) return rpcErrorResponse(error);
    if (typeof data !== 'string') return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
    return jsonResponse({ audit_id: data }, 201);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});