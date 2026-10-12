import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

interface RejectBody {
  draft_id?: unknown;
  reason?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

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

  let body: RejectBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400);
  }

  if (typeof body.draft_id !== 'string' || !isUuid(body.draft_id)) {
    return errorResponse('VALIDATION_ERROR', 'draft_id is required.', 400);
  }

  const reason = typeof body.reason === 'string' && body.reason.length > 0
    ? body.reason
    : null;

  try {
    const client = serviceClient();
    const { error } = await client.rpc('reject_ai_draft', {
      p_draft_id: body.draft_id,
      p_actor_id: caller.uid,
      p_reason: reason,
    });

    if (error) {
      return rpcErrorResponse(error);
    }

    return jsonResponse({ rejected: true }, 200);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});