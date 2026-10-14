import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/States';
import { ErrorState } from '../../components/ui/States';
import { LoadingState } from '../../components/ui/States';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { SelectField } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { listMyMemberships } from '../../lib/memberships';
import {
  createJourneyTemplate,
  listJourneyTemplates,
  toggleJourneyTemplate,
  type JourneyTemplate,
} from '../../lib/journeyTemplates';
import { supabase } from '../../lib/supabase';

const triggerTypes = [
  { value: 'enquiry_created', label: 'Enquiry created' },
  { value: 'booking_confirmed', label: 'Booking confirmed' },
  { value: 'check_in_reminder', label: 'Before check-in' },
  { value: 'check_out_followup', label: 'After check-out' },
  { value: 'inactivity', label: 'Guest inactivity' },
];

interface JourneyFormState {
  name: string;
  description: string;
  triggerType: string;
}

const emptyForm: JourneyFormState = {
  name: '',
  description: '',
  triggerType: 'enquiry_created',
};

export function JourneyPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [memberships, setMemberships] = useState<
    { organization_id: string; role: string; organization: { name: string } | null }[]
  >([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [templates, setTemplates] = useState<JourneyTemplate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<JourneyFormState>(emptyForm);
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

  const reloadTemplates = useCallback(async () => {
    if (!supabase || selectedOrgId === '') {
      setTemplates([]);
      return;
    }
    try {
      setTemplates(await listJourneyTemplates(supabase, selectedOrgId));
    } catch {
      setTemplates([]);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    if (status !== 'ready' || selectedOrgId === '') {
      return;
    }
    void reloadTemplates();
  }, [status, selectedOrgId, reloadTemplates]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="journey-heading">
        <h1 id="journey-heading">Guest Journey</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to manage journey templates."
        />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="journey-heading">
        <h1 id="journey-heading">Guest Journey</h1>
        <LoadingState label="Loading journey templates" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="journey-heading">
        <h1 id="journey-heading">Guest Journey</h1>
        <ErrorState
          message="Journey templates could not be loaded. Check your connection and try again."
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
  const activeTemplates = templates.filter((row) => row.is_active).length;

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createJourneyTemplate(supabase, {
        organization_id: selectedOrgId,
        name: form.name,
        description:
          form.description.trim().length > 0 ? form.description : null,
        trigger_type: form.triggerType,
        config: {},
      });
      setDialogOpen(false);
      await reloadTemplates();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(template: JourneyTemplate) {
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await toggleJourneyTemplate(supabase, template.id, !template.is_active);
      await reloadTemplates();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  const triggerLabels = new Map(triggerTypes.map((row) => [row.value, row.label]));

  return (
    <section aria-labelledby="journey-heading">
      <div className="page-header">
        <div>
          <h1 id="journey-heading">Guest Journey</h1>
          <p className="page-description">
            Journey templates describe the guest touchpoints your team follows.
            Templates start inactive, and activation is the only switch that
            enables a journey, so nothing runs until a human turns it on.
          </p>
        </div>
        {canManage && <Button onClick={openCreate}>New template</Button>}
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

      {templates.length === 0 ? (
        <EmptyState
          title="No journey templates yet"
          message="Create a template for a recurring guest touchpoint, such as a check-in reminder or a post-stay follow-up."
        />
      ) : (
        <>
          <p className="stat-context">
            {templates.length}{' '}
            {templates.length === 1 ? 'template' : 'templates'} ·{' '}
            {activeTemplates} active
          </p>
          <div className="property-grid">
            {templates.map((template) => (
              <article key={template.id} className="property-card">
                <header className="scan-card-header">
                  <span className="scan-card-icon">
                    <Icon>
                      <circle cx="6" cy="19" r="3" />
                      <path d="M18 5a3 3 0 0 0-3 3v4a3 3 0 0 1-3 3H9" />
                      <path d="M6 16V9a3 3 0 0 1 3-3h3" />
                    </Icon>
                  </span>
                  <div className="scan-card-title">
                    <h2>{template.name}</h2>
                    <p className="scan-card-url">
                      {triggerLabels.get(template.trigger_type) ??
                        template.trigger_type}
                    </p>
                  </div>
                  <Badge
                    status={template.is_active ? 'active' : 'inactive'}
                    tone={template.is_active ? 'success' : 'neutral'}
                  />
                </header>
                {template.description && (
                  <p className="stat-context">{template.description}</p>
                )}
                <footer className="scan-card-actions">
                  <span className="table-secondary">
                    Created {new Date(template.created_at).toLocaleDateString()}
                  </span>
                  {canManage && (
                    <Button
                      variant="outline"
                      disabled={submitting}
                      onClick={() => void handleToggle(template)}
                    >
                      {template.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                </footer>
              </article>
            ))}
          </div>
        </>
      )}

      <Dialog
        open={dialogOpen}
        title="New journey template"
        onClose={() => setDialogOpen(false)}
        describedBy="journey-dialog-description"
      >
        <p id="journey-dialog-description">
          Templates are created inactive. Activate one when the touchpoint is
          ready to run.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <Field
            label="Name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <Field
            label="Description"
            optional
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
          <SelectField
            label="Trigger"
            value={form.triggerType}
            onChange={(event) =>
              setForm({ ...form, triggerType: event.target.value })
            }
          >
            {triggerTypes.map((trigger) => (
              <option key={trigger.value} value={trigger.value}>
                {trigger.label}
              </option>
            ))}
          </SelectField>
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
              Create template
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
export { JourneyDetailPageWrapper } from './JourneyDetailPage';
