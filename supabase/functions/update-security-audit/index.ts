import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'PATCH') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: { audit_id?: unknown; status?: unknown; findings?: unknown; severity?: unknown };
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  if (typeof body.audit_id !== 'string' || !isUuid(body.audit_id)) {
    return errorResponse('VALIDATION_ERROR', 'audit_id is required.', 400);
  }
  if (typeof body.status !== 'string' || !['scheduled', 'in_progress', 'completed', 'failed'].includes(body.status)) {
    return errorResponse('VALIDATION_ERROR', 'status is required and must be valid.', 400);
  }
  const findings = body.findings ?? [];
  const severity = typeof body.severity === 'string' && ['critical', 'high', 'medium', 'low', 'info'].includes(body.severity) ? body.severity : null;

  try {
    const client = serviceClient();
    const { error } = await client.rpc('update_security_audit', {
      p_audit_id: body.audit_id,
      p_status: body.status,
      p_findings: findings,
      p_severity: severity,
      p_reviewed_by: caller.uid,
    });
    if (error) return rpcErrorResponse(error);
    return jsonResponse({ updated: true }, 200);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});