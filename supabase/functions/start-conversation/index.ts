import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

interface ConversationBody {
  organization_id?: unknown;
  property_id?: unknown;
  enquiry_id?: unknown;
  channel?: unknown;
  guest_body?: unknown;
  external_thread_id?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error('not-a-string');
  }
  return value.length === 0 ? null : value;
}

function optionalUuid(value: unknown): string | null {
  const result = optionalString(value);
  if (result !== null && !isUuid(result)) {
    throw new Error('not-a-uuid');
  }
  return result;
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
  let body: ConversationBody;
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
    typeof body.organization_id !== 'string' ||
    !isUuid(body.organization_id)
  ) {
    return errorResponse(
      'VALIDATION_ERROR',
      'organization_id is required.',
      400,
    );
  }
  if (typeof body.property_id !== 'string' || !isUuid(body.property_id)) {
    return errorResponse(
      'VALIDATION_ERROR',
      'property_id is required.',
      400,
    );
  }
  if (typeof body.channel !== 'string' || body.channel.trim().length === 0) {
    return errorResponse(
      'VALIDATION_ERROR',
      'channel is required.',
      400,
    );
  }
  let enquiryId: string | null;
  let guestBody: string | null;
  let externalThreadId: string | null;
  try {
    enquiryId = optionalUuid(body.enquiry_id);
    guestBody = optionalString(body.guest_body);
    externalThreadId = optionalString(body.external_thread_id);
  } catch {
    return errorResponse(
      'VALIDATION_ERROR',
      'Optional fields must be valid strings or uuids.',
      400,
    );
  }
  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('start_conversation', {
      p_organization_id: body.organization_id,
      p_property_id: body.property_id,
      p_enquiry_id: enquiryId,
      p_channel: body.channel,
      p_guest_body: guestBody,
      p_external_thread_id: externalThreadId,
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
    return jsonResponse({ conversation_id: data }, 201);
  } catch {
    return errorResponse(
      'INTERNAL_ERROR',
      'The request could not be processed.',
      500,
    );
  }
});
