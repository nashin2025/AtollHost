import { jsonResponse, newRequestId } from './cors.ts';

export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
): Response {
  return jsonResponse(
    {
      error: {
        code,
        message,
        request_id: newRequestId(),
        details: [],
      },
    },
    status,
  );
}

const rpcErrorMap: Record<string, { code: ErrorCode; status: number }> = {
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 400 },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404 },
  CONFLICT: { code: 'CONFLICT', status: 409 },
};

export function isRpcErrorCode(prefix: string): boolean {
  return prefix in rpcErrorMap;
}

export function rpcErrorResponse(error: unknown): Response {
  const candidate = error instanceof Error
    ? error.message
    : (error as { message?: unknown } | null | undefined)?.message;
  const message = typeof candidate === 'string' ? candidate : String(error);
  const separator = message.indexOf(':');
  const prefix = separator === -1 ? message : message.slice(0, separator);
  const mapped = rpcErrorMap[prefix];
  if (mapped) {
    const detail = separator === -1 ? '' : message.slice(separator + 1).trim();
    return errorResponse(mapped.code, detail || message, mapped.status);
  }
  return errorResponse(
    'INTERNAL_ERROR',
    'The request could not be processed.',
    500,
  );
}
