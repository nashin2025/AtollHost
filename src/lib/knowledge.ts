import { invokeFunction } from './api';
import type { SupabaseClient } from './supabase';

export interface KnowledgeItem {
  id: string;
  property_id: string;
  category_id: string | null;
  title: string;
  content: string;
  verified: boolean;
  active: boolean;
  source: string | null;
  fact_key: string | null;
  version: number;
  superseded_by: string | null;
  status: string;
  expires_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeCategory {
  id: string;
  property_id: string;
  name: string;
  created_at: string;
}

export interface KnowledgeForm {
  fact_key: string | null;
  organization_id: string;
  property_id: string;
  category_id: string | null;
  title: string;
  content: string;
  source: string | null;
  expires_at: string | null;
}

export interface KnowledgeFact {
  id: string;
  fact_key: string | null;
  version: number;
  title: string;
  content: string;
  source: string | null;
  category_id: string | null;
  expires_at: string | null;
  created_at: string;
}

export async function listKnowledgeItems(
  client: SupabaseClient,
  propertyId: string,
): Promise<KnowledgeItem[]> {
  const { data, error } = await client
    .from('knowledge_items')
    .select(
      'id, property_id, category_id, title, content, verified, active, source, fact_key, version, superseded_by, status, expires_at, verified_by, verified_at, reviewed_by, reviewed_at, created_at, updated_at',
    )
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as KnowledgeItem[];
}

export async function listKnowledgeCategories(
  client: SupabaseClient,
  propertyId: string,
): Promise<KnowledgeCategory[]> {
  const { data, error } = await client
    .from('knowledge_categories')
    .select('id, property_id, name, created_at')
    .eq('property_id', propertyId)
    .order('name', { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as KnowledgeCategory[];
}

export async function createKnowledgeFact(
  client: SupabaseClient,
  form: KnowledgeForm,
): Promise<{ fact_id: string }> {
  return invokeFunction<{ fact_id: string }>(
    client,
    'upsert-knowledge',
    form,
  );
}

export async function reviewKnowledgeFact(
  client: SupabaseClient,
  factId: string,
  status: 'pending_review' | 'approved' | 'rejected' | 'expired',
): Promise<{ reviewed: true }> {
  return invokeFunction<{ reviewed: true }>(client, 'review-knowledge', {
    fact_id: factId,
    status,
  });
}

export async function retrieveKnowledgeFacts(
  client: SupabaseClient,
  propertyId: string,
): Promise<KnowledgeFact[]> {
  const { data, error } = await client.rpc('retrieve_knowledge_facts', {
    p_property_id: propertyId,
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as KnowledgeFact[];
}
