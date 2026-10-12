import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

interface ProcessEventBody {
  event_id?: unknown;
  handler?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: ProcessEventBody;
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  if (typeof body.event_id !== 'string' || !isUuid(body.event_id)) {
    return errorResponse('VALIDATION_ERROR', 'event_id is required.', 400);
  }
  if (typeof body.handler !== 'string' || body.handler.trim().length === 0) {
    return errorResponse('VALIDATION_ERROR', 'handler is required.', 400);
  }

  try {
    const client = serviceClient();
    const { error } = await client.rpc('process_integration_event', {
      p_event_id: body.event_id,
      p_handler: body.handler.trim(),
      p_actor_id: caller.uid,
    });
    if (error) return rpcErrorResponse(error);
    return jsonResponse({ processed: true }, 200);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});