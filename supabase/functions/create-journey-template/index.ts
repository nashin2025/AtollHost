import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

interface JourneyTemplateBody {
  organization_id?: unknown;
  name?: unknown;
  description?: unknown;
  trigger_type?: unknown;
  config?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: JourneyTemplateBody;
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  if (typeof body.organization_id !== 'string' || !isUuid(body.organization_id)) {
    return errorResponse('VALIDATION_ERROR', 'organization_id is required.', 400);
  }
  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    return errorResponse('VALIDATION_ERROR', 'name is required.', 400);
  }
  if (typeof body.trigger_type !== 'string' || body.trigger_type.trim().length === 0) {
    return errorResponse('VALIDATION_ERROR', 'trigger_type is required.', 400);
  }

  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('create_journey_template', {
      p_organization_id: body.organization_id,
      p_name: body.name.trim(),
      p_description: typeof body.description === 'string' && body.description.length > 0 ? body.description : null,
      p_trigger_type: body.trigger_type.trim(),
      p_config: body.config ?? {},
      p_created_by: caller.uid,
    });
    if (error) return rpcErrorResponse(error);
    if (typeof data !== 'string') return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
    return jsonResponse({ template_id: data }, 201);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});