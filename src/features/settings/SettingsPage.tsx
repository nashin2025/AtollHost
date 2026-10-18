import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/States';
import { ErrorState } from '../../components/ui/States';
import { LoadingState } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';
import { SelectField } from '../../components/ui/Field';
import { Switch } from '../../components/ui/Switch';
import { listMyMemberships } from '../../lib/memberships';
import {
  getMyProfile,
  listAuditLogs,
  updateMyProfile,
  getAppConfig,
  updateAppConfig,
  type AuditLogEntry,
  type AppConfig,
} from '../../lib/settings';
import { listOrganizationMembers } from '../../lib/properties';
import { supabase } from '../../lib/supabase';

function shortId(value: string | null): string {
  if (value === null) {
    return '—';
  }
  return value.length > 13 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function metadataSummary(metadata: Record<string, unknown>): string {
  const keys = Object.keys(metadata);
  if (keys.length === 0) {
    return '—';
  }
  return keys.join(', ');
}

export function SettingsPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [memberships, setMemberships] = useState<
    { organization_id: string; role: string; organization: { name: string; slug: string } | null }[]
  >([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [profile, setProfile] = useState<{ id: string; full_name: string; email: string | null } | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [auditRows, setAuditRows] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<AppConfig | null>(null);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) {
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const [membershipRows, profileRow] = await Promise.all([
        listMyMemberships(supabase),
        getMyProfile(supabase),
      ]);
      setMemberships(membershipRows);
      setProfile(profileRow);
      setProfileName(profileRow?.full_name ?? '');
      setProfileSaved(false);
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

  const loadAudit = useCallback(async () => {
    if (!supabase || selectedOrgId === '') {
      setAuditRows([]);
      return;
    }
    try {
      const [rows, members] = await Promise.all([
        listAuditLogs(supabase, selectedOrgId),
        listOrganizationMembers(supabase, selectedOrgId),
      ]);
      setAuditRows(rows);
      setMemberCount(members.length);
    } catch {
      setAuditRows([]);
    }
  }, [selectedOrgId]);

  const loadAiConfig = useCallback(async () => {
    if (!supabase || selectedOrgId === '') {
      setAiConfig(null);
      return;
    }
    try {
      const config = await getAppConfig(supabase, selectedOrgId);
      setAiConfig(config);
    } catch {
      setAiConfig(null);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    if (status !== 'ready' || selectedOrgId === '') {
      return;
    }
    void loadAudit();
    void loadAiConfig();
  }, [status, selectedOrgId, loadAudit, loadAiConfig]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="settings-heading">
        <h1 id="settings-heading">Settings</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to view settings."
        />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="settings-heading">
        <h1 id="settings-heading">Settings</h1>
        <LoadingState label="Loading settings" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="settings-heading">
        <h1 id="settings-heading">Settings</h1>
        <ErrorState
          message="Settings could not be loaded. Check your connection and try again."
          onRetry={() => void reload()}
        />
      </section>
    );
  }

  const selectedMembership =
    memberships.find((row) => row.organization_id === selectedOrgId) ?? null;

  const visibleAudit = auditRows.filter((row) => {
    if (search.trim() === '') {
      return true;
    }
    const query = search.trim().toLowerCase();
    return [
      row.action,
      row.entity_type,
      row.entity_id,
    ]
      .filter((value): value is string => value !== null)
      .map((value) => value.toLowerCase())
      .join(' ')
      .includes(query);
  });

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateMyProfile(supabase, profileName);
      setProfileSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : null);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAiConfig(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !aiConfig || selectedOrgId === '') {
      return;
    }
    setAiSaving(true);
    setAiError(null);
    try {
      await updateAppConfig(supabase, selectedOrgId, {
        ai_enabled: aiConfig.ai_enabled,
        ai_model: aiConfig.ai_model ?? null,
        ai_temperature: aiConfig.ai_temperature ?? null,
      });
    } catch (saveError) {
      setAiError(saveError instanceof Error ? saveError.message : 'Failed to save AI settings');
    } finally {
      setAiSaving(false);
    }
  }

  const auditColumns: Column<AuditLogEntry>[] = [
    {
      key: 'action',
      header: 'Action',
      sortValue: (row) => row.action,
      render: (row) => <p className="table-primary">{row.action}</p>,
    },
    {
      key: 'entity',
      header: 'Entity',
      sortValue: (row) => row.entity_type ?? '',
      render: (row) => (
        <div>
          <p className="table-primary">{row.entity_type ?? '—'}</p>
          <p className="table-secondary">{shortId(row.entity_id)}</p>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      sortValue: (row) => row.actor_user_id ?? '',
      render: (row) => shortId(row.actor_user_id),
    },
    {
      key: 'metadata',
      header: 'Metadata',
      sortValue: (row) => metadataSummary(row.metadata),
      render: (row) => metadataSummary(row.metadata),
    },
    {
      key: 'created_at',
      header: 'When',
      sortValue: (row) => row.created_at,
      render: (row) => new Date(row.created_at).toLocaleString(),
    },
  ];

  return (
    <section aria-labelledby="settings-heading">
      <h1 id="settings-heading">Settings</h1>
      <p className="page-description">
        Your profile, the organizations you belong to, and the audit trail of
        actions taken in them.
      </p>

      <h2 className="overview-heading">Your profile</h2>
      <form onSubmit={handleSaveProfile} noValidate>
        <Field
          label="Email"
          value={profile?.email ?? ''}
          onChange={() => undefined}
          disabled
        />
        <Field
          label="Display name"
          value={profileName}
          onChange={(event) => {
            setProfileName(event.target.value);
            setProfileSaved(false);
          }}
          required
        />
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button type="submit" loading={saving}>
            Save profile
          </Button>
          {profileSaved && <span className="stat-context">Saved.</span>}
        </div>
      </form>

      {memberships.length > 1 && (
        <>
          <h2 className="overview-heading">Organization</h2>
          <div className="field">
            <SelectField
              label="Viewing"
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
        </>
      )}

      {selectedMembership && (
        <dl className="scan-card-meta">
          <div>
            <dt>Name</dt>
            <dd>{selectedMembership.organization?.name ?? '—'}</dd>
          </div>
          <div>
            <dt>Slug</dt>
            <dd>{selectedMembership.organization?.slug ?? '—'}</dd>
          </div>
          <div>
            <dt>Your role</dt>
            <dd>{selectedMembership.role.replace(/_/g, ' ')}</dd>
          </div>
          <div>
            <dt>Members</dt>
            <dd>{memberCount === null ? '—' : String(memberCount)}</dd>
          </div>
        </dl>
      )}
      <p className="stat-context">
        Organization details are read-only here. Contact support to change the
        name or slug.
      </p>

      {selectedMembership && (selectedMembership.role === 'owner' || selectedMembership.role === 'admin') && (
        <>
          <h2 className="overview-heading">AI features</h2>
          <p className="page-description">
            Control AI-assisted draft generation for this organization. When disabled,
            no drafts are generated and no data is sent to AI providers.
          </p>
          {aiConfig !== null && (
            <form onSubmit={handleSaveAiConfig} noValidate>
              <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <Switch
                  checked={aiConfig?.ai_enabled ?? false}
                  onChange={(checked) =>
                    setAiConfig((prev) =>
                      prev
                        ? { ...prev, ai_enabled: checked }
                        : {
                            ai_enabled: checked,
                            ai_model: null,
                            ai_temperature: null,
                            created_at: '',
                            updated_at: '',
                            org_id: selectedOrgId,
                          }
                    )}
                  disabled={aiSaving}
                />
                <div>
                  <label className="field-label">Enable AI draft generation</label>
                  <p className="field-helper">Allow AI to generate response drafts using verified Property Brain facts.</p>
                </div>
              </div>
              {aiConfig.ai_enabled && (
                <>
                  <div className="field">
                    <Field
                      label="AI model"
                      value={aiConfig.ai_model ?? ''}
                      onChange={(e) => setAiConfig((prev) => prev ? { ...prev, ai_model: e.target.value } : null)}
                      placeholder="e.g. gpt-4o, claude-3-sonnet"
                      optional
                    />
                    <p className="field-helper">Leave blank to use the default model.</p>
                  </div>
                  <div className="field">
                    <Field
                      label="Temperature"
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={aiConfig.ai_temperature ?? ''}
                      onChange={(e) => setAiConfig((prev) => prev ? { ...prev, ai_temperature: parseFloat(e.target.value) || null } : null)}
                      placeholder="0.7"
                      optional
                    />
                    <p className="field-helper">Controls randomness. Lower = more deterministic. Range: 0.0 – 2.0.</p>
                  </div>
                </>
              )}
              {aiError && <p className="auth-error" role="alert">{aiError}</p>}
              <div className="dialog-actions">
                <Button type="submit" loading={aiSaving} disabled={!aiConfig?.ai_enabled && aiConfig !== null}>
                  Save AI settings
                </Button>
                {aiConfig !== null && !aiSaving && <span className="stat-context">Saved.</span>}
              </div>
            </form>
          )}
          {aiConfig === null && !aiSaving && (
            <p className="stat-context">AI settings not configured yet. Save to create initial configuration.</p>
          )}
        </>
      )}

      <h2 className="overview-heading">Audit log</h2>
      <div className="field">
        <Field
          label="Search audit log"
          type="search"
          placeholder="Action, entity type, or entity id"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          optional
        />
      </div>
      <DataTable
        columns={auditColumns}
        rows={visibleAudit}
        rowKey={(row) => row.id}
        emptyMessage="No audit entries yet for this organization."
      />
    </section>
  );
}
