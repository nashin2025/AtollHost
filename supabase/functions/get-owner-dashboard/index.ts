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
  if (req.method !== 'POST') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: { owner_id?: unknown; property_id?: unknown };
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  const ownerId = typeof body.owner_id === 'string' && isUuid(body.owner_id) ? body.owner_id : caller.uid;
  const propertyId = typeof body.property_id === 'string' && isUuid(body.property_id) ? body.property_id : null;

  if (!propertyId) {
    return errorResponse('VALIDATION_ERROR', 'property_id is required.', 400);
  }

  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('get_owner_dashboard', {
      p_owner_id: ownerId,
      p_property_id: propertyId,
    });
    if (error) return rpcErrorResponse(error);
    if (!data) return errorResponse('NOT_FOUND', 'Dashboard data not found.', 404);
    return jsonResponse(data, 200);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});