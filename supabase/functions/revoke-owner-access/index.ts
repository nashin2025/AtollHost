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

  if (typeof body.owner_id !== 'string' || !isUuid(body.owner_id)) {
    return errorResponse('VALIDATION_ERROR', 'owner_id is required.', 400);
  }
  if (typeof body.property_id !== 'string' || !isUuid(body.property_id)) {
    return errorResponse('VALIDATION_ERROR', 'property_id is required.', 400);
  }

  try {
    const client = serviceClient();
    const { error } = await client.rpc('revoke_owner_access', {
      p_owner_id: body.owner_id,
      p_property_id: body.property_id,
      p_actor_id: caller.uid,
    });
    if (error) return rpcErrorResponse(error);
    return jsonResponse({ revoked: true }, 200);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});