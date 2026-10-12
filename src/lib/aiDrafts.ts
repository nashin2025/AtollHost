import { invokeFunction } from './api';
import type { SupabaseClient } from './supabase';

export interface AiDraft {
  id: string;
  conversation_id: string;
  property_id: string;
  organization_id: string;
  prompt_version: string;
  provider: string;
  model: string;
  input_context: unknown;
  draft_body: string;
  confidence: number | null;
  source_references: AiDraftSource[];
  status: 'draft' | 'approved' | 'rejected' | 'superseded';
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  revision: number;
  version_hash: string;
  cooldown_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiDraftSource {
  fact_id: string;
  fact_key: string | null;
  title: string;
  version: number;
}

export interface AiDraftUnknownAnswer {
  question: string;
}

export interface GenerateAiDraftInput {
  conversation_id: string;
  property_id: string;
  organization_id: string;
  prompt_version?: string;
}

export interface GenerateAiDraftResult {
  draft_id: string;
  draft_body: string;
  confidence: number;
  source_references: AiDraftSource[];
  unknown_answers: AiDraftUnknownAnswer[];
  policy: {
    unsupported_facts: string[];
    sensitive_topics: string[];
    prompt_injection: boolean;
    action_boundaries: string[];
  };
}

export interface ApproveAiDraftResult {
  message_id: string;
  draft_id: string;
}

// Re-export for convenience
export type { GenerateAiDraftResult as AiDraftPreview };

export async function generateAiDraft(
  client: SupabaseClient,
  input: GenerateAiDraftInput,
): Promise<GenerateAiDraftResult> {
  return invokeFunction<GenerateAiDraftResult>(client, 'generate-ai-draft', input);
}

export async function approveAiDraft(
  client: SupabaseClient,
  draftId: string,
): Promise<ApproveAiDraftResult> {
  return invokeFunction<ApproveAiDraftResult>(client, 'approve-ai-draft', {
    draft_id: draftId,
  });
}

export async function rejectAiDraft(
  client: SupabaseClient,
  draftId: string,
  reason?: string,
): Promise<{ rejected: true }> {
  return invokeFunction<{ rejected: true }>(client, 'reject-ai-draft', {
    draft_id: draftId,
    reason,
  });
}

export async function listAiDrafts(
  client: SupabaseClient,
  conversationId: string,
): Promise<AiDraft[]> {
  const { data, error } = await client
    .from('ai_drafts')
    .select(
      'id, conversation_id, property_id, organization_id, prompt_version, provider, model, input_context, draft_body, confidence, source_references, status, approved_by, approved_at, rejected_by, rejected_at, revision, version_hash, cooldown_until, created_at, updated_at',
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as AiDraft[];
}

export async function getLatestAiDraft(
  client: SupabaseClient,
  conversationId: string,
): Promise<AiDraft | null> {
  const drafts = await listAiDrafts(client, conversationId);
  return drafts[0] ?? null;
}