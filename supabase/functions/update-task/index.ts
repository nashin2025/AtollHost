import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

interface UpdateTaskBody {
  task_id?: unknown;
  property_id?: unknown;
  assigned_to?: unknown;
  title?: unknown;
  description?: unknown;
  status?: unknown;
  priority?: unknown;
  due_at?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'PATCH') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: UpdateTaskBody;
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  if (typeof body.task_id !== 'string' || !isUuid(body.task_id)) {
    return errorResponse('VALIDATION_ERROR', 'task_id is required.', 400);
  }
  if (typeof body.property_id !== 'string' || !isUuid(body.property_id)) {
    return errorResponse('VALIDATION_ERROR', 'property_id is required.', 400);
  }

  try {
    const client = serviceClient();
    const { error } = await client.rpc('update_task', {
      p_task_id: body.task_id,
      p_property_id: body.property_id,
      p_assigned_to: typeof body.assigned_to === 'string' && isUuid(body.assigned_to) ? body.assigned_to : null,
      p_title: typeof body.title === 'string' && body.title.trim().length > 0 ? body.title.trim() : null,
      p_description: typeof body.description === 'string' ? body.description : null,
      p_status: typeof body.status === 'string' ? body.status : null,
      p_priority: typeof body.priority === 'string' ? body.priority : null,
      p_due_at: typeof body.due_at === 'string' && body.due_at.length > 0 ? body.due_at : null,
      p_actor_id: caller.uid,
    });
    if (error) return rpcErrorResponse(error);
    return jsonResponse({ updated: true }, 200);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});