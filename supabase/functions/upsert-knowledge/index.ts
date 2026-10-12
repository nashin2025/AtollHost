import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

const knowledgeSources = new Set(['manual', 'scanner', 'import']);

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
    fact_key?: unknown;
    organization_id?: unknown;
    property_id?: unknown;
    category_id?: unknown;
    title?: unknown;
    content?: unknown;
    source?: unknown;
    expires_at?: unknown;
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
  if (
    typeof body.organization_id !== 'string' ||
    body.organization_id.length === 0
  ) {
    return errorResponse('VALIDATION_ERROR', 'organization_id is required.', 400);
  }
  if (typeof body.property_id !== 'string' || body.property_id.length === 0) {
    return errorResponse('VALIDATION_ERROR', 'property_id is required.', 400);
  }
  if (typeof body.title !== 'string' || body.title.trim().length === 0) {
    return errorResponse('VALIDATION_ERROR', 'title is required.', 400);
  }
  if (typeof body.content !== 'string' || body.content.trim().length === 0) {
    return errorResponse('VALIDATION_ERROR', 'content is required.', 400);
  }
  if (
    body.fact_key !== undefined &&
    body.fact_key !== null &&
    typeof body.fact_key !== 'string'
  ) {
    return errorResponse('VALIDATION_ERROR', 'fact_key must be a string.', 400);
  }
  if (
    body.category_id !== undefined &&
    body.category_id !== null &&
    typeof body.category_id !== 'string'
  ) {
    return errorResponse('VALIDATION_ERROR', 'category_id must be a string.', 400);
  }
  if (
    body.source !== undefined &&
    body.source !== null &&
    (typeof body.source !== 'string' ||
      !knowledgeSources.has(body.source))
  ) {
    return errorResponse(
      'VALIDATION_ERROR',
      'source must be manual, scanner, or import.',
      400,
    );
  }
  let expiresAt: string | null = null;
  if (body.expires_at !== undefined && body.expires_at !== null) {
    if (
      typeof body.expires_at !== 'string' ||
      Number.isNaN(Date.parse(body.expires_at))
    ) {
      return errorResponse(
        'VALIDATION_ERROR',
        'expires_at must be an ISO date.',
        400,
      );
    }
    expiresAt = body.expires_at;
  }
  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('upsert_knowledge_fact', {
      p_fact_key: body.fact_key ?? null,
      p_organization_id: body.organization_id,
      p_property_id: body.property_id,
      p_category_id: body.category_id ?? null,
      p_title: body.title,
      p_content: body.content,
      p_source: body.source ?? null,
      p_expires_at: expiresAt,
      p_actor_id: caller.uid,
    });
    if (error) {
      return rpcErrorResponse(error);
    }
    return jsonResponse({ fact_id: data }, 200);
  } catch {
    return errorResponse(
      'INTERNAL_ERROR',
      'The request could not be processed.',
      500,
    );
  }
});
