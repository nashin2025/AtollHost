import { invokeFunction } from './api';
import type { SupabaseClient } from './supabase';

export interface ContentCalendar {
  id: string;
  property_id: string;
  organization_id: string;
  title: string;
  body: string | null;
  channel: string;
  source: 'manual' | 'integration';
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled';
  scheduled_for: string | null;
  published_at: string | null;
  external_id: string | null;
  external_url: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentForm {
  property_id: string;
  organization_id: string;
  title: string;
  body: string | null;
  channel: string;
  source: 'manual' | 'integration';
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled';
  scheduled_for: string | null;
  external_id: string | null;
  external_url: string | null;
  metadata: Record<string, unknown>;
}

export const CONTENT_CHANNELS = [
  'website',
  'email',
  'social_facebook',
  'social_instagram',
  'social_linkedin',
  'social_x',
  'google_business',
  'booking_engine',
  'other',
] as const;

export const CONTENT_SOURCES = ['manual', 'integration'] as const;

export const CONTENT_STATUSES = ['draft', 'scheduled', 'published', 'failed', 'cancelled'] as const;

export async function createContent(
  client: SupabaseClient,
  form: ContentForm,
): Promise<{ content_id: string }> {
  return invokeFunction<{ content_id: string }>(client, 'create-content', form);
}

export async function listContent(
  client: SupabaseClient,
  propertyId: string,
): Promise<ContentCalendar[]> {
  const { data, error } = await client
    .from('content_calendar')
    .select('id, property_id, organization_id, title, body, channel, source, status, scheduled_for, published_at, external_id, external_url, metadata, created_by, updated_by, created_at, updated_at')
    .eq('property_id', propertyId)
    .order('scheduled_for', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ContentCalendar[];
}

export async function updateContentStatus(
  client: SupabaseClient,
  contentId: string,
  status: string,
): Promise<void> {
  const { error } = await client
    .from('content_calendar')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', contentId);
  if (error) throw new Error(error.message);
}