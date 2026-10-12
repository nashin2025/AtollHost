import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

interface GetExportBody {
  job_id?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: GetExportBody;
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  if (typeof body.job_id !== 'string' || !isUuid(body.job_id)) {
    return errorResponse('VALIDATION_ERROR', 'job_id is required.', 400);
  }

  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('get_export_job', {
      p_job_id: body.job_id,
      p_actor_id: (await client.auth.getUser()).data.user?.id ?? '',
    });
    if (error) return rpcErrorResponse(error);
    if (!data || data.length === 0) return errorResponse('NOT_FOUND', 'Export job not found.', 404);
    return jsonResponse(data[0], 200);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});