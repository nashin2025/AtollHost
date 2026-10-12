import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

interface ReviewResponseBody {
  review_id?: unknown;
  property_id?: unknown;
  organization_id?: unknown;
  draft_body?: unknown;
  confidence?: unknown;
  source_references?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: ReviewResponseBody;
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  if (typeof body.review_id !== 'string' || !isUuid(body.review_id)) {
    return errorResponse('VALIDATION_ERROR', 'review_id is required.', 400);
  }
  if (typeof body.property_id !== 'string' || !isUuid(body.property_id)) {
    return errorResponse('VALIDATION_ERROR', 'property_id is required.', 400);
  }
  if (typeof body.organization_id !== 'string' || !isUuid(body.organization_id)) {
    return errorResponse('VALIDATION_ERROR', 'organization_id is required.', 400);
  }
  if (typeof body.draft_body !== 'string' || body.draft_body.trim().length === 0) {
    return errorResponse('VALIDATION_ERROR', 'draft_body is required.', 400);
  }
  const confidence = typeof body.confidence === 'number' && body.confidence >= 0 && body.confidence <= 1 ? body.confidence : null;
  const sourceReferences = Array.isArray(body.source_references) ? body.source_references : [];

  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('create_review_response', {
      p_review_id: body.review_id,
      p_property_id: body.property_id,
      p_organization_id: body.organization_id,
      p_draft_body: body.draft_body.trim(),
      p_confidence: confidence,
      p_source_references: sourceReferences,
      p_created_by: caller.uid,
    });
    if (error) return rpcErrorResponse(error);
    if (typeof data !== 'string') return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
    return jsonResponse({ response_id: data }, 201);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});