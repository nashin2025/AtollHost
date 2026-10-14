import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/States';
import { ErrorState } from '../../components/ui/States';
import { LoadingState } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';
import { SelectField } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { listMyMemberships, type Membership } from '../../lib/memberships';
import { listProperties, type Property } from '../../lib/properties';
import {
  listFindings,
  listScannerRuns,
  normalizeTargetUrl,
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

function scoreBand(score: number | null): 'high' | 'mid' | 'low' | 'none' {
  if (score === null) {
    return 'none';
  }
  if (score >= 80) {
    return 'high';
  }
  if (score >= 50) {
    return 'mid';
  }
  return 'low';
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
    const targetUrl = normalizeTargetUrl(form.targetUrl);
    if (targetUrl === null) {
      setError(
        'Enter a full target address starting with https://, for example https://your-property.com.',
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await startScannerRun(supabase, {
        organization_id: property.organization_id,
        property_id: property.id,
        target_name: form.targetName,
        target_url: targetUrl,
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
      {runs.length === 0 ? (
        <EmptyState
          title="No scans yet"
          message="Start a scan to audit a property website. The scanner fetches one page, then records findings for review."
          action={
            properties.length > 0 ? (
              <Button onClick={openDialog}>Start scan</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="scan-grid">
          {runs.map((run) => {
            const pending = pendingCount(run.id);
            return (
              <article key={run.id} className="scan-card">
                <header className="scan-card-header">
                  <span className="scan-card-icon">
                    <Icon>
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </Icon>
                  </span>
                  <div className="scan-card-title">
                    <h2>{run.target_name}</h2>
                    <p className="scan-card-url">{run.target_url ?? 'No target URL'}</p>
                  </div>
                  <Badge status={run.status} tone={runTone(run.status)} />
                </header>
                <div className={`scan-score scan-score-${scoreBand(run.score)}`}>
                  <span className="scan-score-track" aria-hidden="true">
                    <span
                      className="scan-score-fill"
                      style={{ width: `${run.score ?? 0}%` }}
                    />
                  </span>
                  <span className="scan-score-value">
                    {run.score === null ? 'Not scored' : `${run.score}%`}
                  </span>
                </div>
                <dl className="scan-card-meta">
                  <div>
                    <dt>Property</dt>
                    <dd>{run.property?.name ?? 'Organization-wide'}</dd>
                  </div>
                  <div>
                    <dt>Started</dt>
                    <dd>{new Date(run.created_at).toLocaleString()}</dd>
                  </div>
                </dl>
                <footer className="scan-card-actions">
                  {pending > 0 ? (
                    <Badge
                      status={`${pending} awaiting review`}
                      tone="warning"
                    />
                  ) : (
                    <span className="table-secondary">Nothing to review</span>
                  )}
                  <Button variant="outline" onClick={() => setSelectedRun(run)}>
                    View findings
                  </Button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

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
            helper="Only https targets can be scanned. Leave off the scheme and we add https:// for you."
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
            <div className={`scan-detail-score scan-score-${scoreBand(selectedRun.score)}`}>
              <p className="finding-summary">
                {selectedRun.summary ?? 'No summary.'}
              </p>
              <div className="scan-detail-score-value">
                <span className="table-secondary">Score</span>
                <strong>
                  {selectedRun.score === null
                    ? '—'
                    : `${selectedRun.score}%`}
                </strong>
                <span className="scan-score-track" aria-hidden="true">
                  <span
                    className="scan-score-fill"
                    style={{ width: `${selectedRun.score ?? 0}%` }}
                  />
                </span>
              </div>
              <p className="finding-category">
                Target: {selectedRun.target_url ?? '—'}
              </p>
            </div>
            <p className="finding-count">
              {selectedFindings.length}{' '}
              {selectedFindings.length === 1 ? 'finding' : 'findings'}
              {selectedFindings.length > 0 && (
                <> · {pendingCount(selectedRun.id)} awaiting review</>
              )}
            </p>
            {selectedFindings.length === 0 ? (
              <EmptyState
                title="No findings"
                message="No findings were recorded for this scan."
              />
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
                    <p className="finding-recommendation">
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
export { ScannerSetupPage } from './ScannerSetupPage';
