import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, EmptyState, LoadingState } from '../../components/ui/States';
import { type Property } from '../../lib/properties';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';
import { useOwnerContext } from './OwnerPortalPage';

interface Props {
  propertyId: string;
}

export function OwnerPropertySettingsPage({ propertyId }: Props) {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [property, setProperty] = useState<Property | null>(null);

  const { allowedPropertyIds } = useOwnerContext();
  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) return;
    setStatus('loading');
    try {
      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();
      setProperty(data);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [propertyId]);

  useEffect(() => {
    if (hasAuth) void reload();
  }, [hasAuth, reload]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="settings-heading">
        <h1 id="settings-heading">Property settings</h1>
        <EmptyState title="Authentication required" message="Sign in to view property settings." />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="settings-heading">
        <h1 id="settings-heading">Property settings</h1>
        <LoadingState label="Loading property settings" />
      </section>
    );
  }

  if (status === 'error' || !property) {
    return (
      <section aria-labelledby="settings-heading">
        <h1 id="settings-heading">Property settings</h1>
        <ErrorState message="Property settings could not be loaded." onRetry={() => void reload()} />
      </section>
    );
  }

  if (!allowedPropertyIds.includes(propertyId)) {
    return (
      <section aria-labelledby="settings-heading">
        <h1 id="settings-heading">Property settings</h1>
        <ErrorState message="You don't have access to this property." onRetry={() => window.location.href = paths.ownerProperties} />
      </section>
    );
  }

  return (
    <section aria-labelledby="settings-heading">
      <div className="page-header">
        <div>
          <h1 id="settings-heading">{property.name} — Settings</h1>
          <p className="page-description">
            View and manage settings for this property. Changes may require agency approval.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link to={paths.ownerProperties}>
            <Button variant="outline">Back to properties</Button>
          </Link>
          <Button onClick={() => void reload()}>Refresh</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-6)' }}>
        <aside className="settings-sidebar">
          <div className="card">
            <h3>Basic info</h3>
            <dl className="settings-meta">
              <div>
                <dt>Property ID</dt>
                <dd>{property.id}</dd>
              </div>
              <div>
                <dt>Island</dt>
                <dd>{property.island}</dd>
              </div>
              <div>
                <dt>Atoll</dt>
                <dd>{property.atoll ?? '—'}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{property.phone ?? '—'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{property.email ?? '—'}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{property.address ?? '—'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd><Badge status={property.status} tone={property.status === 'active' ? 'success' : property.status === 'paused' ? 'warning' : 'neutral'} /></dd>
              </div>
            </dl>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-4)' }}>
            <h3>Ownership</h3>
            <dl className="settings-meta">
              <div>
                <dt>Organization</dt>
                <dd>{property.organization?.name ?? '—'}</dd>
              </div>
            </dl>
          </div>
        </aside>

        <main className="settings-main">
          <div className="card">
            <h2>Granted permissions</h2>
            <p className="settings-description">
              Your agency has granted you the following access to this property:
            </p>
            <ul className="permission-list">
              <li>View property dashboard</li>
              <li>View revenue metrics</li>
              <li>View occupancy metrics</li>
              <li>View reviews</li>
              <li>View tasks</li>
              <li>View knowledge base</li>
              <li>Run reports</li>
            </ul>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-6)' }}>
            <h2>Contact agency</h2>
            <p className="settings-description">
              Need changes to this property? Contact your agency administrator.
            </p>
            <Button variant="outline" onClick={() => window.location.href = paths.team}>
              View team & access
            </Button>
          </div>
        </main>
      </div>
    </section>
  );
}

export function OwnerPropertySettingsPageWrapper() {
  const { id } = useParams<{ id: string }>();
  return <OwnerPropertySettingsPage propertyId={id ?? ''} />;
}