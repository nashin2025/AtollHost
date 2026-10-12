import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';
import { getAiProviderConfig, chatCompletion, AiProviderError } from '../_shared/aiProvider.ts';
import { validateDraftPolicy, AiDraftStructuredOutput } from '../_shared/policyValidator.ts';

const PROMPT_VERSION = 'v1.0';

interface GenerateBody {
  conversation_id?: unknown;
  property_id?: unknown;
  organization_id?: unknown;
  prompt_version?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function getSystemPrompt(): string {
  // In production, fetch from ai_prompt_versions table.
  // For MVP, use the seeded prompt.
  return `You are an AI assistant for a guesthouse management system. Your role is to propose replies to guest messages using ONLY the provided knowledge facts.

Rules:
1. Use ONLY the facts provided in the "Grounded Knowledge" section. Do not use any external knowledge.
2. If a guest asks about something not covered by the facts, respond with "I don't know" or "Let me check with the team" -- do not invent information.
3. Every factual claim in your reply MUST reference a fact_key from the provided facts. Include citations like [fact_key] in your draft.
4. Do not promise actions (bookings, cancellations, payments, sending documents). Only provide information.
5. Do not include legal, medical, or financial advice.
6. Respond with ONLY a JSON object matching this schema:
{
  "draft_body": "string",
  "confidence": 0.0-1.0,
  "source_references": [{"fact_id": "uuid", "fact_key": "string|null", "title": "string", "version": int}],
  "unknown_answers": [{"question": "string"}]
}
7. If you cannot answer from the facts, set draft_body to an appropriate "I don't know" response, confidence to 0.0, source_references to [], and populate unknown_answers.`;
}

function buildUserPrompt(
  facts: Array<{ id: string; fact_key: string | null; title: string; version: number; content: string }>,
  messages: Array<{ role: string; body: string; created_at: string }>,
  guestMessage: string,
): string {
  const factLines = facts.map((f) =>
    `- [${f.fact_key ?? 'no-key'}] ${f.title} (v${f.version}): ${f.content}`
  ).join('\n');

  const historyLines = messages.slice(-10).map((m) =>
    `[${m.role}] ${m.body}`
  ).join('\n');

  return `Grounded Knowledge:
${factLines || '(no facts available)'}

Conversation History (most recent last):
${historyLines || '(no history)'}

Guest's latest message:
${guestMessage}

Respond with ONLY the JSON object.`;
}

function parseStructuredOutput(content: string): AiDraftStructuredOutput {
  try {
    const parsed = JSON.parse(content);
    // Validate required fields
    if (
      typeof parsed.draft_body !== 'string' ||
      typeof parsed.confidence !== 'number' ||
      !Array.isArray(parsed.source_references) ||
      !Array.isArray(parsed.unknown_answers)
    ) {
      throw new Error('missing required fields');
    }
    // Clamp confidence
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));
    return parsed;
  } catch {
    // Fallback: treat entire response as draft_body with low confidence
    return {
      draft_body: content.trim(),
      confidence: 0.1,
      source_references: [],
      unknown_answers: [],
    };
  }
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

  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400);
  }

  if (
    typeof body.conversation_id !== 'string' || !isUuid(body.conversation_id) ||
    typeof body.property_id !== 'string' || !isUuid(body.property_id) ||
    typeof body.organization_id !== 'string' || !isUuid(body.organization_id)
  ) {
    return errorResponse(
      'VALIDATION_ERROR',
      'conversation_id, property_id, and organization_id are required UUIDs.',
      400,
    );
  }

  const promptVersion = typeof body.prompt_version === 'string' && body.prompt_version.length > 0
    ? body.prompt_version
    : PROMPT_VERSION;

  const client = serviceClient();

  try {
    // 1. Validate conversation exists, belongs to property/org, and automation not paused.
    const { data: conversation, error: convError } = await client
      .from('conversations')
      .select('id, property_id, organization_id, human_takeover, automation_paused')
      .eq('id', body.conversation_id)
      .single();

    if (convError || !conversation) {
      return errorResponse('NOT_FOUND', 'Conversation not found.', 404);
    }

    if (conversation.property_id !== body.property_id) {
      return errorResponse('VALIDATION_ERROR', 'Conversation does not belong to this property.', 400);
    }
    if (conversation.organization_id !== body.organization_id) {
      return errorResponse('VALIDATION_ERROR', 'Conversation does not belong to this organization.', 400);
    }
    if (conversation.human_takeover || conversation.automation_paused) {
      return errorResponse(
        'CONFLICT',
        'Cannot generate AI draft: conversation is under human control or automation is paused.',
        409,
      );
    }

    // 2. Retrieve grounded knowledge facts.
    const { data: facts, error: factsError } = await client
      .rpc('retrieve_knowledge_facts', { p_property_id: body.property_id });

    if (factsError) {
      return rpcErrorResponse(factsError);
    }

    const factRows = (facts ?? []) as Array<{
      id: string;
      fact_key: string | null;
      title: string;
      version: number;
      content: string;
    }>;

    // 3. Retrieve recent conversation messages for context.
    const { data: messages, error: msgError } = await client
      .from('conversation_messages')
      .select('role, body, created_at')
      .eq('conversation_id', body.conversation_id)
      .order('created_at', { ascending: true })
      .limit(20);

    if (msgError) {
      return rpcErrorResponse(msgError);
    }

    const msgRows = (messages ?? []) as Array<{ role: string; body: string; created_at: string }>;

    // Find the latest guest message as the primary input.
    const guestMessages = msgRows.filter((m) => m.role === 'guest');
    const guestMessage = guestMessages.length > 0
      ? guestMessages[guestMessages.length - 1].body
      : '(no guest message found)';

    // 4. Get provider config.
    const providerConfig = getAiProviderConfig();
    if (!providerConfig) {
      return errorResponse(
        'INTERNAL_ERROR',
        'AI provider is not configured. Set AI_PROVIDER_URL, AI_PROVIDER_API_KEY, and AI_MODEL secrets.',
        503,
      );
    }

    // 5. Build prompt and call provider with timeout.
    const systemPrompt = getSystemPrompt();
    const userPrompt = buildUserPrompt(factRows, msgRows, guestMessage);

    const controller = new AbortController();
    const timeoutMs = providerConfig.timeoutMs;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let providerResult: { content: string; finishReason: string | null; latencyMs: number; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } };
    let executionError: string | null = null;

    try {
      providerResult = await chatCompletion(providerConfig, {
        systemPrompt,
        userPrompt,
        responseFormat: 'json_object',
      }, controller.signal);
    } catch (e) {
      if (e instanceof AiProviderError) {
        executionError = `${e.code}: ${e.message}`;
      } else if (e instanceof Error) {
        executionError = `timeout: ${e.message}`;
      } else {
        executionError = 'unknown provider error';
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (executionError) {
      // Record execution result in the error response for reconciliation (T6.6)
      return errorResponse(
        'RATE_LIMITED', // or a specific code; RATE_LIMITED triggers client backoff
        `AI generation failed: ${executionError}`,
        502,
      );
    }

    // 6. Parse structured output.
    const structured = parseStructuredOutput(providerResult.content);

    // 7. Run policy validator.
    const knownFactKeys = new Set(factRows.map((f) => f.fact_key).filter((k): k is string => k !== null));
    const policyResult = validateDraftPolicy(structured, {
      knownFactKeys,
      guestMessage,
      conversationHistory: msgRows.map((m) => `${m.role}: ${m.body}`).join('\n'),
    });

    // Build input_context for audit trail.
    const inputContext = {
      prompt_version: promptVersion,
      provider: providerConfig.model, // using model as provider identifier for now
      model: providerConfig.model,
      grounded_facts_count: factRows.length,
      conversation_messages_count: msgRows.length,
      guest_message_preview: guestMessage.slice(0, 200),
      execution: {
        latency_ms: providerResult.latencyMs,
        finish_reason: providerResult.finishReason,
        usage: providerResult.usage,
      },
      policy: {
        allowed: policyResult.allowed,
        flags: policyResult.flags,
      },
    };

    // 8. If policy blocks, reject the draft but still return info for the operator.
    if (!policyResult.allowed) {
      // Store a draft with the policy rejection recorded so operator can see why.
      // But we don't want to create an approvable draft. Return error with details.
      return errorResponse(
        'VALIDATION_ERROR',
        `Draft rejected by policy: ${policyResult.reason}`,
        400,
      );
    }

    // 9. Call create_ai_draft RPC.
    const { data: draftId, error: draftError } = await client.rpc('create_ai_draft', {
      p_conversation_id: body.conversation_id,
      p_property_id: body.property_id,
      p_organization_id: body.organization_id,
      p_prompt_version: promptVersion,
      p_provider: providerConfig.model,
      p_model: providerConfig.model,
      p_input_context: inputContext,
      p_draft_body: structured.draft_body,
      p_confidence: structured.confidence,
      p_source_references: structured.source_references,
      p_actor_id: caller.uid,
    });

    if (draftError) {
      return rpcErrorResponse(draftError);
    }

    if (typeof draftId !== 'string') {
      return errorResponse('INTERNAL_ERROR', 'Failed to create AI draft.', 500);
    }

    return jsonResponse({
      draft_id: draftId,
      draft_body: structured.draft_body,
      confidence: structured.confidence,
      source_references: structured.source_references,
      unknown_answers: structured.unknown_answers,
      policy: policyResult.flags,
    }, 201);

  } catch (e) {
    if (e instanceof AiProviderError) {
      return errorResponse(e.code === 'timeout' ? 'RATE_LIMITED' : 'INTERNAL_ERROR', e.message, 502);
    }
    return errorResponse('INTERNAL_ERROR', 'The request could not be processed.', 500);
  }
});