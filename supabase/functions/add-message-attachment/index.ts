import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

const mimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
]);

const maxSizeBytes = 26214400;

interface AttachmentBody {
  message_id?: unknown;
  storage_path?: unknown;
  mime_type?: unknown;
  size_bytes?: unknown;
  checksum?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error('not-a-string');
  }
  return value.length === 0 ? null : value;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }
  if (req.method !== 'POST') {
    return methodNotAllowed();
  }
  const caller: Caller | null = await verifyCaller(req);
  if (!caller) {
    return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);
  }
  let body: AttachmentBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request body must be valid JSON.',
      400,
    );
  }
  if (typeof body.message_id !== 'string' || !isUuid(body.message_id)) {
    return errorResponse(
      'VALIDATION_ERROR',
      'message_id is required.',
      400,
    );
  }
  if (
    typeof body.storage_path !== 'string' ||
    body.storage_path.trim().length === 0
  ) {
    return errorResponse(
      'VALIDATION_ERROR',
      'storage_path is required.',
      400,
    );
  }
  if (
    typeof body.mime_type !== 'string' ||
    !mimeTypes.has(body.mime_type)
  ) {
    return errorResponse(
      'VALIDATION_ERROR',
      'mime_type is not allowed.',
      400,
    );
  }
  if (
    typeof body.size_bytes !== 'number' ||
    !Number.isFinite(body.size_bytes) ||
    body.size_bytes <= 0 ||
    body.size_bytes > maxSizeBytes
  ) {
    return errorResponse(
      'VALIDATION_ERROR',
      'size_bytes must be between 1 and 26214400.',
      400,
    );
  }
  let checksum: string | null;
  try {
    checksum = optionalString(body.checksum);
  } catch {
    return errorResponse(
      'VALIDATION_ERROR',
      'checksum must be a string.',
      400,
    );
  }
  if (checksum !== null && !/^[0-9a-f]{64}$/.test(checksum)) {
    return errorResponse(
      'VALIDATION_ERROR',
      'checksum must be a SHA-256 hex digest.',
      400,
    );
  }
  try {
    const client = serviceClient();
    const { data, error } = await client.rpc('add_message_attachment', {
      p_message_id: body.message_id,
      p_storage_path: body.storage_path,
      p_mime_type: body.mime_type,
      p_size_bytes: body.size_bytes,
      p_checksum: checksum,
      p_actor_id: caller.uid,
    });
    if (error) {
      return rpcErrorResponse(error);
    }
    if (typeof data !== 'string') {
      return errorResponse(
        'INTERNAL_ERROR',
        'The request could not be processed.',
        500,
      );
    }
    return jsonResponse({ attachment_id: data }, 201);
  } catch {
    return errorResponse(
      'INTERNAL_ERROR',
      'The request could not be processed.',
      500,
    );
  }
});
