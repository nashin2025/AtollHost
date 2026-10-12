import { invokeFunction } from './api';
import type { SupabaseClient } from './supabase';

export interface ReviewResponse {
  id: string;
  review_id: string;
  property_id: string;
  organization_id: string;
  draft_body: string;
  confidence: number | null;
  source_references: ReviewSource[];
  status: 'draft' | 'approved' | 'rejected' | 'published';
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  published_by: string | null;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewSource {
  fact_id: string;
  fact_key: string | null;
  title: string;
  version: number;
}

export interface ReviewResponseForm {
  review_id: string;
  property_id: string;
  organization_id: string;
  draft_body: string;
  confidence: number | null;
  source_references: ReviewSource[];
}

export async function createReviewResponse(
  client: SupabaseClient,
  form: ReviewResponseForm,
): Promise<{ response_id: string }> {
  return invokeFunction<{ response_id: string }>(client, 'create-review-response', form);
}

export async function listReviewResponses(
  client: SupabaseClient,
  reviewId: string,
): Promise<ReviewResponse[]> {
  const { data, error } = await client
    .from('review_responses')
    .select('id, review_id, property_id, organization_id, draft_body, confidence, source_references, status, approved_by, approved_at, published_at, published_by, version, created_by, created_at, updated_at')
    .eq('review_id', reviewId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ReviewResponse[];
}

export async function approveReviewResponse(
  client: SupabaseClient,
  responseId: string,
): Promise<void> {
  const { error } = await client
    .from('review_responses')
    .update({ status: 'approved', approved_by: (await client.auth.getUser()).data.user?.id ?? null, approved_at: new Date().toISOString() })
    .eq('id', responseId);
  if (error) throw new Error(error.message);
}

export async function publishReviewResponse(
  client: SupabaseClient,
  responseId: string,
): Promise<void> {
  const { error } = await client
    .from('review_responses')
    .update({ status: 'published', published_at: new Date().toISOString(), published_by: (await client.auth.getUser()).data.user?.id ?? null })
    .eq('id', responseId);
  if (error) throw new Error(error.message);
}