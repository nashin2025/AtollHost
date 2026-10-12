import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

const statusValues = new Set([
  'new',
  'open',
  'waiting',
  'won',
  'lost',
  'closed',
]);

interface UpdateEnquiryBody {
  enquiry_id?: unknown;
  status?: unknown;
  outcome?: unknown;
  follow_up_at?: unknown;
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

function optionalTimestamp(value: unknown): string | null {
  const result = optionalString(value);
  if (result !== null && Number.isNaN(Date.parse(result))) {
    throw new Error('not-a-timestamp');
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
  let body: UpdateEnquiryBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request body must be valid JSON.',
      400,
    );
  }
  if (typeof body.enquiry_id !== 'string' || !isUuid(body.enquiry_id)) {
    return errorResponse(
      'VALIDATION_ERROR',
      'enquiry_id is required.',
      400,
    );
  }
  const statusValue =
    body.status === undefined || body.status === null ? null : body.status;
  if (statusValue !== null) {
    if (typeof statusValue !== 'string' || !statusValues.has(statusValue)) {
      return errorResponse(
        'VALIDATION_ERROR',
        'status must be new, open, waiting, won, lost, or closed.',
        400,
      );
    }
  }
  let outcome: string | null;
  let followUpAt: string | null;
  try {
    outcome = optionalString(body.outcome);
    followUpAt = optionalTimestamp(body.follow_up_at);
  } catch {
    return errorResponse(
      'VALIDATION_ERROR',
      'outcome and follow_up_at must be valid strings.',
      400,
    );
  }
  try {
    const client = serviceClient();
    const { error } = await client.rpc('update_enquiry_status', {
      p_enquiry_id: body.enquiry_id,
      p_status: statusValue,
      p_outcome: outcome,
      p_follow_up_at: followUpAt,
      p_actor_id: caller.uid,
    });
    if (error) {
      return rpcErrorResponse(error);
    }
    return jsonResponse({ updated: true }, 200);
  } catch {
    return errorResponse(
      'INTERNAL_ERROR',
      'The request could not be processed.',
      500,
    );
  }
});
