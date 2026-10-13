import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/States';
import { ErrorState } from '../../components/ui/States';
import { LoadingState } from '../../components/ui/States';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { SelectField } from '../../components/ui/Field';
import { listMyMemberships } from '../../lib/memberships';
import {
  listIntegrationEvents,
  listIntegrations,
  recordIntegrationHealth,
  setIntegrationCredential,
  type Integration,
  type IntegrationEvent,
} from '../../lib/integrations';
import { supabase } from '../../lib/supabase';

const statusTone: Record<string, 'success' | 'warning' | 'info' | 'neutral' | 'danger'> = {
  disconnected: 'neutral',
  pending: 'warning',
  connected: 'success',
  error: 'danger',
};

const healthTone: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
  healthy: 'success',
  degraded: 'warning',
  unhealthy: 'danger',
  unknown: 'neutral',
};

const credentialTypes = [
  { value: 'api_key', label: 'API key' },
  { value: 'oauth_access_token', label: 'OAuth access token' },
  { value: 'oauth_refresh_token', label: 'OAuth refresh token' },
  { value: 'client_secret', label: 'Client secret' },
  { value: 'basic_username', label: 'Basic username' },
  { value: 'basic_password', label: 'Basic password' },
  { value: 'webhook_secret', label: 'Webhook secret' },
];

const healthStatuses = ['healthy', 'degraded', 'unhealthy'] as const;

export function IntegrationsPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [memberships, setMemberships] = useState<
    { organization_id: string; role: string; organization: { name: string } | null }[]
  >([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [rows, setRows] = useState<Integration[]>([]);
  const [selected, setSelected] = useState<Integration | null>(null);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [credentialType, setCredentialType] = useState('api_key');
  const [credentialValue, setCredentialValue] = useState('');
  const [credentialExpiry, setCredentialExpiry] = useState('');
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'unhealthy'>('healthy');
  const [healthLatency, setHealthLatency] = useState('');
  const [healthError, setHealthError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) {
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      setMemberships(await listMyMemberships(supabase));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (hasAuth) {
      void reload();
    }
  }, [hasAuth, reload]);

  useEffect(() => {
    if (status === 'ready' && selectedOrgId === '' && memberships.length > 0) {
      setSelectedOrgId(memberships[0].organization_id);
    }
  }, [status, selectedOrgId, memberships]);

  const reloadIntegrations = useCallback(async () => {
    if (!supabase || selectedOrgId === '') {
      setRows([]);
      return;
    }
    try {
      setRows(await listIntegrations(supabase, selectedOrgId));
    } catch {
      setRows([]);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    if (status !== 'ready' || selectedOrgId === '') {
      return;
    }
    void reloadIntegrations();
  }, [status, selectedOrgId, reloadIntegrations]);

  async function openDetail(integration: Integration) {
    setSelected(integration);
    setCredentialType('api_key');
    setCredentialValue('');
    setCredentialExpiry('');
    setHealthStatus('healthy');
    setHealthLatency('');
    setHealthError('');
    setError(null);
    if (!supabase) {
      return;
    }
    try {
      setEvents(await listIntegrationEvents(supabase, integration.id));
    } catch {
      setEvents([]);
    }
  }

  if (!hasAuth) {
    return (
      <section aria-labelledby="integrations-heading">
        <h1 id="integrations-heading">Integrations</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to view integrations."
        />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="integrations-heading">
        <h1 id="integrations-heading">Integrations</h1>
        <LoadingState label="Loading integrations" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="integrations-heading">
        <h1 id="integrations-heading">Integrations</h1>
        <ErrorState
          message="Integrations could not be loaded. Check your connection and try again."
          onRetry={() => void reload()}
        />
      </section>
    );
  }

  const manageableOrgIds = new Set(
    memberships
      .filter((membership) => membership.role === 'agency_admin')
      .map((membership) => membership.organization_id),
  );
  const canManage = manageableOrgIds.has(selectedOrgId);

  async function handleSaveCredential(event: FormEvent) {
    event.preventDefault();
    if (!supabase || selected === null) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await setIntegrationCredential(
        supabase,
        selected.id,
        credentialType as 'api_key',
        credentialValue,
        credentialExpiry === '' ? null : new Date(credentialExpiry).toISOString(),
      );
      setCredentialValue('');
    } catch (credentialError) {
      setError(credentialError instanceof Error ? credentialError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecordHealth(event: FormEvent) {
    event.preventDefault();
    if (!supabase || selected === null) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await recordIntegrationHealth(
        supabase,
        selected.id,
        healthStatus,
        healthLatency === '' ? null : Number(healthLatency),
        healthError === '' ? null : healthError,
      );
      await reloadIntegrations();
    } catch (healthRecordError) {
      setError(healthRecordError instanceof Error ? healthRecordError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  const eventColumns: Column<IntegrationEvent>[] = [
    {
      key: 'direction',
      header: 'Direction',
      sortValue: (row) => row.direction,
      render: (row) => <Badge status={row.direction} tone={row.direction === 'inbound' ? 'info' : 'neutral'} />,
    },
    {
      key: 'event_type',
      header: 'Event',
      sortValue: (row) => row.event_type,
      render: (row) => row.event_type,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => (
        <Badge
          status={row.status}
          tone={
            row.status === 'completed'
              ? 'success'
              : row.status === 'failed'
                ? 'danger'
                : 'warning'
          }
        />
      ),
    },
    {
      key: 'retries',
      header: 'Retries',
      sortValue: (row) => row.retry_count,
      render: (row) => String(row.retry_count),
    },
    {
      key: 'created_at',
      header: 'Received',
      sortValue: (row) => row.created_at,
      render: (row) => new Date(row.created_at).toLocaleString(),
    },
  ];

  return (
    <section aria-labelledby="integrations-heading">
      <div className="page-header">
        <div>
          <h1 id="integrations-heading">Integrations</h1>
          <p className="page-description">
            The integration registry with honest health states. Credentials are
            stored server-side and never shown back, and a connection is only
            connected once it actually works.
          </p>
        </div>
      </div>

      {memberships.length > 1 && (
        <div className="field">
          <SelectField
            label="Organization"
            value={selectedOrgId}
            onChange={(event) => setSelectedOrgId(event.target.value)}
          >
            {memberships.map((membership) => (
              <option
                key={membership.organization_id}
                value={membership.organization_id}
              >
                {membership.organization?.name ?? 'Organization'}
              </option>
            ))}
          </SelectField>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No integrations yet"
          message="Integrations are provisioned per organization rather than self-served. Ask AtollHost support to enable a provider; it appears here once provisioned."
        />
      ) : (
        <div className="property-grid">
          {rows.map((integration) => (
            <article key={integration.id} className="property-card">
              <header className="scan-card-header">
                <div className="scan-card-title">
                  <h2>{integration.name ?? integration.provider}</h2>
                  <p className="scan-card-url">
                    {integration.provider}
                    {integration.property_id ? ' · property scoped' : ' · organization scoped'}
                    {integration.sandbox_mode ? ' · sandbox' : ''}
                  </p>
                </div>
                <Badge
                  status={integration.status}
                  tone={statusTone[integration.status] ?? 'neutral'}
                />
              </header>
              <dl className="scan-card-meta">
                <div>
                  <dt>Health</dt>
                  <dd>
                    <Badge
                      status={integration.health_status ?? 'unknown'}
                      tone={healthTone[integration.health_status ?? 'unknown']}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Rate limit</dt>
                  <dd>
                    {integration.rate_limit_requests} per {integration.rate_limit_window}
                  </dd>
                </div>
                <div>
                  <dt>Last check</dt>
                  <dd>
                    {integration.last_health_check
                      ? new Date(integration.last_health_check).toLocaleString()
                      : 'Never'}
                  </dd>
                </div>
              </dl>
              <footer className="scan-card-actions">
                <span className="table-secondary">
                  {integration.auth_type
                    ? `Auth: ${integration.auth_type}`
                    : 'Auth: none'}
                </span>
                <Button variant="outline" onClick={() => void openDetail(integration)}>
                  Manage
                </Button>
              </footer>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={selected !== null}
        title={`Manage: ${selected?.name ?? selected?.provider ?? ''}`}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="scanner-detail">
            <h3>Credential</h3>
            <form onSubmit={handleSaveCredential} noValidate>
              <SelectField
                label="Type"
                value={credentialType}
                onChange={(event) => setCredentialType(event.target.value)}
                disabled={!canManage}
              >
                {credentialTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </SelectField>
              <Field
                label="Value"
                optional
                type="password"
                value={credentialValue}
                onChange={(event) => setCredentialValue(event.target.value)}
                helper="Stored encrypted server-side and never displayed again."
              />
              <Field
                label="Expires"
                optional
                type="date"
                value={credentialExpiry}
                onChange={(event) => setCredentialExpiry(event.target.value)}
              />
              {canManage && (
                <div className="dialog-actions">
                  <Button type="submit" loading={submitting}>
                    Save credential
                  </Button>
                </div>
              )}
            </form>

            <h3>Record health check</h3>
            <form onSubmit={handleRecordHealth} noValidate>
              <SelectField
                label="Status"
                value={healthStatus}
                onChange={(event) =>
                  setHealthStatus(event.target.value as 'healthy' | 'degraded' | 'unhealthy')
                }
                disabled={!canManage}
              >
                {healthStatuses.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </SelectField>
              <Field
                label="Latency (ms)"
                optional
                type="number"
                value={healthLatency}
                onChange={(event) => setHealthLatency(event.target.value)}
              />
              <Field
                label="Error"
                optional
                value={healthError}
                onChange={(event) => setHealthError(event.target.value)}
              />
              {canManage && (
                <div className="dialog-actions">
                  <Button type="submit" loading={submitting}>
                    Record health
                  </Button>
                </div>
              )}
            </form>

            <h3>Recent events</h3>
            <DataTable
              columns={eventColumns}
              rows={events}
              rowKey={(row) => row.id}
              emptyMessage="No events recorded yet."
            />

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </Dialog>
    </section>
  );
}
