import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { SelectField } from '../../components/ui/Field';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';
import { listOrganizationMembers } from '../../lib/properties';
import { listProperties, type Property } from '../../lib/properties';
import {
  ENQUIRY_TRANSITIONS,
  listEnquiries,
  markEnquiryRead,
  updateEnquiry,
  upsertEnquiry,
  type Enquiry,
  type EnquiryForm,
} from '../../lib/enquiries';
import { supabase } from '../../lib/supabase';

const statusTone: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  new: 'info',
  open: 'warning',
  waiting: 'neutral',
  won: 'success',
  lost: 'danger',
  closed: 'neutral',
};

const sourceLabels: Record<string, string> = {
  website: 'Website',
  booking: 'Booking',
  walk_in: 'Walk-in',
  phone: 'Phone',
  email: 'Email',
  import: 'Import',
  other: 'Other',
};

const channelLabels: Record<string, string> = {
  website: 'Website',
  booking: 'Booking',
  walk_in: 'Walk-in',
  phone: 'Phone',
  email: 'Email',
  messaging: 'Messaging',
  other: 'Other',
};

interface EnquiryFormState {
  enquiry_id: string | null;
  channel: string;
  source: string;
  topic: string;
  subject: string;
  assigned_to: string;
  follow_up_at: string;
  urgent: boolean;
  external_id: string;
}

const emptyForm: EnquiryFormState = {
  enquiry_id: null,
  channel: 'email',
  source: '',
  topic: '',
  subject: '',
  assigned_to: '',
  follow_up_at: '',
  urgent: false,
  external_id: '',
};

function toFormState(enquiry: Enquiry): EnquiryFormState {
  return {
    enquiry_id: enquiry.id,
    channel: enquiry.channel,
    source: enquiry.source ?? '',
    topic: enquiry.topic ?? '',
    subject: enquiry.subject ?? '',
    assigned_to: enquiry.assigned_to ?? '',
    follow_up_at: enquiry.follow_up_at
      ? new Date(enquiry.follow_up_at).toISOString().slice(0, 16)
      : '',
    urgent: enquiry.urgent,
    external_id: enquiry.external_id ?? '',
  };
}

function truncatedId(value: string | null): string {
  if (value === null) {
    return 'Unassigned';
  }
  return value.length > 13 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

export function EnquiriesPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [assignees, setAssignees] = useState<{ user_id: string; full_name: string | null; email: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [form, setForm] = useState<EnquiryFormState>(emptyForm);
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [outcome, setOutcome] = useState('');
  const [followUp, setFollowUp] = useState('');
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
      const propertyRows = await listProperties(supabase);
      setProperties(propertyRows);
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

  const reloadEnquiries = useCallback(async () => {
    if (!supabase || selectedPropertyId === '') {
      setEnquiries([]);
      setAssignees([]);
      return;
    }
    const property = properties.find((row) => row.id === selectedPropertyId);
    if (property) {
      try {
        const members = await listOrganizationMembers(
          supabase,
          property.organization_id,
        );
        setAssignees(members);
      } catch {
        setAssignees([]);
      }
    } else {
      setAssignees([]);
    }
    try {
      const rows = await listEnquiries(supabase, selectedPropertyId);
      setEnquiries(rows);
    } catch {
      setEnquiries([]);
    }
  }, [selectedPropertyId, properties]);

  useEffect(() => {
    if (status !== 'ready' || selectedPropertyId === '') {
      return;
    }
    void reloadEnquiries();
  }, [status, selectedPropertyId, reloadEnquiries]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="enquiries-heading">
        <h1 id="enquiries-heading">Enquiries</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to manage guest enquiries."
        />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="enquiries-heading">
        <h1 id="enquiries-heading">Enquiries</h1>
        <LoadingState label="Loading enquiries" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="enquiries-heading">
        <h1 id="enquiries-heading">Enquiries</h1>
        <ErrorState
          message="Enquiries could not be loaded. Check your connection and try again."
          onRetry={() => void reload()}
        />
      </section>
    );
  }

  const selectedProperty =
    properties.find((row) => row.id === selectedPropertyId) ?? null;

  const visibleEnquiries = enquiries.filter((enquiry) => {
    if (statusFilter !== 'all' && enquiry.status !== statusFilter) {
      return false;
    }
    if (unreadOnly && !enquiry.unread) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const query = searchQuery.trim().toLowerCase();
      const haystack = [
        enquiry.subject,
        enquiry.topic,
        enquiry.channel,
        enquiry.source,
        enquiry.external_id,
      ]
        .filter((value) => value !== null)
        .map((value) => value.toLowerCase())
        .join(' ');
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });

  function openCreateDialog() {
    setForm(emptyForm);
    setError(null);
    setCreateDialogOpen(true);
  }

  function openEditDialog(enquiry: Enquiry) {
    setForm(toFormState(enquiry));
    setError(null);
    setCreateDialogOpen(false);
    setEditDialogOpen(true);
  }

  function openDetailDialog(enquiry: Enquiry) {
    setSelected(enquiry);
    setOutcome(enquiry.outcome ?? '');
    setFollowUp(
      enquiry.follow_up_at
        ? new Date(enquiry.follow_up_at).toISOString().slice(0, 16)
        : '',
    );
    setError(null);
  }

  async function handleSubmit(event: FormEvent, isUpdate: boolean) {
    event.preventDefault();
    if (!supabase || !selectedProperty) {
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: EnquiryForm = {
      enquiry_id: isUpdate ? form.enquiry_id : null,
      organization_id: selectedProperty.organization_id,
      property_id: selectedProperty.id,
      guest_id: null,
      reservation_id: null,
      channel: form.channel,
      source: form.source === '' ? null : form.source,
      topic: form.topic === '' ? null : form.topic,
      subject: form.subject === '' ? null : form.subject,
      assigned_to: form.assigned_to === '' ? null : form.assigned_to,
      follow_up_at:
        form.follow_up_at === ''
          ? null
          : new Date(form.follow_up_at).toISOString(),
      urgent: form.urgent,
      external_id: form.external_id === '' ? null : form.external_id,
    };
    try {
      await upsertEnquiry(supabase, payload);
      setCreateDialogOpen(false);
      setEditDialogOpen(false);
      await reloadEnquiries();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : null,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTransition(nextStatus: string) {
    if (!supabase || selected === null) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateEnquiry(
        supabase,
        selected.id,
        nextStatus,
        outcome === '' ? null : outcome,
        followUp === '' ? null : new Date(followUp).toISOString(),
      );
      const refreshed = await listEnquiries(supabase, selectedPropertyId);
      setEnquiries(refreshed);
      setSelected(refreshed.find((row) => row.id === selected.id) ?? null);
    } catch (transitionError) {
      setError(
        transitionError instanceof Error ? transitionError.message : null,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkRead() {
    if (!supabase || selected === null) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await markEnquiryRead(supabase, selected.id);
      const refreshed = await listEnquiries(supabase, selectedPropertyId);
      setEnquiries(refreshed);
      setSelected(refreshed.find((row) => row.id === selected.id) ?? null);
    } catch (readError) {
      setError(
        readError instanceof Error ? readError.message : null,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<Enquiry>[] = [
    {
      key: 'subject',
      header: 'Enquiry',
      sortValue: (row) => row.subject ?? '',
      render: (row) => (
        <div>
          <p className="table-primary">{row.subject ?? 'Untitled enquiry'}</p>
          <p className="table-secondary">
            {channelLabels[row.channel] ?? row.channel}
            {row.topic ? ` · ${row.topic}` : ''}
            {row.external_id ? ` · ref ${row.external_id}` : ''}
          </p>
        </div>
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
      key: 'source',
      header: 'Source',
      sortValue: (row) => row.source ?? '',
      render: (row) =>
        row.source
          ? sourceLabels[row.source] ?? row.source
          : '—',
    },
    {
      key: 'assigned_to',
      header: 'Assignee',
      sortValue: (row) => row.assigned_to ?? '',
      render: (row) => truncatedId(row.assigned_to),
    },
    {
      key: 'follow_up_at',
      header: 'Follow-up',
      sortValue: (row) => row.follow_up_at ?? '',
      render: (row) =>
        row.follow_up_at
          ? new Date(row.follow_up_at).toLocaleString()
          : '—',
    },
    {
      key: 'indicators',
      header: '',
      sortValue: () => '',
      render: (row) => (
        <span className="badge-stack">
          {row.unread && <Badge status="unread" tone="warning" />}
          {row.urgent && <Badge status="urgent" tone="danger" />}
          {row.outcome && (
            <Badge status={row.outcome} tone="success" />
          )}
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Updated',
      sortValue: (row) => row.updated_at,
      render: (row) => new Date(row.updated_at).toLocaleString(),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => openDetailDialog(row)}>
            Details
          </Button>
          <Button
            variant="secondary"
            onClick={() => openEditDialog(row)}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  const transitions =
    selected !== null ? ENQUIRY_TRANSITIONS[selected.status] ?? [] : [];

  return (
    <section aria-labelledby="enquiries-heading">
      <div className="page-header">
        <div>
          <h1 id="enquiries-heading">Enquiries</h1>
          <p className="page-description">
            Guest enquiries with classification, assignment,
            follow-up, and outcome. Status changes follow the
            validated enquiry lifecycle.
          </p>
        </div>
        {properties.length > 0 && (
          <Button onClick={openCreateDialog}>New enquiry</Button>
        )}
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          message="Create a property before recording enquiries."
        />
      ) : (
        <>
          <div className="field">
            <SelectField
              label="Property"
              value={selectedPropertyId}
              onChange={(event) =>
                setSelectedPropertyId(event.target.value)
              }
            >
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="field">
            <Field
              label="Search enquiries"
              type="search"
              placeholder="Subject, topic, channel, or reference"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              optional
            />
          </div>

          <div className="field">
            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="open">Open</option>
              <option value="waiting">Waiting</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="closed">Closed</option>
            </SelectField>
          </div>

          <div className="field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(event) =>
                  setUnreadOnly(event.target.checked)
                }
              />
              Unread only
            </label>
          </div>

          <DataTable
            columns={columns}
            rows={visibleEnquiries}
            rowKey={(row) => row.id}
            emptyMessage="No enquiries match. Record an enquiry to start a guest conversation."
            emptyAction={
              <Button onClick={openCreateDialog}>New enquiry</Button>
            }
          />
        </>
      )}

      <Dialog
        open={createDialogOpen}
        title="New enquiry"
        onClose={() => setCreateDialogOpen(false)}
        describedBy="create-enquiry-description"
      >
        <p id="create-enquiry-description">
          New enquiries start as unread. Classification,
          assignment, and follow-up are recorded with the
          enquiry.
        </p>
        <form onSubmit={(event) => void handleSubmit(event, false)} noValidate>
          <SelectField
            label="Channel"
            value={form.channel}
            onChange={(event) =>
              setForm({ ...form, channel: event.target.value })
            }
          >
            <option value="website">Website</option>
            <option value="booking">Booking</option>
            <option value="walk_in">Walk-in</option>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="messaging">Messaging</option>
            <option value="other">Other</option>
          </SelectField>
          <SelectField
            label="Source"
            value={form.source}
            onChange={(event) =>
              setForm({ ...form, source: event.target.value })
            }
            optional
          >
            <option value="">No source</option>
            <option value="website">Website</option>
            <option value="booking">Booking</option>
            <option value="walk_in">Walk-in</option>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="import">Import</option>
            <option value="other">Other</option>
          </SelectField>
          <Field
            label="Topic"
            value={form.topic}
            onChange={(event) =>
              setForm({ ...form, topic: event.target.value })
            }
            optional
            placeholder="Classification topic"
          />
          <Field
            label="Subject"
            value={form.subject}
            onChange={(event) =>
              setForm({ ...form, subject: event.target.value })
            }
            optional
            placeholder="Short summary"
          />
          <SelectField
            label="Assignee"
            value={form.assigned_to}
            onChange={(event) =>
              setForm({ ...form, assigned_to: event.target.value })
            }
            optional
          >
            <option value="">Unassigned</option>
            {assignees.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.full_name ?? member.email}
              </option>
            ))}
          </SelectField>
          <Field
            label="Follow-up at"
            type="datetime-local"
            value={form.follow_up_at}
            onChange={(event) =>
              setForm({ ...form, follow_up_at: event.target.value })
            }
            optional
            helper="Leave empty when no follow-up is needed."
          />
          <Field
            label="External reference"
            value={form.external_id}
            onChange={(event) =>
              setForm({ ...form, external_id: event.target.value })
            }
            optional
            helper="One reference per property. Re-importing the same reference is rejected."
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.urgent}
              onChange={(event) =>
                setForm({ ...form, urgent: event.target.checked })
              }
            />
            Urgent
          </label>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button
              variant="secondary"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save enquiry
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        title="Edit enquiry"
        onClose={() => setEditDialogOpen(false)}
        describedBy="edit-enquiry-description"
      >
        <p id="edit-enquiry-description">
          Updates classification, assignment, follow-up, and
          urgency. The status changes through the detail view so
          every transition is validated and audited.
        </p>
        <form onSubmit={(event) => void handleSubmit(event, true)} noValidate>
          <SelectField
            label="Channel"
            value={form.channel}
            onChange={(event) =>
              setForm({ ...form, channel: event.target.value })
            }
          >
            <option value="website">Website</option>
            <option value="booking">Booking</option>
            <option value="walk_in">Walk-in</option>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="messaging">Messaging</option>
            <option value="other">Other</option>
          </SelectField>
          <SelectField
            label="Source"
            value={form.source}
            onChange={(event) =>
              setForm({ ...form, source: event.target.value })
            }
            optional
          >
            <option value="">No source</option>
            <option value="website">Website</option>
            <option value="booking">Booking</option>
            <option value="walk_in">Walk-in</option>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="import">Import</option>
            <option value="other">Other</option>
          </SelectField>
          <Field
            label="Topic"
            value={form.topic}
            onChange={(event) =>
              setForm({ ...form, topic: event.target.value })
            }
            optional
          />
          <Field
            label="Subject"
            value={form.subject}
            onChange={(event) =>
              setForm({ ...form, subject: event.target.value })
            }
            optional
          />
          <SelectField
            label="Assignee"
            value={form.assigned_to}
            onChange={(event) =>
              setForm({ ...form, assigned_to: event.target.value })
            }
            optional
          >
            <option value="">Unassigned</option>
            {assignees.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.full_name ?? member.email}
              </option>
            ))}
          </SelectField>
          <Field
            label="Follow-up at"
            type="datetime-local"
            value={form.follow_up_at}
            onChange={(event) =>
              setForm({ ...form, follow_up_at: event.target.value })
            }
            optional
          />
          <Field
            label="External reference"
            value={form.external_id}
            onChange={(event) =>
              setForm({ ...form, external_id: event.target.value })
            }
            optional
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.urgent}
              onChange={(event) =>
                setForm({ ...form, urgent: event.target.checked })
              }
            />
            Urgent
          </label>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button
              variant="secondary"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save changes
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={selected !== null}
        title={selected?.subject ?? 'Enquiry'}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="scanner-detail">
            <div className="finding-header">
              <Badge
                status={selected.status.replace(/_/g, ' ')}
                tone={statusTone[selected.status] ?? 'neutral'}
              />
              {selected.unread && (
                <Badge status="unread" tone="warning" />
              )}
              {selected.urgent && (
                <Badge status="urgent" tone="danger" />
              )}
            </div>
            <p className="finding-category">
              {channelLabels[selected.channel] ?? selected.channel}
              {selected.source
                ? ` · ${sourceLabels[selected.source] ?? selected.source}`
                : ''}
              {selected.topic ? ` · ${selected.topic}` : ''}
              {selected.external_id
                ? ` · ref ${selected.external_id}`
                : ''}
            </p>
            <p className="table-secondary">
              Assignee: {truncatedId(selected.assigned_to)} · Guest:{' '}
              {selected.guest_id ?? 'none'} · Reservation:{' '}
              {selected.reservation_id ?? 'none'}
            </p>
            <p className="table-secondary">
              Created {new Date(selected.created_at).toLocaleString()} ·
              Updated {new Date(selected.updated_at).toLocaleString()}
              {selected.follow_up_at
                ? ` · follow-up ${new Date(
                    selected.follow_up_at,
                  ).toLocaleString()}`
                : ''}
            </p>
            {selected.outcome && (
              <p>
                Outcome: <Badge status={selected.outcome} tone="success" />
              </p>
            )}
            <Field
              label="Outcome"
              value={outcome}
              onChange={(event) => setOutcome(event.target.value)}
              optional
              placeholder="e.g. qualified, booked, lost to competitor"
            />
            <Field
              label="Follow-up at"
              type="datetime-local"
              value={followUp}
              onChange={(event) => setFollowUp(event.target.value)}
              optional
            />
            <div className="dialog-actions">
              {selected.unread && (
                <Button
                  variant="outline"
                  disabled={submitting}
                  onClick={() => void handleMarkRead()}
                >
                  Mark read
                </Button>
              )}
              {transitions.map((nextStatus) => (
                <Button
                  key={nextStatus}
                  variant={
                    nextStatus === 'closed' || nextStatus === 'won'
                      ? 'primary'
                      : 'secondary'
                  }
                  disabled={submitting}
                  onClick={() => void handleTransition(nextStatus)}
                >
                  Move to {nextStatus.replace(/_/g, ' ')}
                </Button>
              ))}
            </div>
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
export { EnquiryDetailPageWrapper } from './EnquiryDetailPage';