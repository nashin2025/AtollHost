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
  if (req.method !== 'PATCH') return methodNotAllowed();

  const caller: Caller | null = await verifyCaller(req);
  if (!caller) return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);

  let body: { job_id?: unknown; status?: unknown; storage_path?: unknown; size_bytes?: unknown; error?: unknown };
  try { body = await req.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }

  if (typeof body.job_id !== 'string' || !isUuid(body.job_id)) {
    return errorResponse('VALIDATION_ERROR', 'job_id is required.', 400);
  }
  if (typeof body.status !== 'string' || !['completed', 'failed'].includes(body.status)) {
    return errorResponse('VALIDATION_ERROR', 'status must be completed or failed.', 400);
  }
  const storagePath = typeof body.storage_path === 'string' && body.storage_path.length > 0 ? body.storage_path : null;
  const sizeBytes = typeof body.size_bytes === 'number' && body.size_bytes >= 0 ? body.size_bytes : null;
  const errorMsg = typeof body.error === 'string' && body.error.length > 0 ? body.error : null;

  try {
    const client = serviceClient();
    const { error } = await client.rpc('complete_backup_job', {
      p_job_id: body.job_id,
      p_status: body.status,
      p_storage_path: storagePath,
      p_size_bytes: sizeBytes,
      p_error: errorMsg,
    });
    if (error) return rpcErrorResponse(error);
    return jsonResponse({ completed: true }, 200);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});