import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

const allowedRoles = new Set([
  'agency_admin',
  'agency_staff',
  'property_owner',
  'property_manager',
  'property_staff',
]);

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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
    organization_id?: unknown;
    email?: unknown;
    role?: unknown;
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
  if (typeof body.organization_id !== 'string') {
    return errorResponse(
      'VALIDATION_ERROR',
      'organization_id is required.',
      400,
    );
  }
  if (typeof body.email !== 'string' || !emailPattern.test(body.email)) {
    return errorResponse(
      'VALIDATION_ERROR',
      'A valid recipient email is required.',
      400,
    );
  }
  if (typeof body.role !== 'string' || !allowedRoles.has(body.role)) {
    return errorResponse(
      'VALIDATION_ERROR',
      'role must be a valid application role.',
      400,
    );
  }
  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('create_invitation', {
      p_organization_id: body.organization_id,
      p_email: body.email,
      p_role: body.role,
      p_actor_id: caller.uid,
    });
    if (error) {
      return rpcErrorResponse(error);
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (
      !row || typeof row.invitation_id !== 'string' || typeof row.token !== 'string'
    ) {
      return errorResponse(
        'INTERNAL_ERROR',
        'The request could not be processed.',
        500,
      );
    }
    return jsonResponse(
      { invitation_id: row.invitation_id, token: row.token },
      201,
    );
  } catch {
    return errorResponse(
      'INTERNAL_ERROR',
      'The request could not be processed.',
      500,
    );
  }
});
