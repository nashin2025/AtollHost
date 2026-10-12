import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

const statusValues = new Set(['active', 'paused', 'onboarding', 'archived']);

interface PropertyBody {
  property_id?: unknown;
  organization_id?: unknown;
  name?: unknown;
  island?: unknown;
  atoll?: unknown;
  phone?: unknown;
  email?: unknown;
  address?: unknown;
  status?: unknown;
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
  let body: PropertyBody;
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
  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Property name is required.',
      400,
    );
  }
  if (typeof body.island !== 'string' || body.island.trim().length === 0) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Island is required.',
      400,
    );
  }
  const statusValue =
    body.status === undefined || body.status === null ? null : body.status;
  if (statusValue !== null) {
    if (typeof statusValue !== 'string') {
      return errorResponse(
        'VALIDATION_ERROR',
        'status must be a valid property status.',
        400,
      );
    }
    if (!statusValues.has(statusValue)) {
      return errorResponse(
        'VALIDATION_ERROR',
        'status must be a valid property status.',
        400,
      );
    }
  }
  let optionalFields: {
    atoll: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  try {
    optionalFields = {
      atoll: optionalString(body.atoll),
      phone: optionalString(body.phone),
      email: optionalString(body.email),
      address: optionalString(body.address),
    };
  } catch {
    return errorResponse(
      'VALIDATION_ERROR',
      'Optional fields must be strings.',
      400,
    );
  }
  const propertyId =
    body.property_id === undefined || body.property_id === null
      ? null
      : body.property_id;
  if (propertyId !== null && typeof propertyId !== 'string') {
    return errorResponse(
      'VALIDATION_ERROR',
      'property_id must be a uuid.',
      400,
    );
  }
  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('upsert_property', {
      p_property_id: propertyId,
      p_organization_id: body.organization_id,
      p_name: body.name,
      p_island: body.island,
      p_atoll: optionalFields.atoll,
      p_phone: optionalFields.phone,
      p_email: optionalFields.email,
      p_address: optionalFields.address,
      p_status: statusValue,
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
    return jsonResponse({ property_id: data }, propertyId === null ? 201 : 200);
  } catch {
    return errorResponse(
      'INTERNAL_ERROR',
      'The request could not be processed.',
      500,
    );
  }
});
