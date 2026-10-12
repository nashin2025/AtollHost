import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/States';
import { ErrorState } from '../../components/ui/States';
import { LoadingState } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';
import { SelectField } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { listMyMemberships, type Membership } from '../../lib/memberships';
import { listProperties, type Property } from '../../lib/properties';
import {
  listFindings,
  listScannerRuns,
  reviewFinding,
  startScannerRun,
  type Finding,
  type ScannerRun,
} from '../../lib/scanner';
import { supabase } from '../../lib/supabase';

const severityTone: Record<string, 'danger' | 'warning' | 'info'> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'info',
  info: 'info',
};

const findingTone: Record<string, 'success' | 'warning' | 'neutral'> = {
  approved: 'success',
  rejected: 'neutral',
  pending_review: 'warning',
};

function runTone(status: string): 'info' | 'success' | 'warning' | 'neutral' {
  if (status === 'completed') {
    return 'success';
  }
  if (status === 'in_progress') {
    return 'warning';
  }
  if (status === 'archived') {
    return 'neutral';
  }
  return 'info';
}

export function ScannerPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [runs, setRuns] = useState<ScannerRun[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [userPropertyRoles, setUserPropertyRoles] = useState<
    Record<string, string>
  >({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<ScannerRun | null>(null);
  const [form, setForm] = useState({
    propertyId: '',
    targetName: '',
    targetUrl: '',
  });
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
      const [membershipRows, propertyRows, runRows] = await Promise.all([
        listMyMemberships(supabase),
        listProperties(supabase),
        listScannerRuns(supabase),
      ]);
      setMemberships(membershipRows);
      setProperties(propertyRows);
      setRuns(runRows);
      if (runRows.length > 0) {
        const findingRows = await listFindings(
          supabase,
          runRows.map((run) => run.id),
        );
        setFindings(findingRows);
      } else {
        setFindings([]);
      }
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: assignments } = await supabase
          .from('property_users')
          .select('property_id, role')
          .eq('user_id', userData.user.id)
          .eq('status', 'active');
        const roles: Record<string, string> = {};
        for (const row of (assignments ?? []) as Array<{
          property_id: string;
          role: string;
        }>) {
          roles[row.property_id] = row.role;
        }
        setUserPropertyRoles(roles);
      }
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

  if (!hasAuth) {
    return (
      <section aria-labelledby="scanner-heading">
        <h1 id="scanner-heading">Guesthouse Scanner</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to run scans."
        />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="scanner-heading">
        <h1 id="scanner-heading">Guesthouse Scanner</h1>
        <LoadingState label="Loading scanner runs" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="scanner-heading">
        <h1 id="scanner-heading">Guesthouse Scanner</h1>
        <ErrorState
          message="Scanner runs could not be loaded. Check your connection and try again."
          onRetry={() => void reload()}
        />
      </section>
    );
  }

  const adminOrgIds = new Set(
    memberships
      .filter((membership) => membership.role === 'agency_admin')
      .map((membership) => membership.organization_id),
  );

  const canReviewRun = (run: ScannerRun) =>
    adminOrgIds.has(run.organization_id) ||
    (run.property_id !== null &&
      ['property_owner', 'property_manager'].includes(
        userPropertyRoles[run.property_id] ?? '',
      ));

  const findingsForRun = (runId: string) =>
    findings.filter((finding) => finding.scanner_audit_id === runId);

  const pendingCount = (runId: string) =>
    findingsForRun(runId).filter(
      (finding) => finding.status === 'pending_review',
    ).length;

  function openDialog() {
    setForm({
      propertyId: properties[0]?.id ?? '',
      targetName: properties[0]?.name ?? '',
      targetUrl: '',
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleStartScan(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    const property = properties.find((row) => row.id === form.propertyId);
    if (!property) {
      setError('Choose a property to scan.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await startScannerRun(supabase, {
        organization_id: property.organization_id,
        property_id: property.id,
        target_name: form.targetName,
        target_url: form.targetUrl,
      });
      setDialogOpen(false);
      await reload();
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(finding: Finding, verdict: 'approved' | 'rejected') {
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await reviewFinding(supabase, finding.id, verdict);
      const updated = await listFindings(
        supabase,
        runs.map((run) => run.id),
      );
      setFindings(updated);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<ScannerRun>[] = [
    {
      key: 'target',
      header: 'Target',
      sortValue: (row) => row.target_name,
      render: (row) => (
        <div>
          <p className="table-primary">{row.target_name}</p>
          <p className="table-secondary">{row.target_url ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'property',
      header: 'Property',
      sortValue: (row) => row.property?.name ?? '',
      render: (row) => row.property?.name ?? 'Organization-wide',
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => <Badge status={row.status} tone={runTone(row.status)} />,
    },
    {
      key: 'score',
      header: 'Score',
      sortValue: (row) => row.score ?? -1,
      render: (row) =>
        row.score === null ? '—' : `${row.score}%`,
    },
    {
      key: 'pending',
      header: 'Pending review',
      sortValue: (row) => pendingCount(row.id),
      render: (row) => String(pendingCount(row.id)),
    },
    {
      key: 'created',
      header: 'Started',
      sortValue: (row) => row.created_at,
      render: (row) => new Date(row.created_at).toLocaleString(),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button
          variant="outline"
          onClick={() => setSelectedRun(row)}
        >
          View findings
        </Button>
      ),
    },
  ];

  const selectedFindings = selectedRun
    ? findingsForRun(selectedRun.id)
    : [];

  return (
    <section aria-labelledby="scanner-heading">
      <div className="page-header">
        <div>
          <h1 id="scanner-heading">Guesthouse Scanner</h1>
          <p className="page-description">
            Manual site scans with per-finding review. Scans fetch one
            page per run, respect robots.txt, and are rate limited per
            target. Findings never change property knowledge until a
            reviewer approves them.
          </p>
        </div>
        {properties.length > 0 && (
          <Button onClick={openDialog}>Start scan</Button>
        )}
      </div>
      <DataTable
        columns={columns}
        rows={runs}
        rowKey={(row) => row.id}
        emptyMessage="No scans yet. Start a scan to audit a property website."
        emptyAction={
          properties.length > 0 ? <Button onClick={openDialog}>Start scan</Button> : undefined
        }
      />

      <Dialog
        open={dialogOpen}
        title="Start a scan"
        onClose={() => setDialogOpen(false)}
        describedBy="scan-dialog-description"
      >
        <p id="scan-dialog-description">
          The scanner fetches the target page once, checks reachability,
          HTTPS, discoverability, and contact details, then records
          findings for review.
        </p>
        <form onSubmit={handleStartScan} noValidate>
          <SelectField
            label="Property"
            value={form.propertyId}
            onChange={(event) =>
              setForm({
                ...form,
                propertyId: event.target.value,
                targetName:
                  properties.find((row) => row.id === event.target.value)
                    ?.name ?? form.targetName,
              })
            }
            required
          >
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </SelectField>
          <Field
            label="Target name"
            value={form.targetName}
            onChange={(event) =>
              setForm({ ...form, targetName: event.target.value })
            }
            required
          />
          <Field
            label="Target URL"
            type="url"
            placeholder="https://example-property.com"
            value={form.targetUrl}
            onChange={(event) =>
              setForm({ ...form, targetUrl: event.target.value })
            }
            helper="Only https targets can be scanned."
            required
          />
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
              Start scan
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={selectedRun !== null}
        title={`Findings: ${selectedRun?.target_name ?? ''}`}
        onClose={() => setSelectedRun(null)}
      >
        {selectedRun && (
          <div className="scanner-detail">
            <p className="page-description">
              {selectedRun.summary ?? 'No summary.'} Score:{' '}
              {selectedRun.score === null ? '—' : `${selectedRun.score}%`}.
              Target: {selectedRun.target_url ?? '—'}.
            </p>
            {selectedFindings.length === 0 ? (
              <p>No findings were recorded for this scan.</p>
            ) : (
              <ul className="findings-list">
                {selectedFindings.map((finding) => (
                  <li key={finding.id} className="finding-card">
                    <div className="finding-header">
                      <Badge
                        status={finding.severity}
                        tone={severityTone[finding.severity] ?? 'info'}
                      />
                      <p className="finding-title">{finding.title}</p>
                      <span className="table-secondary">
                        {Math.round(finding.confidence * 100)}% confidence
                      </span>
                      <Badge
                        status={finding.status.replace(/_/g, ' ')}
                        tone={findingTone[finding.status] ?? 'neutral'}
                      />
                    </div>
                    <p className="finding-category">
                      {finding.category} · source: {finding.source}
                    </p>
                    <p>{finding.finding}</p>
                    <p>
                      <strong>Recommended action:</strong>{' '}
                      {finding.recommendation}
                    </p>
                    {finding.status === 'pending_review' &&
                      canReviewRun(selectedRun) && (
                        <div className="dialog-actions">
                          <Button
                            variant="secondary"
                            disabled={submitting}
                            onClick={() => void handleReview(finding, 'rejected')}
                          >
                            Reject
                          </Button>
                          <Button
                            disabled={submitting}
                            onClick={() => void handleReview(finding, 'approved')}
                          >
                            Approve
                          </Button>
                        </div>
                      )}
                  </li>
                ))}
              </ul>
            )}
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
