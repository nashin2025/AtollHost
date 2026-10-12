import type { SupabaseClient } from './supabase';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    request_id: string;
    details: unknown[];
  };
}

export class ApiError extends Error {
  readonly code: string;
  readonly requestId: string;

  constructor(body: ApiErrorBody) {
    super(body.error.message);
    this.name = 'ApiError';
    this.code = body.error.code;
    this.requestId = body.error.request_id;
  }
}

export async function invokeFunction<TData>(
  client: SupabaseClient,
  name: string,
  body: object,
): Promise<TData> {
  const { data, error } = await client.functions.invoke<TData>(name, { body });
  if (error) {
    const context = error.context as ApiErrorBody | undefined;
    if (context && typeof context.error === 'object' && context.error !== null) {
      throw new ApiError(context);
    }
    throw new Error(error.message);
  }
  return data as TData;
}
