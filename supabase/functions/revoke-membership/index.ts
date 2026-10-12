import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }
  if (req.method !== 'POST') {
    return methodNotAllowed();
  }
  const caller: Caller | null = await verifyCaller(req);
  if (!caller) {
    return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);
  }
  let body: { organization_id?: unknown; user_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request body must be valid JSON.',
      400,
    );
  }
  if (typeof body.organization_id !== 'string') {
    return errorResponse(
      'VALIDATION_ERROR',
      'organization_id is required.',
      400,
    );
  }
  if (typeof body.user_id !== 'string') {
    return errorResponse(
      'VALIDATION_ERROR',
      'user_id is required.',
      400,
    );
  }
  try {
    const client = serviceClient();
    const { error } = await client.rpc('revoke_membership', {
      p_organization_id: body.organization_id,
      p_user_id: body.user_id,
      p_actor_id: caller.uid,
    });
    if (error) {
      return rpcErrorResponse(error);
    }
    return jsonResponse({ revoked: true }, 200);
  } catch {
    return errorResponse(
      'INTERNAL_ERROR',
      'The request could not be processed.',
      500,
    );
  }
});
