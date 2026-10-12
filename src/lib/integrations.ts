import { invokeFunction } from './api';
import type { SupabaseClient } from './supabase';

export interface Integration {
  id: string;
  organization_id: string;
  property_id: string | null;
  name: string | null;
  provider: string;
  status: 'disconnected' | 'pending' | 'connected' | 'error';
  auth_type: 'api_key' | 'oauth2' | 'basic' | 'bearer' | 'none' | null;
  config_schema: Record<string, unknown>;
  webhook_url: string | null;
  webhook_secret: string | null;
  health_check_url: string | null;
  health_check_interval: string;
  last_health_check: string | null;
  health_status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | null;
  rate_limit_requests: number;
  rate_limit_window: string;
  retry_config: Record<string, unknown>;
  sandbox_mode: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IntegrationForm {
  organization_id: string;
  property_id: string | null;
  name: string;
  provider: string;
  status?: 'disconnected' | 'pending' | 'connected' | 'error';
  auth_type?: 'api_key' | 'oauth2' | 'basic' | 'bearer' | 'none';
  config_schema?: Record<string, unknown>;
  webhook_url?: string | null;
  webhook_secret?: string | null;
  health_check_url?: string | null;
  health_check_interval?: string;
  rate_limit_requests?: number;
  rate_limit_window?: string;
  retry_config?: Record<string, unknown>;
  sandbox_mode?: boolean;
  metadata?: Record<string, unknown>;
}

export interface IntegrationCredential {
  integration_id: string;
  credential_type: 'api_key' | 'oauth_access_token' | 'oauth_refresh_token' | 'client_secret' | 'basic_username' | 'basic_password' | 'webhook_secret';
  value: string;
  expires_at: string | null;
}

export interface IntegrationWebhook {
  id: string;
  integration_id: string;
  url: string;
  events: string[];
  secret_hash: string;
  signature_header: string;
  signature_algorithm: string;
  is_active: boolean;
  retry_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IntegrationEvent {
  id: string;
  integration_id: string;
  direction: 'inbound' | 'outbound';
  event_type: string;
  idempotency_key: string;
  payload: Record<string, unknown>;
  headers: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'replayed';
  response_status: number | null;
  response_body: string | null;
  error: string | null;
  retry_count: number;
  next_retry_at: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface IntegrationHealth {
  id: string;
  integration_id: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency_ms: number | null;
  error: string | null;
  checked_at: string;
}

export async function listIntegrations(
  client: SupabaseClient,
  organizationId: string,
): Promise<Integration[]> {
  const { data, error } = await client
    .from('integrations')
    .select('id, organization_id, property_id, name, provider, status, auth_type, config_schema, webhook_url, webhook_secret, health_check_url, health_check_interval, last_health_check, health_status, rate_limit_requests, rate_limit_window, retry_config, sandbox_mode, metadata, created_at, updated_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Integration[];
}

export async function createIntegration(
  client: SupabaseClient,
  form: IntegrationForm,
): Promise<{ integration_id: string }> {
  return invokeFunction<{ integration_id: string }>(client, 'create-integration', form);
}

export async function updateIntegration(
  client: SupabaseClient,
  integrationId: string,
  updates: Partial<IntegrationForm>,
): Promise<void> {
  const { error } = await client
    .from('integrations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', integrationId);
  if (error) throw new Error(error.message);
}

export async function setIntegrationCredential(
  client: SupabaseClient,
  integrationId: string,
  credentialType: 'api_key' | 'oauth_access_token' | 'oauth_refresh_token' | 'client_secret' | 'basic_username' | 'basic_password' | 'webhook_secret',
  value: string,
  expiresAt: string | null,
): Promise<void> {
  await invokeFunction(client, 'set-integration-credential', {
    integration_id: integrationId,
    credential_type: credentialType,
    value,
    expires_at: expiresAt,
  });
}

export async function createIntegrationWebhook(
  client: SupabaseClient,
  integrationId: string,
  url: string,
  events: string[],
  secretHash: string,
  signatureHeader?: string,
  signatureAlgorithm?: 'hmac-sha256' | 'hmac-sha1' | 'hmac-sha512',
): Promise<{ webhook_id: string }> {
  return invokeFunction<{ webhook_id: string }>(client, 'create-integration-webhook', {
    integration_id: integrationId,
    url,
    events,
    secret_hash: secretHash,
    signature_header: signatureHeader,
    signature_algorithm: signatureAlgorithm,
  });
}

export async function recordIntegrationEvent(
  client: SupabaseClient,
  integrationId: string,
  direction: 'inbound' | 'outbound',
  eventType: string,
  idempotencyKey: string,
  payload: Record<string, unknown>,
  headers: Record<string, unknown> = {},
): Promise<{ event_id: string; idempotency_key: string }> {
  return invokeFunction<{ event_id: string; idempotency_key: string }>(client, 'record-integration-event', {
    integration_id: integrationId,
    direction,
    event_type: eventType,
    idempotency_key: idempotencyKey,
    payload,
    headers,
  });
}

export async function processIntegrationEvent(
  client: SupabaseClient,
  eventId: string,
  handler: string,
): Promise<void> {
  await invokeFunction(client, 'process-integration-event', {
    event_id: eventId,
    handler,
  });
}

export async function recordIntegrationHealth(
  client: SupabaseClient,
  integrationId: string,
  status: 'healthy' | 'degraded' | 'unhealthy',
  latencyMs: number | null,
  error: string | null,
): Promise<void> {
  await invokeFunction(client, 'record-integration-health', {
    integration_id: integrationId,
    status,
    latency_ms: latencyMs,
    error,
  });
}

export async function listIntegrationEvents(
  client: SupabaseClient,
  integrationId: string,
): Promise<IntegrationEvent[]> {
  const { data, error } = await client
    .from('integration_events')
    .select('id, integration_id, direction, event_type, idempotency_key, payload, headers, status, response_status, response_body, error, retry_count, next_retry_at, processed_at, created_at')
    .eq('integration_id', integrationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as IntegrationEvent[];
}

export async function getIntegrationHealth(
  client: SupabaseClient,
  integrationId: string,
): Promise<IntegrationHealth[]> {
  const { data, error } = await client
    .from('integration_health')
    .select('id, integration_id, status, latency_ms, error, checked_at')
    .eq('integration_id', integrationId)
    .order('checked_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as IntegrationHealth[];
}