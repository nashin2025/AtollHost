import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowed();

  // This endpoint can be called without authentication for inbound webhooks
  // The integration_id in the body determines which integration this belongs to
  await verifyCaller(req).catch(() => null);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  const integrationId = typeof body.integration_id === 'string' ? body.integration_id : null;
  if (!integrationId) {
    return errorResponse('VALIDATION_ERROR', 'integration_id is required.', 400);
  }
  if (!isUuid(integrationId)) {
    return errorResponse('VALIDATION_ERROR', 'integration_id must be a valid UUID.', 400);
  }

  const direction = typeof body.direction === 'string' && ['inbound', 'outbound'].includes(body.direction)
    ? body.direction
    : 'inbound';
  const eventType = typeof body.event_type === 'string' && body.event_type.length > 0
    ? body.event_type
    : 'webhook_received';
  const idempotencyKey = typeof body.idempotency_key === 'string' && body.idempotency_key.length > 0
    ? body.idempotency_key
    : crypto.randomUUID();
  const payload = body.payload ?? {};
  const headers = (typeof body.headers === 'object' && body.headers !== null) ? body.headers : {};

  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('record_integration_event', {
      p_integration_id: integrationId,
      p_direction: direction,
      p_event_type: eventType,
      p_idempotency_key: idempotencyKey,
      p_payload: payload,
      p_headers: headers,
    });
    if (error) return rpcErrorResponse(error);
    if (typeof data !== 'string') return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
    return jsonResponse({ event_id: data, idempotency_key: idempotencyKey }, 201);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});