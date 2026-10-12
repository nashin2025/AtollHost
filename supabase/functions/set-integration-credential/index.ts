import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

interface CredentialBody {
  integration_id?: unknown;
  credential_type?: unknown;
  value?: unknown;
  expires_at?: unknown;
}

const VALID_CREDENTIAL_TYPES = new Set([
  'api_key',
  'oauth_access_token',
  'oauth_refresh_token',
  'client_secret',
  'basic_username',
  'basic_password',
  'webhook_secret',
]);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: CredentialBody;
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  if (typeof body.integration_id !== 'string' || !isUuid(body.integration_id)) {
    return errorResponse('VALIDATION_ERROR', 'integration_id is required.', 400);
  }
  if (typeof body.credential_type !== 'string' || !VALID_CREDENTIAL_TYPES.has(body.credential_type)) {
    return errorResponse('VALIDATION_ERROR', 'credential_type is required and must be valid.', 400);
  }
  if (typeof body.value !== 'string' || body.value.length === 0) {
    return errorResponse('VALIDATION_ERROR', 'value is required.', 400);
  }
  const expiresAt = typeof body.expires_at === 'string' && body.expires_at.length > 0 ? body.expires_at : null;

  try {
    const client = serviceClient();
    const { error } = await client.rpc('set_integration_credential', {
      p_integration_id: body.integration_id,
      p_credential_type: body.credential_type,
      p_value: body.value,
      p_expires_at: expiresAt,
      p_actor_id: caller.uid,
    });
    if (error) return rpcErrorResponse(error);
    return jsonResponse({ saved: true }, 201);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});