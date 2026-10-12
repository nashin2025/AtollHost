import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

const reviewStatuses = new Set(['approved', 'rejected']);

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
  let body: {
    finding_id?: unknown;
    status?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request body must be valid JSON.',
      400,
    );
  }
  if (typeof body.finding_id !== 'string') {
    return errorResponse(
      'VALIDATION_ERROR',
      'finding_id is required.',
      400,
    );
  }
  if (typeof body.status !== 'string' || !reviewStatuses.has(body.status)) {
    return errorResponse(
      'VALIDATION_ERROR',
      'status must be approved or rejected.',
      400,
    );
  }
  try {
    const client = serviceClient();
    const { error } = await client.rpc('review_finding', {
      p_finding_id: body.finding_id,
      p_status: body.status,
      p_actor_id: caller.uid,
    });
    if (error) {
      return rpcErrorResponse(error);
    }
    return jsonResponse({ reviewed: true }, 200);
  } catch {
    return errorResponse(
      'INTERNAL_ERROR',
      'The request could not be processed.',
      500,
    );
  }
});
