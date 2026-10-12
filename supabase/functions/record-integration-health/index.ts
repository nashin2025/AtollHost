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

  // Health check can be called by service role or authenticated users
  await verifyCaller(req).catch(() => null);
  const auth = req.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  const integrationId = typeof body.integration_id === 'string' ? body.integration_id : null;
  if (!integrationId || !isUuid(integrationId)) {
    return errorResponse('VALIDATION_ERROR', 'integration_id is required.', 400);
  }
  if (typeof body.status !== 'string' || !['healthy', 'degraded', 'unhealthy'].includes(body.status)) {
    return errorResponse('VALIDATION_ERROR', 'status must be healthy, degraded, or unhealthy.', 400);
  }
  const latencyMs = typeof body.latency_ms === 'number' && body.latency_ms >= 0 ? body.latency_ms : null;
  const errorMsg = typeof body.error === 'string' && body.error.length > 0 ? body.error : null;

  try {
    const client = serviceClient();
    const { error } = await client.rpc('record_integration_health', {
      p_integration_id: integrationId,
      p_status: body.status,
      p_latency_ms: latencyMs,
      p_error: errorMsg,
    });
    if (error) return rpcErrorResponse(error);
    return jsonResponse({ recorded: true }, 201);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});