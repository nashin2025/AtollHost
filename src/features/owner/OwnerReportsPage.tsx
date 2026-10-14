import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { listReportDefinitions, executeReport, listReportRuns } from '../../lib/reports';
import { supabase } from '../../lib/supabase';
import { useOwnerContext } from './OwnerPortalPage';

interface ReportDefinition {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  parameters: { name: string; type: string; required: boolean }[];
  created_at: string;
}

interface ReportRun {
  id: string;
  definition_id: string;
  organization_id: string;
  property_id: string | null;
  parameters: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  row_count: number | null;
  result_csv: string | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  triggered_by: string | null;
}

export function OwnerReportsPage() {
  const { allowedPropertyIds } = useOwnerContext();
  const [definitions, setDefinitions] = useState<ReportDefinition[]>([]);
  const [runs, setRuns] = useState<ReportRun[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  async function loadOrgId() {
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userData.user.id)
        .eq('status', 'active')
        .limit(1);
      if (memberships?.[0]) {
        setOrgId(memberships[0].organization_id);
      }
    }
  }

  async function loadDefinitions() {
    if (!orgId) return;
    try {
      const defs = await listReportDefinitions(supabase!, orgId);
      setDefinitions(defs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report definitions');
    }
  }

  async function loadRuns() {
    if (!orgId) return;
    try {
      const runList = await listReportRuns(supabase!, orgId);
      setRuns(runList);
    } catch (err) {
      console.error('Failed to load report runs:', err);
    }
  }

  useEffect(() => {
    loadOrgId().then(() => {
      if (orgId) {
        loadDefinitions();
        loadRuns();
      }
      setState('ready');
    });
  }, [supabase, allowedPropertyIds]);

  async function handleRun(definition: ReportDefinition) {
    if (!orgId) return;
    setRunningId(definition.id);
    try {
      const propertyId = allowedPropertyIds[0];
      await executeReport(supabase!, { definition_id: definition.id, organization_id: orgId, property_id: propertyId, parameters: {} });
      setRunningId(null);
      await loadRuns();
    } catch (err) {
      setRunningId(null);
      setError(err instanceof Error ? err.message : 'Failed to run report');
    }
  }

  if (state === 'loading') {
    return <LoadingState label="Loading reports…" />;
  }
  if (state === 'error') {
    return <ErrorState message={error ?? 'Unknown error'} onRetry={() => { loadOrgId().then(() => { if (orgId) { loadDefinitions(); loadRuns(); } }) }} />;
  }

  return (
    <section aria-labelledby="page-heading">
      <header className="page-header">
        <h1 id="page-heading">Reports</h1>
        <p className="page-description">
          Run reports for your properties. View recent runs and download results.
        </p>
      </header>

      <div className="property-grid">
        {definitions.length === 0 ? (
          <div className="state-empty" style={{ gridColumn: '1 / -1' }}>
            No report definitions available for your properties.
          </div>
        ) : (
          definitions.map((def) => (
            <article key={def.id} className="property-card">
              <header className="property-card-header">
                <div className="property-card-title">
                  <h2>{def.name}</h2>
                  <p className="property-card-location">{def.description ?? 'No description'}</p>
                </div>
              </header>
              <dl className="property-card-meta">
                <dt>Parameters</dt>
                <dd>{def.parameters.map(p => p.name).join(', ') || 'None'}</dd>
              </dl>
              <div className="property-card-actions">
                <Button
                  variant="primary"
                  loading={runningId === def.id}
                  onClick={() => handleRun(def)}
                  disabled={runningId !== null}
                >
                  Run Report
                </Button>
              </div>
            </article>
          ))
        )}
      </div>

      {runs.length > 0 && (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <h2>Recent Runs</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Report</th>
                  <th scope="col">Status</th>
                  <th scope="col">Started</th>
                  <th scope="col">Completed</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const def = definitions.find((d) => d.id === run.definition_id);
                  return (
                    <tr key={run.id}>
                      <td>{def?.name ?? run.definition_id}</td>
                      <td><span className={`badge badge-${run.status}`}>{run.status}</span></td>
                      <td>{new Date(run.started_at).toLocaleDateString()}</td>
                      <td>
                        {run.completed_at
                          ? new Date(run.completed_at).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}