import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

interface MessageBody {
  conversation_id?: unknown;
  body?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
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
  let body: MessageBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request body must be valid JSON.',
      400,
    );
  }
  if (
    typeof body.conversation_id !== 'string' ||
    !isUuid(body.conversation_id)
  ) {
    return errorResponse(
      'VALIDATION_ERROR',
      'conversation_id is required.',
      400,
    );
  }
  if (typeof body.body !== 'string' || body.body.trim().length === 0) {
    return errorResponse(
      'VALIDATION_ERROR',
      'message body is required.',
      400,
    );
  }
  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('send_message', {
      p_conversation_id: body.conversation_id,
      p_body: body.body,
      p_external_message_id: null,
      p_actor_id: caller.uid,
    });
    if (error) {
      return rpcErrorResponse(error);
    }
    if (typeof data !== 'string') {
      return errorResponse(
        'INTERNAL_ERROR',
        'The request could not be processed.',
        500,
      );
    }
    return jsonResponse({ message_id: data }, 201);
  } catch {
    return errorResponse(
      'INTERNAL_ERROR',
      'The request could not be processed.',
      500,
    );
  }
});
