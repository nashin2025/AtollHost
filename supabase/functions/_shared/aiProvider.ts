export interface AiProviderConfig {
  url: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export interface AiChatRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json_object';
}

export interface AiChatResponse {
  content: string;
  finishReason: string | null;
  latencyMs: number;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly code: 'timeout' | 'rate_limited' | 'auth' | 'upstream' | 'unconfigured' | 'parse_error',
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}

export function getAiProviderConfig(): AiProviderConfig | null {
  const url = Deno.env.get('AI_PROVIDER_URL');
  const apiKey = Deno.env.get('AI_PROVIDER_API_KEY');
  const model = Deno.env.get('AI_MODEL');
  if (!url || !apiKey || !model) {
    return null;
  }
  return {
    url: url.replace(/\/$/, ''),
    apiKey,
    model,
    timeoutMs: Number(Deno.env.get('AI_TIMEOUT_MS') ?? '15000'),
  };
}

export async function chatCompletion(
  config: AiProviderConfig,
  request: AiChatRequest,
  signal: AbortSignal,
): Promise<AiChatResponse> {
  const start = performance.now();
  const response = await fetch(`${config.url}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      temperature: request.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? 1024,
      response_format: request.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
    }),
  });
  const latencyMs = Math.round(performance.now() - start);

  if (response.status === 429) {
    throw new AiProviderError('AI provider rate limited', 'rate_limited', 429);
  }
  if (response.status === 401 || response.status === 403) {
    throw new AiProviderError('AI provider authentication failed', 'auth', response.status);
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new AiProviderError(
      `AI provider request failed: ${response.status} ${text}`,
      'upstream',
      response.status,
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? '';
  const finishReason = data?.choices?.[0]?.finish_reason ?? null;
  const usage = data?.usage ? {
    prompt_tokens: data.usage.prompt_tokens,
    completion_tokens: data.usage.completion_tokens,
    total_tokens: data.usage.total_tokens,
  } : undefined;

  if (typeof content !== 'string') {
    throw new AiProviderError('AI provider returned non-string content', 'parse_error');
  }

  return { content, finishReason, latencyMs, usage };
}