import type { SupabaseClient } from './supabase';

export interface Automation {
  id: string;
  property_id: string;
  name: string;
  trigger_type: string;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  property?: { name: string } | null;
}

export interface AutomationRun {
  id: string;
  automation_id: string;
  status: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
  automation?: { name: string } | null;
}

export const AUTOMATION_TRIGGERS = [
  'enquiry_created',
  'message_received',
  'review_received',
  'reservation_created',
  'task_due',
  'scheduled',
] as const;

export async function listAutomations(
  client: SupabaseClient,
  propertyId: string,
): Promise<Automation[]> {
  const { data, error } = await client
    .from('automations')
    .select('id, property_id, name, trigger_type, enabled, config, created_at, updated_at, property:properties(name)')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as Automation[];
}

export async function listAutomationRuns(
  client: SupabaseClient,
  automationId: string,
  limit = 20,
): Promise<AutomationRun[]> {
  const { data, error } = await client
    .from('automation_runs')
    .select('id, automation_id, status, input, output, error, started_at, finished_at')
    .eq('automation_id', automationId)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as AutomationRun[];
}

export interface CreateAutomationInput {
  property_id: string;
  name: string;
  trigger_type: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export async function createAutomation(
  client: SupabaseClient,
  input: CreateAutomationInput,
): Promise<Automation> {
  const { data, error } = await client
    .from('automations')
    .insert({
      property_id: input.property_id,
      name: input.name,
      trigger_type: input.trigger_type,
      enabled: input.enabled ?? true,
      config: input.config ?? {},
    })
    .select('id, property_id, name, trigger_type, enabled, config, created_at, updated_at, property:properties(name)')
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as Automation;
}

export async function updateAutomation(
  client: SupabaseClient,
  automationId: string,
  input: Partial<Omit<CreateAutomationInput, 'property_id'>>,
): Promise<Automation> {
  const { data, error } = await client
    .from('automations')
    .update(input)
    .eq('id', automationId)
    .select('id, property_id, name, trigger_type, enabled, config, created_at, updated_at, property:properties(name)')
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as Automation;
}

export async function toggleAutomation(
  client: SupabaseClient,
  automationId: string,
  enabled: boolean,
): Promise<Automation> {
  return updateAutomation(client, automationId, { enabled });
}