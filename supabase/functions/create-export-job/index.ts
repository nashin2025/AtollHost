import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

interface ExportBody {
  organization_id?: unknown;
  property_id?: unknown;
  source_type?: unknown;
  source_query?: unknown;
  filters?: unknown;
  format?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: ExportBody;
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  if (typeof body.organization_id !== 'string' || !isUuid(body.organization_id)) {
    return errorResponse('VALIDATION_ERROR', 'organization_id is required.', 400);
  }
  const propertyId = typeof body.property_id === 'string' && isUuid(body.property_id) ? body.property_id : null;
  if (typeof body.source_type !== 'string' || body.source_type.trim().length === 0) {
    return errorResponse('VALIDATION_ERROR', 'source_type is required.', 400);
  }
  const format = typeof body.format === 'string' && (body.format === 'csv' || body.format === 'json') ? body.format : 'csv';

  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('create_export_job', {
      p_organization_id: body.organization_id,
      p_property_id: propertyId,
      p_source_type: body.source_type.trim(),
      p_source_query: typeof body.source_query === 'string' && body.source_query.trim().length > 0 ? body.source_query : null,
      p_filters: body.filters ?? {},
      p_format: format,
      p_actor_id: (await client.auth.getUser()).data.user?.id ?? '',
    });
    if (error) return rpcErrorResponse(error);
    if (typeof data !== 'string') return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
    return jsonResponse({ job_id: data }, 201);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});