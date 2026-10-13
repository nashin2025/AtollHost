import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

const VALID_BACKUP_TYPES = new Set(['full', 'incremental', 'schema_only', 'data_only']);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: { organization_id?: unknown; backup_type?: unknown; tables?: unknown };
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  if (typeof body.organization_id !== 'string' || !isUuid(body.organization_id)) {
    return errorResponse('VALIDATION_ERROR', 'organization_id is required.', 400);
  }
  if (typeof body.backup_type !== 'string' || !VALID_BACKUP_TYPES.has(body.backup_type)) {
    return errorResponse('VALIDATION_ERROR', 'backup_type is required and must be valid.', 400);
  }
  const tables = Array.isArray(body.tables) ? body.tables : [];

  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('schedule_backup_job', {
      p_organization_id: body.organization_id,
      p_backup_type: body.backup_type,
      p_tables: tables,
      p_triggered_by: caller.uid,
    });
    if (error) return rpcErrorResponse(error);
    if (typeof data !== 'string') return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
    return jsonResponse({ job_id: data }, 201);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});