import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
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
  executeReport,
  getReportRun,
  listReportDefinitions,
  listReportRuns,
  type ReportDefinition,
  type ReportRun,
} from '../../lib/reports';
import { supabase } from '../../lib/supabase';

const runStatusTone: Record<string, 'success' | 'warning' | 'info' | 'neutral' | 'danger'> = {
  pending: 'warning',
  running: 'info',
  completed: 'success',
  failed: 'danger',
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

interface RunParameterValues {
  [name: string]: string;
}

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [memberships, setMemberships] = useState<
    { organization_id: string; role: string; organization: { name: string } | null }[]
  >([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [definitions, setDefinitions] = useState<ReportDefinition[]>([]);
  const [runs, setRuns] = useState<ReportRun[]>([]);
  const [runDialogFor, setRunDialogFor] = useState<ReportDefinition | null>(null);
  const [parameterValues, setParameterValues] = useState<RunParameterValues>({});
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [pollingRunId, setPollingRunId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) {
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const membershipRows = await listMyMemberships(supabase);
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

  const loadDefinitions = useCallback(async () => {
    if (!supabase || selectedOrgId === '') {
      setDefinitions([]);
      return;
    }
    try {
      setDefinitions(await listReportDefinitions(supabase, selectedOrgId));
    } catch {
      setDefinitions([]);
    }
  }, [selectedOrgId]);

  const loadRuns = useCallback(async () => {
    if (!supabase || selectedOrgId === '') {
      setRuns([]);
      return;
    }
    try {
      setRuns(await listReportRuns(supabase, selectedOrgId));
    } catch {
      setRuns([]);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    if (status === 'ready' && selectedOrgId === '' && memberships.length > 0) {
      setSelectedOrgId(memberships[0].organization_id);
    }
  }, [status, selectedOrgId, memberships]);

  useEffect(() => {
    if (status !== 'ready' || selectedOrgId === '') {
      return;
    }
    void loadDefinitions();
    void loadRuns();
    if (!supabase) {
      return;
    }
    void listProperties(supabase)
      .then(setProperties)
      .catch(() => setProperties([]));
  }, [status, selectedOrgId, loadDefinitions, loadRuns]);

  useEffect(
    () => () => {
      if (pollTimer.current !== null) {
        window.clearTimeout(pollTimer.current);
      }
    },
    [],
  );

  if (!hasAuth) {
    return (
      <section aria-labelledby="reports-heading">
        <h1 id="reports-heading">Reports</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to run reports."
        />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="reports-heading">
        <h1 id="reports-heading">Reports</h1>
        <LoadingState label="Loading reports" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="reports-heading">
        <h1 id="reports-heading">Reports</h1>
        <ErrorState
          message="Reports could not be loaded. Check your connection and try again."
          onRetry={() => void reload()}
        />
      </section>
    );
  }

  const definitionNames = new Map(
    definitions.map((definition) => [definition.id, definition.name]),
  );

  function openRunDialog(definition: ReportDefinition) {
    const initial: RunParameterValues = {};
    for (const parameter of definition.parameters) {
      initial[parameter.name] =
        parameter.type === 'date' ? new Date().toISOString().slice(0, 10) : '';
    }
    setParameterValues(initial);
    setSelectedPropertyId('');
    setError(null);
    setRunDialogFor(definition);
  }

  // Polls the run until it finishes or the timeout elapses. The report runs
  // synchronously server-side, so this normally resolves on the first tick.
  function pollRun(runId: string, deadline: number) {
    if (!supabase) {
      return;
    }
    const client = supabase;
    pollTimer.current = window.setTimeout(async () => {
      try {
        const run = await getReportRun(client, runId);
        if (run && (run.status === 'completed' || run.status === 'failed')) {
          setPollingRunId(null);
          await loadRuns();
          return;
        }
      } catch {
        // Keep polling until the deadline; a failed lookup is not a failed run.
      }
      if (Date.now() >= deadline) {
        setPollingRunId(null);
        await loadRuns();
        return;
      }
      pollRun(runId, deadline);
    }, POLL_INTERVAL_MS);
  }

  async function handleRun(event: FormEvent) {
    event.preventDefault();
    if (!supabase || runDialogFor === null) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const parameters: Record<string, unknown> = {};
      for (const parameter of runDialogFor.parameters) {
        const raw = parameterValues[parameter.name] ?? '';
        if (parameter.required && raw.trim() === '') {
          setError(`${parameter.name} is required.`);
          setSubmitting(false);
          return;
        }
        if (parameter.type === 'number') {
          parameters[parameter.name] = raw === '' ? null : Number(raw);
        } else if (parameter.type === 'boolean') {
          parameters[parameter.name] = raw === 'true';
        } else {
          parameters[parameter.name] = raw === '' ? null : raw;
        }
      }
      const { run_id } = await executeReport(supabase, {
        definition_id: runDialogFor.id,
        organization_id: selectedOrgId,
        property_id: selectedPropertyId === '' ? null : selectedPropertyId,
        parameters,
      });
      setRunDialogFor(null);
      setPollingRunId(run_id);
      pollRun(run_id, Date.now() + POLL_TIMEOUT_MS);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : null);
      setSubmitting(false);
    }
  }

  const runColumns: Column<ReportRun>[] = [
    {
      key: 'definition',
      header: 'Report',
      sortValue: (row) => definitionNames.get(row.definition_id) ?? '',
      render: (row) => (
        <p className="table-primary">
          {definitionNames.get(row.definition_id) ?? 'Report'}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => (
        <Badge status={row.status} tone={runStatusTone[row.status] ?? 'neutral'} />
      ),
    },
    {
      key: 'rows',
      header: 'Rows',
      sortValue: (row) => row.row_count ?? -1,
      render: (row) => (row.row_count === null ? '—' : String(row.row_count)),
    },
    {
      key: 'error',
      header: 'Detail',
      sortValue: (row) => row.error ?? '',
      render: (row) => row.error ?? '—',
    },
    {
      key: 'started_at',
      header: 'Started',
      sortValue: (row) => row.started_at,
      render: (row) => new Date(row.started_at).toLocaleString(),
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.status === 'completed' && row.result_csv !== null ? (
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                `${definitionNames.get(row.definition_id) ?? 'report'}-${row.id.slice(0, 8)}.csv`,
                row.result_csv ?? '',
              )
            }
          >
            Download CSV
          </Button>
        ) : null,
    },
  ];

  return (
    <section aria-labelledby="reports-heading">
      <div className="page-header">
        <div>
          <h1 id="reports-heading">Reports</h1>
          <p className="page-description">
            Defined metrics with their calculations behind them. Runs are
            permission-checked per organization and property, and finished runs
            download as CSV.
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

      {definitions.length === 0 ? (
        <EmptyState
          title="No reports available"
          message="This organization has no report definitions yet."
        />
      ) : (
        <div className="property-grid">
          {definitions.map((definition) => (
            <article key={definition.id} className="property-card">
              <header className="scan-card-header">
                <div className="scan-card-title">
                  <h2>{definition.name}</h2>
                  <p className="scan-card-url">
                    {definition.parameters.length === 0
                      ? 'No parameters'
                      : `Parameters: ${definition.parameters
                          .map(
                            (parameter) =>
                              `${parameter.name} (${parameter.type}${parameter.required ? ', required' : ''})`,
                          )
                          .join(', ')}`}
                  </p>
                </div>
                <Badge
                  status={definition.is_system ? 'system' : 'custom'}
                  tone={definition.is_system ? 'info' : 'neutral'}
                />
              </header>
              {definition.description && (
                <p className="stat-context">{definition.description}</p>
              )}
              <footer className="scan-card-actions">
                <span className="table-secondary">
                  {definition.is_system
                    ? 'Maintained by AtollHost'
                    : 'Organization defined'}
                </span>
                <Button variant="outline" onClick={() => openRunDialog(definition)}>
                  Run report
                </Button>
              </footer>
            </article>
          ))}
        </div>
      )}

      <h2 className="overview-heading">Recent runs</h2>
      {pollingRunId !== null && (
        <p className="stat-context">Running report, waiting for results…</p>
      )}
      <DataTable
        columns={runColumns}
        rows={runs}
        rowKey={(row) => row.id}
        emptyMessage="No runs yet. Run a report to see results here."
      />

      <Dialog
        open={runDialogFor !== null}
        title={`Run: ${runDialogFor?.name ?? ''}`}
        onClose={() => setRunDialogFor(null)}
        describedBy="run-dialog-description"
      >
        <p id="run-dialog-description">
          Leave the property unset for an organization-wide run.
        </p>
        <form onSubmit={handleRun} noValidate>
          <SelectField
            label="Property (optional)"
            optional
            value={selectedPropertyId}
            onChange={(event) => setSelectedPropertyId(event.target.value)}
          >
            <option value="">All properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </SelectField>
          {runDialogFor?.parameters.map((parameter) => (
            <Field
              key={parameter.name}
              label={`${parameter.name}${parameter.required ? '' : ' (optional)'}`}
              optional={!parameter.required}
              type={
                parameter.type === 'date'
                  ? 'date'
                  : parameter.type === 'number'
                    ? 'number'
                    : 'text'
              }
              value={parameterValues[parameter.name] ?? ''}
              onChange={(event) =>
                setParameterValues({
                  ...parameterValues,
                  [parameter.name]: event.target.value,
                })
              }
            />
          ))}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setRunDialogFor(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting || pollingRunId !== null}>
              Run report
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
