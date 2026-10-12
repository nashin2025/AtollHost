import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

const sourceValues = new Set([
  'website',
  'booking',
  'walk_in',
  'phone',
  'email',
  'import',
  'other',
]);

interface EnquiryBody {
  enquiry_id?: unknown;
  organization_id?: unknown;
  property_id?: unknown;
  guest_id?: unknown;
  reservation_id?: unknown;
  channel?: unknown;
  source?: unknown;
  topic?: unknown;
  subject?: unknown;
  assigned_to?: unknown;
  follow_up_at?: unknown;
  urgent?: unknown;
  external_id?: unknown;
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
  let body: EnquiryBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request body must be valid JSON.',
      400,
    );
  }
  if (typeof body.organization_id !== 'string' || !isUuid(body.organization_id)) {
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
  const sourceValue =
    body.source === undefined || body.source === null ? null : body.source;
  if (sourceValue !== null) {
    if (typeof sourceValue !== 'string' || !sourceValues.has(sourceValue)) {
      return errorResponse(
        'VALIDATION_ERROR',
        'source must be website, booking, walk_in, phone, email, import, or other.',
        400,
      );
    }
  }
  if (
    body.urgent !== undefined &&
    body.urgent !== null &&
    typeof body.urgent !== 'boolean'
  ) {
    return errorResponse(
      'VALIDATION_ERROR',
      'urgent must be a boolean.',
      400,
    );
  }
  let optionalFields: {
    enquiry_id: string | null;
    guest_id: string | null;
    reservation_id: string | null;
    topic: string | null;
    subject: string | null;
    assigned_to: string | null;
    follow_up_at: string | null;
    external_id: string | null;
  };
  try {
    optionalFields = {
      enquiry_id: optionalUuid(body.enquiry_id),
      guest_id: optionalUuid(body.guest_id),
      reservation_id: optionalUuid(body.reservation_id),
      topic: optionalString(body.topic),
      subject: optionalString(body.subject),
      assigned_to: optionalUuid(body.assigned_to),
      follow_up_at: optionalTimestamp(body.follow_up_at),
      external_id: optionalString(body.external_id),
    };
  } catch {
    return errorResponse(
      'VALIDATION_ERROR',
      'Optional fields must be valid strings, uuids, or timestamps.',
      400,
    );
  }
  const isUpdate = optionalFields.enquiry_id !== null;
  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('upsert_enquiry', {
      p_enquiry_id: optionalFields.enquiry_id,
      p_organization_id: body.organization_id,
      p_property_id: body.property_id,
      p_guest_id: optionalFields.guest_id,
      p_reservation_id: optionalFields.reservation_id,
      p_channel: body.channel,
      p_source: sourceValue,
      p_topic: optionalFields.topic,
      p_subject: optionalFields.subject,
      p_assigned_to: optionalFields.assigned_to,
      p_follow_up_at: optionalFields.follow_up_at,
      p_urgent: body.urgent === undefined ? null : body.urgent,
      p_external_id: optionalFields.external_id,
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
    return jsonResponse({ enquiry_id: data }, isUpdate ? 200 : 201);
  } catch {
    return errorResponse(
      'INTERNAL_ERROR',
      'The request could not be processed.',
      500,
    );
  }
});
