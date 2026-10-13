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
import { listProperties, type Property } from '../../lib/properties';
import {
  CONTENT_CHANNELS,
  CONTENT_SOURCES,
  CONTENT_STATUSES,
  createContent,
  listContent,
  updateContentStatus,
  type ContentCalendar,
} from '../../lib/content';
import { supabase } from '../../lib/supabase';

const channelLabels: Record<string, string> = {
  website: 'Website',
  email: 'Email',
  social_facebook: 'Facebook',
  social_instagram: 'Instagram',
  social_linkedin: 'LinkedIn',
  social_x: 'X',
  google_business: 'Google Business',
  booking_engine: 'Booking engine',
  other: 'Other',
};

const statusTone: Record<string, 'success' | 'warning' | 'info' | 'neutral' | 'danger'> = {
  draft: 'neutral',
  scheduled: 'info',
  published: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

interface ContentFormState {
  title: string;
  body: string;
  channel: string;
  source: string;
  status: string;
  scheduledFor: string;
}

const emptyForm: ContentFormState = {
  title: '',
  body: '',
  channel: 'website',
  source: 'manual',
  status: 'draft',
  scheduledFor: '',
};

function scheduleLabel(row: ContentCalendar): string {
  if (row.scheduled_for) {
    return new Date(row.scheduled_for).toLocaleString();
  }
  if (row.published_at) {
    return new Date(row.published_at).toLocaleString();
  }
  return '—';
}

export function ContentPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [properties, setProperties] = useState<Property[]>([]);
  const [memberships, setMemberships] = useState<{ organization_id: string; role: string }[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [rows, setRows] = useState<ContentCalendar[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ContentFormState>(emptyForm);
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
      const [propertyRows, membershipRows] = await Promise.all([
        listProperties(supabase),
        listMyMemberships(supabase),
      ]);
      setProperties(propertyRows);
      setMemberships(membershipRows);
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
    if (status === 'ready' && selectedPropertyId === '' && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [status, selectedPropertyId, properties]);

  const reloadContent = useCallback(async () => {
    if (!supabase || selectedPropertyId === '') {
      setRows([]);
      return;
    }
    try {
      setRows(await listContent(supabase, selectedPropertyId));
    } catch {
      setRows([]);
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    if (status !== 'ready' || selectedPropertyId === '') {
      return;
    }
    void reloadContent();
  }, [status, selectedPropertyId, reloadContent]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="content-heading">
        <h1 id="content-heading">Content</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to manage content."
        />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="content-heading">
        <h1 id="content-heading">Content</h1>
        <LoadingState label="Loading content" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="content-heading">
        <h1 id="content-heading">Content</h1>
        <ErrorState
          message="Content could not be loaded. Check your connection and try again."
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
  const selectedProperty =
    properties.find((row) => row.id === selectedPropertyId) ?? null;
  const canManage =
    selectedProperty !== null &&
    manageableOrgIds.has(selectedProperty.organization_id);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || selectedProperty === null) {
      return;
    }
    if (form.status === 'scheduled' && form.scheduledFor === '') {
      setError('A date is required when the status is scheduled.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createContent(supabase, {
        property_id: selectedProperty.id,
        organization_id: selectedProperty.organization_id,
        title: form.title,
        body: form.body.trim().length > 0 ? form.body : null,
        channel: form.channel,
        source: form.source as 'manual' | 'integration',
        status: form.status as ContentCalendar['status'],
        scheduled_for:
          form.scheduledFor === '' ? null : new Date(form.scheduledFor).toISOString(),
        external_id: null,
        external_url: null,
        metadata: {},
      });
      setDialogOpen(false);
      await reloadContent();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish(row: ContentCalendar) {
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateContentStatus(supabase, row.id, 'published');
      await reloadContent();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(row: ContentCalendar) {
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateContentStatus(supabase, row.id, 'cancelled');
      await reloadContent();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<ContentCalendar>[] = [
    {
      key: 'title',
      header: 'Content',
      sortValue: (row) => row.title,
      render: (row) => (
        <div>
          <p className="table-primary">{row.title}</p>
          {row.body && <p className="table-secondary">{row.body}</p>}
        </div>
      ),
    },
    {
      key: 'channel',
      header: 'Channel',
      sortValue: (row) => row.channel,
      render: (row) => channelLabels[row.channel] ?? row.channel,
    },
    {
      key: 'source',
      header: 'Source',
      sortValue: (row) => row.source,
      render: (row) => (
        <Badge
          status={row.source}
          tone={row.source === 'integration' ? 'info' : 'neutral'}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => (
        <Badge
          status={row.status.replace(/_/g, ' ')}
          tone={statusTone[row.status] ?? 'neutral'}
        />
      ),
    },
    {
      key: 'schedule',
      header: 'Scheduled',
      sortValue: (row) => row.scheduled_for ?? row.published_at ?? '',
      render: (row) => scheduleLabel(row),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="dialog-actions">
          {canManage && (row.status === 'draft' || row.status === 'scheduled') && (
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => void handlePublish(row)}
            >
              Mark published
            </Button>
          )}
          {canManage &&
            (row.status === 'draft' || row.status === 'scheduled') && (
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => void handleCancel(row)}
              >
                Cancel
              </Button>
            )}
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="content-heading">
      <div className="page-header">
        <div>
          <h1 id="content-heading">Content</h1>
          <p className="page-description">
            Content calendar with draft, scheduled, published, and failed states.
            Manual entries are tracked here; integration-sourced rows come from
            connected providers. Marking published records it on our side and
            does not post to the channel.
          </p>
        </div>
        {canManage && <Button onClick={openCreate}>New content</Button>}
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          message="Create a property before scheduling content."
        />
      ) : (
        <>
          <div className="field">
            <SelectField
              label="Property"
              value={selectedPropertyId}
              onChange={(event) => setSelectedPropertyId(event.target.value)}
            >
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </SelectField>
          </div>

          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            emptyMessage="No content yet for this property."
            emptyAction={
              canManage ? <Button onClick={openCreate}>New content</Button> : undefined
            }
          />
        </>
      )}

      <Dialog
        open={dialogOpen}
        title="New content"
        onClose={() => setDialogOpen(false)}
        describedBy="content-dialog-description"
      >
        <p id="content-dialog-description">
          Manual content is tracked here. Publishing to the channel itself
          happens there, not in AtollHost.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <Field
            label="Title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            required
          />
          <Field
            label="Body"
            optional
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
          />
          <div className="form-grid">
            <SelectField
              label="Channel"
              value={form.channel}
              onChange={(event) => setForm({ ...form, channel: event.target.value })}
            >
              {CONTENT_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {channelLabels[channel] ?? channel}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Source"
              value={form.source}
              onChange={(event) => setForm({ ...form, source: event.target.value })}
            >
              {CONTENT_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source === 'manual' ? 'Manual' : 'Integration'}
                </option>
              ))}
            </SelectField>
          </div>
          <SelectField
            label="Status"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value })}
          >
            {CONTENT_STATUSES.map((option) => (
              <option key={option} value={option}>
                {option === 'scheduled'
                  ? 'Scheduled'
                  : option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </SelectField>
          {form.status === 'scheduled' && (
            <Field
              label="Scheduled for"
              type="datetime-local"
              value={form.scheduledFor}
              onChange={(event) =>
                setForm({ ...form, scheduledFor: event.target.value })
              }
              required
            />
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create content
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
