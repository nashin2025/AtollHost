import { invokeFunction } from './api';
import type { SupabaseClient } from './supabase';

export interface JourneyTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JourneyTemplateForm {
  organization_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  config: Record<string, unknown>;
}

export async function createJourneyTemplate(
  client: SupabaseClient,
  form: JourneyTemplateForm,
): Promise<{ template_id: string }> {
  return invokeFunction<{ template_id: string }>(client, 'create-journey-template', form);
}

export async function listJourneyTemplates(
  client: SupabaseClient,
  organizationId: string,
): Promise<JourneyTemplate[]> {
  const { data, error } = await client
    .from('journey_templates')
    .select('id, organization_id, name, description, trigger_type, config, is_active, created_by, created_at, updated_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as JourneyTemplate[];
}

export async function updateJourneyTemplate(
  client: SupabaseClient,
  templateId: string,
  updates: Partial<JourneyTemplateForm>,
): Promise<void> {
  const { error } = await client
    .from('journey_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', templateId);
  if (error) throw new Error(error.message);
}

export async function toggleJourneyTemplate(
  client: SupabaseClient,
  templateId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await client
    .from('journey_templates')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', templateId);
  if (error) throw new Error(error.message);
}