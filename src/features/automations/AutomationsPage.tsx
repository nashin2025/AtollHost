import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/States';
import { ErrorState } from '../../components/ui/States';
import { LoadingState } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';
import { SelectField } from '../../components/ui/Field';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { listProperties, type Property } from '../../lib/properties';
import {
  AUTOMATION_TRIGGERS,
  createAutomation,
  listAutomationRuns,
  listAutomations,
  toggleAutomation,
  type Automation,
  type AutomationRun,
} from '../../lib/automations';
import { supabase } from '../../lib/supabase';

const runStatusTone: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  pending: 'neutral',
  running: 'warning',
  completed: 'success',
  failed: 'danger',
};

const triggerLabels: Record<string, string> = {
  enquiry_created: 'Enquiry created',
  message_received: 'Message received',
  review_received: 'Review received',
  reservation_created: 'Reservation created',
  task_due: 'Task due',
  scheduled: 'Scheduled',
};

interface AutomationForm {
  name: string;
  trigger_type: string;
  enabled: boolean;
}

const emptyForm: AutomationForm = {
  name: '',
  trigger_type: AUTOMATION_TRIGGERS[0],
  enabled: true,
};

export function AutomationsPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [runs, setRuns] = useState<Record<string, AutomationRun[]>>({});
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(
    null,
  );
  const [form, setForm] = useState<AutomationForm>(emptyForm);
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

  const reloadPropertyData = useCallback(async () => {
    const client = supabase;
    if (!client || selectedPropertyId === '') {
      setAutomations([]);
      setRuns({});
      return;
    }
    try {
      const rows = await listAutomations(client, selectedPropertyId);
      setAutomations(rows);
      const runMap: Record<string, AutomationRun[]> = {};
      await Promise.all(
        rows.map(async (row) => {
          runMap[row.id] = await listAutomationRuns(client, row.id, 5);
        }),
      );
      setRuns(runMap);
    } catch {
      setAutomations([]);
      setRuns({});
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    if (status !== 'ready' || selectedPropertyId === '') {
      return;
    }
    void reloadPropertyData();
  }, [status, selectedPropertyId, reloadPropertyData]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="automations-heading">
        <h1 id="automations-heading">Automations</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to manage automations."
        />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="automations-heading">
        <h1 id="automations-heading">Automations</h1>
        <LoadingState label="Loading automations" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="automations-heading">
        <h1 id="automations-heading">Automations</h1>
        <ErrorState
          message="Automations could not be loaded. Check your connection and try again."
          onRetry={() => void reload()}
        />
      </section>
    );
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !selectedPropertyId) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createAutomation(supabase, {
        property_id: selectedPropertyId,
        name: form.name,
        trigger_type: form.trigger_type,
        enabled: form.enabled,
      });
      setDialogOpen(false);
      await reloadPropertyData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(automation: Automation) {
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await toggleAutomation(supabase, automation.id, !automation.enabled);
      await reloadPropertyData();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<Automation>[] = [
    {
      key: 'name',
      header: 'Automation',
      sortValue: (row) => row.name,
      render: (row) => (
        <div>
          <p className="table-primary">{row.name}</p>
          <p className="table-secondary">{row.trigger_type}</p>
        </div>
      ),
    },
    {
      key: 'trigger',
      header: 'Trigger',
      sortValue: (row) => row.trigger_type,
      render: (row) => triggerLabels[row.trigger_type] ?? row.trigger_type,
    },
    {
      key: 'enabled',
      header: 'Status',
      sortValue: (row) => (row.enabled ? 'enabled' : 'disabled'),
      render: (row) => (
        <Badge
          status={row.enabled ? 'enabled' : 'disabled'}
          tone={row.enabled ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'runs',
      header: 'Recent runs',
      render: (row) => {
        const recent = runs[row.id] ?? [];
        if (recent.length === 0) {
          return '—';
        }
        const latest = recent[0];
        return (
          <div>
            <Badge
              status={latest.status}
              tone={runStatusTone[latest.status] ?? 'neutral'}
            />
            <p className="table-secondary">
              {new Date(latest.started_at).toLocaleString()}
            </p>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="table-actions">
          <Button
            variant="outline"
            onClick={() => setSelectedAutomation(row)}
          >
            Runs
          </Button>
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => void handleToggle(row)}
          >
            {row.enabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="automations-heading">
      <div className="page-header">
        <div>
          <h1 id="automations-heading">Automations</h1>
          <p className="page-description">
            Event-driven rules that react to enquiries, messages, reviews,
            reservations, and task due dates. Enable or disable rules per
            property and inspect recent runs.
          </p>
        </div>
        {properties.length > 0 && (
          <Button
            onClick={() => {
              setForm(emptyForm);
              setError(null);
              setDialogOpen(true);
            }}
          >
            Add automation
          </Button>
        )}
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          message="Create a property before adding automations."
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
            rows={automations}
            rowKey={(row) => row.id}
            emptyMessage="No automations configured for this property yet."
            emptyAction={
              <Button
                onClick={() => {
                  setForm(emptyForm);
                  setError(null);
                  setDialogOpen(true);
                }}
              >
                Add automation
              </Button>
            }
          />
        </>
      )}

      <Dialog
        open={dialogOpen}
        title="Add an automation"
        onClose={() => setDialogOpen(false)}
        describedBy="create-automation-description"
      >
        <p id="create-automation-description">
          Choose the event that triggers this automation. Automations run in
          the background once enabled.
        </p>
        <form onSubmit={handleCreate} noValidate>
          <Field
            label="Name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <SelectField
            label="Trigger"
            value={form.trigger_type}
            onChange={(event) =>
              setForm({ ...form, trigger_type: event.target.value })
            }
            required
          >
            {AUTOMATION_TRIGGERS.map((trigger) => (
              <option key={trigger} value={trigger}>
                {triggerLabels[trigger] ?? trigger}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Status"
            value={form.enabled ? 'enabled' : 'disabled'}
            onChange={(event) =>
              setForm({ ...form, enabled: event.target.value === 'enabled' })
            }
          >
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
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
              Save automation
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={selectedAutomation !== null}
        title={selectedAutomation?.name ?? ''}
        onClose={() => setSelectedAutomation(null)}
      >
        {selectedAutomation && (
          <div className="scanner-detail">
            <p className="page-description">
              {triggerLabels[selectedAutomation.trigger_type] ??
                selectedAutomation.trigger_type}{' '}
              ·{' '}
              {selectedAutomation.enabled ? 'enabled' : 'disabled'}
            </p>
            <h3>Recent runs</h3>
            {(runs[selectedAutomation.id] ?? []).length === 0 ? (
              <p>No runs recorded yet.</p>
            ) : (
              <ul className="findings-list">
                {(runs[selectedAutomation.id] ?? []).map((run) => (
                  <li key={run.id} className="finding-card">
                    <div className="finding-header">
                      <p className="finding-title">
                        {new Date(run.started_at).toLocaleString()}
                      </p>
                      <Badge
                        status={run.status}
                        tone={runStatusTone[run.status] ?? 'neutral'}
                      />
                    </div>
                    {run.error && (
                      <p className="auth-error" role="alert">
                        {run.error}
                      </p>
                    )}
                    {run.output !== null && (
                      <pre className="finding-category">
                        {JSON.stringify(run.output, null, 2)}
                      </pre>
                    )}
                    {run.finished_at && (
                      <p className="table-secondary">
                        Finished {new Date(run.finished_at).toLocaleString()}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Dialog>
    </section>
  );
}