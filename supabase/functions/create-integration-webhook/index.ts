import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

interface WebhookBody {
  integration_id?: unknown;
  url?: unknown;
  events?: unknown;
  secret_hash?: unknown;
  signature_header?: unknown;
  signature_algorithm?: unknown;
}

const VALID_ALGORITHMS = new Set(['hmac-sha256', 'hmac-sha1', 'hmac-sha512']);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: WebhookBody;
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  if (typeof body.integration_id !== 'string' || !isUuid(body.integration_id)) {
    return errorResponse('VALIDATION_ERROR', 'integration_id is required.', 400);
  }
  if (typeof body.url !== 'string' || body.url.length === 0) {
    return errorResponse('VALIDATION_ERROR', 'url is required.', 400);
  }
  if (!Array.isArray(body.events) || body.events.length === 0) {
    return errorResponse('VALIDATION_ERROR', 'events must be a non-empty array.', 400);
  }
  if (typeof body.secret_hash !== 'string' || body.secret_hash.length === 0) {
    return errorResponse('VALIDATION_ERROR', 'secret_hash is required.', 400);
  }
  const signatureHeader = typeof body.signature_header === 'string' && body.signature_header.length > 0
    ? body.signature_header
    : 'x-webhook-signature';
  const signatureAlgorithm = typeof body.signature_algorithm === 'string' && VALID_ALGORITHMS.has(body.signature_algorithm)
    ? body.signature_algorithm
    : 'hmac-sha256';

  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('create_integration_webhook', {
      p_integration_id: body.integration_id,
      p_url: body.url,
      p_events: body.events,
      p_secret_hash: body.secret_hash,
      p_signature_header: signatureHeader,
      p_signature_algorithm: signatureAlgorithm,
      p_actor_id: caller.uid,
    });
    if (error) return rpcErrorResponse(error);
    if (typeof data !== 'string') return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
    return jsonResponse({ webhook_id: data }, 201);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});