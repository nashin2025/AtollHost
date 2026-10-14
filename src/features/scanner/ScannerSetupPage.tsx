import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

type Step = 'property' | 'sources' | 'scope' | 'review' | 'running' | 'complete' | 'success' | 'error';

type WizardData = {
  propertyId: string;
  sources: string[];
  scope: 'full' | 'quick' | 'custom';
  customUrls: string;
  deepScan: boolean;
};

interface Props {
  propertyId?: string;
}

export function ScannerSetupPage({ propertyId: initialPropertyId }: Props) {
  const { id: paramPropertyId } = useParams<{ id: string }>();
  const propertyId = initialPropertyId ?? paramPropertyId ?? '';

  const [step, setStep] = useState<Step>('property');
  const [data, setData] = useState<WizardData>({
    propertyId: '',
    sources: ['website', 'google_business'],
    scope: 'full',
    customUrls: '',
    deepScan: false,
  });
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const hasAuth = supabase !== null;

  const loadProperty = useCallback(async () => {
    if (!supabase || !propertyId) return;
    const { data } = await supabase
      .from('properties')
      .select('id, name')
      .eq('id', propertyId)
      .single();
    if (data) {
      setData(prev => ({ ...prev, propertyId: data.id }));
    }
  }, [propertyId]);

useEffect(() => {
    if (hasAuth && propertyId) {
      loadProperty();
    }
  }, [hasAuth, propertyId, loadProperty]);

  const startScan = useCallback(async () => {
    if (!supabase || !data.propertyId) return;
    setStatus('running');
    setError(null);
    setProgress(0);
    setScanId(null);

    try {
      const response = await supabase.functions.invoke('start-scanner', {
        body: {
          property_id: data.propertyId,
          sources: data.sources,
          scope: data.scope,
          custom_urls: data.customUrls ? data.customUrls.split(',').map(u => u.trim()) : [],
          deep_scan: data.deepScan,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setScanId(response.data?.scan_id ?? null);
      setStatus('running');

      const pollInterval = setInterval(async () => {
        if (!supabase || !scanId) {
          clearInterval(pollInterval);
          return;
        }

        const { data: scan } = await supabase
          .from('scan_runs')
          .select('status, progress, completed_at')
          .eq('id', scanId)
          .single();

        if (scan) {
          setProgress(scan.progress ?? 0);
          if (scan.status === 'completed' || scan.status === 'failed') {
            clearInterval(pollInterval);
            setStatus(scan.status === 'completed' ? 'success' : 'error');
            if (scan.status === 'failed') {
              setError('Scan failed. Check the scan runs page for details.');
            }
            setStep('complete');
          }
        }
      }, 3000);

    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to start scan');
    }
  }, [supabase, data.propertyId, data.sources, data.scope, data.customUrls, data.deepScan]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="wizard-heading">
        <h1 id="wizard-heading">Scanner setup</h1>
        <ErrorState message="Authentication required. Sign in to configure scans." onRetry={() => {}} />
      </section>
    );
  }

  const steps = ['property', 'sources', 'scope', 'review', 'running', 'complete'];

  return (
    <section aria-labelledby="wizard-heading">
      <div className="page-header">
        <div>
          <h1 id="wizard-heading">Scanner setup</h1>
          <p className="page-description">
            Configure and run a digital presence scan for your property.
            Select sources, scope, and review before running.
          </p>
        </div>
      </div>

      <div className="wizard-progress" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
              <div style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: i <= steps.indexOf(step) ? 'var(--color-primary)' : 'var(--color-border)',
                color: i <= steps.indexOf(step) ? 'var(--color-primary-contrast)' : 'var(--color-text-muted)',
                fontWeight: 600,
                marginBottom: 'var(--space-2)',
              }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: i <= steps.indexOf(step) ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wizard-content" style={{ maxWidth: '700px' }}>
        {step === 'property' && (
          <div className="wizard-step">
            <h2>Select property</h2>
            <p className="page-description">Choose the property to scan.</p>
            {propertyId ? (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <Badge status="Selected" tone="success" />
                <p style={{ marginTop: 'var(--space-2)' }}>Property ID: {propertyId}</p>
              </div>
            ) : (
              <Field
                label="Property ID"
                value={data.propertyId}
                onChange={e => setData(prev => ({ ...prev, propertyId: e.target.value }))}
                required
                placeholder="Enter property UUID"
              />
            )}
          </div>
        )}

        {step === 'sources' && (
          <div className="wizard-step">
            <h2>Select sources</h2>
            <p className="page-description">Choose which public sources to scan.</p>
            <div style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              {[
                { value: 'website', label: 'Website', description: 'Main property website' },
                { value: 'google_business', label: 'Google Business', description: 'Google Maps/Business listing' },
                { value: 'social_facebook', label: 'Facebook', description: 'Facebook page' },
                { value: 'social_instagram', label: 'Instagram', description: 'Instagram profile' },
                { value: 'social_linkedin', label: 'LinkedIn', description: 'LinkedIn profile' },
                { value: 'social_x', label: 'X (Twitter)', description: 'X/Twitter profile' },
                { value: 'google_business', label: 'Google Business', description: 'Google Maps/Business listing' },
                { value: 'booking_engine', label: 'Booking engine', description: 'Direct booking engine' },
                { value: 'other', label: 'Other', description: 'Other public sources' },
              ].map(opt => (
                <label key={opt.value} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                }}>
                  <input
                    type="checkbox"
                    checked={data.sources.includes(opt.value)}
                    onChange={e => setData(prev => ({
                      ...prev,
                      sources: e.target.checked
                        ? [...prev.sources, opt.value]
                        : prev.sources.filter(s => s !== opt.value),
                    }))}
                  />
                  <div>
                    <strong>{opt.label}</strong>
                    <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                      {opt.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 'scope' && (
          <div className="wizard-step">
            <h2>Select scope</h2>
            <p className="page-description">Choose the audit depth.</p>
            <div style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              {[
                { value: 'full' as const, label: 'Full audit', description: 'Check all available sources comprehensively' },
                { value: 'quick' as const, label: 'Quick scan', description: 'Check only primary sources (website, Google Business)' },
                { value: 'custom' as const, label: 'Custom scope', description: 'Specify custom URLs and sources' },
              ].map(opt => (
                <label key={opt.value} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  border: `2px solid ${data.scope === opt.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: data.scope === opt.value ? 'var(--color-primary-bg)' : 'transparent',
                  transition: 'all 150ms ease',
                }}>
                  <input
                    type="radio"
                    name="scope"
                    checked={data.scope === opt.value}
                    onChange={() => setData(prev => ({ ...prev, scope: opt.value }))}
                  />
                  <div>
                    <strong>{opt.label}</strong>
                    <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                      {opt.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {data.scope === 'custom' && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <Field
                  label="Custom URLs (comma-separated)"
                  value={data.customUrls}
                  onChange={e => setData(prev => ({ ...prev, customUrls: e.target.value }))}
                  placeholder="https://example.com, https://example.org"
                />
                <Field
                  label="Deep scan"
                  type="checkbox"
                  checked={data.deepScan}
                  onChange={e => setData(prev => ({ ...prev, deepScan: e.target.checked }))}
                  helper="More thorough but slower scan"
                />
              </div>
            )}
          </div>
        )}

        {step === 'review' && (
          <div className="wizard-step">
            <h2>Review configuration</h2>
            <p className="page-description">Review your settings before starting the scan.</p>
            <div style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
              <div className="card">
                <h3>Property</h3>
                <p>{data.propertyId || 'Not selected'}</p>
              </div>
              <div className="card">
                <h3>Sources</h3>
                <p>{data.sources.length > 0 ? data.sources.join(', ') : 'None selected'}</p>
              </div>
              <div className="card">
                <h3>Scope</h3>
                <p>{data.scope === 'custom' ? 'Custom' : data.scope}</p>
                {data.scope === 'custom' && data.customUrls && (
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                    Custom URLs: {data.customUrls}
                  </p>
                )}
              </div>
              <div className="card">
                <h3>Deep scan</h3>
                <p>{data.deepScan ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
          </div>
        )}

        {step === 'running' && (
          <div className="wizard-step" style={{ textAlign: 'center' }}>
            <h2>Running scan</h2>
            <div className="progress-bar" style={{ marginTop: 'var(--space-4)' }}>
              <div style={{
                width: `${progress}%`,
                height: '1rem',
                background: 'var(--color-primary)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 300ms ease',
              }} />
              <p style={{ marginTop: 'var(--space-2)' }}>{progress}% complete</p>
            </div>
            <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-muted)' }}>
              Scanning sources: {data.sources.join(', ')}
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="wizard-step" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', color: 'var(--color-success)' }}>✓</div>
            <h2>Scan completed</h2>
            <p style={{ marginTop: 'var(--space-2)' }}>The scan has completed successfully.</p>
          </div>
        )}

        {step === 'error' && (
          <div className="wizard-step" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', color: 'var(--color-danger)' }}>✗</div>
            <h2>Scan failed</h2>
            <p style={{ marginTop: 'var(--space-2)', color: 'var(--color-danger)' }}>
              {error ?? 'An unknown error occurred'}
            </p>
          </div>
        )}

        {step === 'complete' && (
          <div className="wizard-step" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', color: 'var(--color-success)' }}>✓</div>
            <h2>Setup complete</h2>
            <p style={{ marginTop: 'var(--space-2)' }}>
              The scanner is configured. You can now run scans from the Scanner page.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <Link to={paths.scanner}>
                <Button>Go to Scanner</Button>
              </Link>
              <Button variant="outline" onClick={() => { setStep('property' as Step); setData({ propertyId: '', sources: ['website', 'google_business'], scope: 'full', customUrls: '', deepScan: false }); }}>
                New scan
              </Button>
            </div>
          </div>
        )}

        <div className="wizard-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-8)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--color-border)' }}>
          <Button
            variant="outline"
            onClick={() => {
              const steps = ['property', 'sources', 'scope', 'review', 'running', 'complete'];
              const currentIndex = steps.indexOf(step);
              if (currentIndex > 0) {
                setStep(steps[currentIndex - 1] as Step);
              }
            }}
            disabled={['property', 'running', 'success', 'error', 'complete'].includes(step)}
          >
            Back
          </Button>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {step === 'error' && (
              <Button variant="outline" onClick={() => {
                setStep('review' as Step);
              }}>
                Retry
              </Button>
            )}
{(step === 'review' || step === 'running') && (
              <Button
                onClick={step === 'review' ? startScan : undefined}
                loading={status === 'running'}
                disabled={status === 'running'}
              >
                {step === 'review' ? 'Start scan' : 'Running...'}
              </Button>
            )}
            {step === 'success' && (
              <Link to={paths.scanner}>
                <Button>Go to Scanner</Button>
              </Link>
            )}
            {step === 'complete' && (
              <>
                <Link to={paths.scanner}>
                  <Button>Go to Scanner</Button>
                </Link>
                <Button variant="outline" onClick={() => { setStep('property'); setData({ propertyId: '', sources: ['website', 'google_business'], scope: 'full', customUrls: '', deepScan: false }); }}>
                  New scan
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}