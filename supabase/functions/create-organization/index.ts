import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
  let body: { name?: unknown; slug?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request body must be valid JSON.',
      400,
    );
  }
  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Organization name is required.',
      400,
    );
  }
  if (
    typeof body.slug !== 'string' || !slugPattern.test(body.slug)
  ) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Slug must use lowercase letters, numbers, and single hyphens.',
      400,
    );
  }
  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('create_organization', {
      p_name: body.name,
      p_slug: body.slug,
      p_user_id: caller.uid,
    });
    if (error) {
      return rpcErrorResponse(error);
    }
    return jsonResponse({ organization_id: data }, 201);
  } catch {
    return errorResponse(
      'INTERNAL_ERROR',
      'The request could not be processed.',
      500,
    );
  }
});
