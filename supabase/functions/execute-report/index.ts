import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

interface ExecuteReportBody {
  definition_id?: unknown;
  organization_id?: unknown;
  property_id?: unknown;
  parameters?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: ExecuteReportBody;
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  if (typeof body.definition_id !== 'string' || !isUuid(body.definition_id)) {
    return errorResponse('VALIDATION_ERROR', 'definition_id is required.', 400);
  }
  if (typeof body.organization_id !== 'string' || !isUuid(body.organization_id)) {
    return errorResponse('VALIDATION_ERROR', 'organization_id is required.', 400);
  }
  const propertyId = typeof body.property_id === 'string' && isUuid(body.property_id) ? body.property_id : null;
  const parameters = body.parameters ?? {};

  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('execute_report', {
      p_definition_id: body.definition_id,
      p_organization_id: body.organization_id,
      p_property_id: propertyId,
      p_parameters: parameters,
      p_actor_id: caller.uid,
    });
    if (error) return rpcErrorResponse(error);
    if (typeof data !== 'string') return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
    return jsonResponse({ run_id: data }, 201);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});