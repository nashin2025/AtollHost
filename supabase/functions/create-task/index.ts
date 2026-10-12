import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

interface TaskBody {
  property_id?: unknown;
  assigned_to?: unknown;
  title?: unknown;
  description?: unknown;
  status?: unknown;
  priority?: unknown;
  due_at?: unknown;
  source?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: TaskBody;
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  if (typeof body.property_id !== 'string' || !isUuid(body.property_id)) {
    return errorResponse('VALIDATION_ERROR', 'property_id is required.', 400);
  }
  if (typeof body.title !== 'string' || body.title.trim().length === 0) {
    return errorResponse('VALIDATION_ERROR', 'title is required.', 400);
  }

  const assignedTo = typeof body.assigned_to === 'string' && isUuid(body.assigned_to) ? body.assigned_to : null;
  const status = typeof body.status === 'string' ? body.status : 'todo';
  const priority = typeof body.priority === 'string' ? body.priority : 'normal';
  const dueAt = typeof body.due_at === 'string' && body.due_at.length > 0 ? body.due_at : null;
  const source = typeof body.source === 'string' ? body.source : null;
  const description = typeof body.description === 'string' ? body.description : null;

  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('create_task', {
      p_property_id: body.property_id,
      p_assigned_to: assignedTo,
      p_title: body.title.trim(),
      p_description: description,
      p_status: status,
      p_priority: priority,
      p_due_at: dueAt,
      p_source: source,
      p_actor_id: caller.uid,
    });
    if (error) return rpcErrorResponse(error);
    if (typeof data !== 'string') return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
    return jsonResponse({ task_id: data }, 201);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});