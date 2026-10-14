import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingState, EmptyState } from '../../components/ui/States';
import { type JourneyTemplate } from '../../lib/journeyTemplates';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

interface Props {
  templateId: string;
}

export function JourneyDetailPage({ templateId }: Props) {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [template, setTemplate] = useState<JourneyTemplate | null>(null);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) return;
    setStatus('loading');
    try {
      const { data } = await supabase
        .from('journey_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      setTemplate(data);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [templateId]);

  useEffect(() => {
    if (hasAuth) void reload();
  }, [hasAuth, reload]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="journey-heading">
        <h1 id="journey-heading">Journey template</h1>
        <EmptyState title="Authentication required" message="Sign in to view journey template details." />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="journey-heading">
        <h1 id="journey-heading">Journey template</h1>
        <LoadingState label="Loading journey template" />
      </section>
    );
  }

  if (status === 'error' || !template) {
    return (
      <section aria-labelledby="journey-heading">
        <h1 id="journey-heading">Journey template</h1>
        <EmptyState title="Not found" message="Journey template could not be loaded." action={<Button variant="secondary" onClick={() => void reload()}>Retry</Button>} />
      </section>
    );
  }

  const config = template.config as Record<string, unknown> | null;
  const steps = (config?.steps as Array<Record<string, unknown>>) ?? [];
  const exceptions = (config?.exceptions as Array<Record<string, unknown>>) ?? [];
  const requiredData = config?.required_data as Record<string, unknown> | null;
  const delayValue = config?.delay_value as string | number | null;
  const delayUnit = config?.delay_unit as string | null;

  return (
    <section aria-labelledby="journey-heading">
      <div className="page-header">
        <div>
          <h1 id="journey-heading">{template.name}</h1>
          <p className="page-description">
            {template.trigger_type} · {template.is_active ? 'Active' : 'Inactive'}
            {' · '}
            <Badge status={template.is_active ? 'Active' : 'Inactive'} tone={template.is_active ? 'success' : 'neutral'} />
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link to={paths.journey}>
            <Button variant="outline">Back to journey templates</Button>
          </Link>
          <Button onClick={() => void reload()}>Refresh</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-6)' }}>
        <aside className="journey-sidebar">
          <div className="card">
            <h3>Configuration</h3>
            <dl className="journey-meta">
              <div>
                <dt>Trigger</dt>
                <dd>{template.trigger_type}</dd>
              </div>
              <div>
                <dt>Delay</dt>
                <dd>{delayValue ?? '—'} {delayUnit ?? ''}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd><Badge status={template.is_active ? 'Active' : 'Inactive'} tone={template.is_active ? 'success' : 'neutral'} /></dd>
              </div>
            </dl>
          </div>

          {requiredData && Object.keys(requiredData).length > 0 && (
            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              <h3>Required data</h3>
              <pre className="journey-json">{JSON.stringify(requiredData, null, 2)}</pre>
            </div>
          )}

          <div className="card" style={{ marginTop: 'var(--space-4)' }}>
            <h3>Status</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <Button
                variant={template.is_active ? 'secondary' : 'primary'}
                onClick={() => {
                  if (!supabase) return;
                  supabase
                    .from('journey_templates')
                    .update({ is_active: !template.is_active })
                    .eq('id', templateId)
                    .then(() => reload());
                }}
              >
                {template.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        </aside>

        <main className="journey-main">
          <div className="card">
            <h2>Steps</h2>
            {steps.length > 0 ? (
              <ul className="journey-steps">
                {steps.map((step, index) => (
                  <li key={index} className="journey-step">
                    <div className="step-header">
                      <span className="step-number">Step {index + 1}</span>
                      <span className="step-type">{String(step.type ?? 'unknown')}</span>
                    </div>
                    <pre className="step-config">{JSON.stringify(step.config ?? {}, null, 2)}</pre>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No steps" message="This journey template has no steps configured." />
            )}
          </div>

          <div className="card" style={{ marginTop: 'var(--space-6)' }}>
            <h2>Exceptions</h2>
            {exceptions.length > 0 ? (
              <ul className="exception-list">
                {exceptions.map((exc, index) => (
                  <li key={index} className="exception-item">
                    <p className="exception-condition">{String(exc.condition ?? 'unknown')}</p>
                    <p className="exception-action">{String(exc.action ?? 'unknown')}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No exceptions" message="No exception rules configured." />
            )}
          </div>
        </main>
      </div>
    </section>
  );
}

export function JourneyDetailPageWrapper() {
  const { id } = useParams<{ id: string }>();
  return <JourneyDetailPage templateId={id ?? ''} />;
}