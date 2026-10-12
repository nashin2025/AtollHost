import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

interface ContentBody {
  property_id?: unknown;
  organization_id?: unknown;
  title?: unknown;
  body?: unknown;
  channel?: unknown;
  source?: unknown;
  status?: unknown;
  scheduled_for?: unknown;
  external_id?: unknown;
  external_url?: unknown;
  metadata?: unknown;
}

const validChannels = new Set(['website','email','social_facebook','social_instagram','social_linkedin','social_x','google_business','booking_engine','other']);
const validSources = new Set(['manual','integration']);
const validStatuses = new Set(['draft','scheduled','published','failed','cancelled']);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: ContentBody;
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  if (typeof body.property_id !== 'string' || !isUuid(body.property_id)) {
    return errorResponse('VALIDATION_ERROR', 'property_id is required.', 400);
  }
  if (typeof body.organization_id !== 'string' || !isUuid(body.organization_id)) {
    return errorResponse('VALIDATION_ERROR', 'organization_id is required.', 400);
  }
  if (typeof body.title !== 'string' || body.title.trim().length === 0) {
    return errorResponse('VALIDATION_ERROR', 'title is required.', 400);
  }
  if (typeof body.channel !== 'string' || !validChannels.has(body.channel)) {
    return errorResponse('VALIDATION_ERROR', 'channel is required and must be valid.', 400);
  }
  if (typeof body.source !== 'string' || !validSources.has(body.source)) {
    return errorResponse('VALIDATION_ERROR', 'source must be manual or integration.', 400);
  }
  const status = typeof body.status === 'string' && validStatuses.has(body.status) ? body.status : 'draft';
  const scheduledFor = typeof body.scheduled_for === 'string' && body.scheduled_for.length > 0 ? body.scheduled_for : null;
  if (status === 'scheduled' && scheduledFor === null) {
    return errorResponse('VALIDATION_ERROR', 'scheduled_for is required when status is scheduled.', 400);
  }

  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('create_content', {
      p_property_id: body.property_id,
      p_organization_id: body.organization_id,
      p_title: body.title.trim(),
      p_body: typeof body.body === 'string' ? body.body : null,
      p_channel: body.channel,
      p_source: body.source,
      p_status: status,
      p_scheduled_for: scheduledFor,
      p_external_id: typeof body.external_id === 'string' && body.external_id.length > 0 ? body.external_id : null,
      p_external_url: typeof body.external_url === 'string' && body.external_url.length > 0 ? body.external_url : null,
      p_metadata: body.metadata ?? {},
      p_created_by: caller.uid,
    });
    if (error) return rpcErrorResponse(error);
    if (typeof data !== 'string') return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
    return jsonResponse({ content_id: data }, 201);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});