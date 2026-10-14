import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, EmptyState, LoadingState } from '../../components/ui/States';
import { listProperties, type Property } from '../../lib/properties';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';
import { useOwnerContext } from './OwnerPortalPage';

export function OwnerPropertyPage() {
  const { allowedPropertyIds } = useOwnerContext();
  const [properties, setProperties] = useState<Property[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) return;
    setState('loading');
    try {
      const props = await listProperties(supabase);
      const filtered = props.filter(p => allowedPropertyIds.includes(p.id));
      setProperties(filtered);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [allowedPropertyIds]);

  useEffect(() => {
    if (hasAuth) void reload();
  }, [hasAuth, reload]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="properties-heading">
        <h1 id="properties-heading">Properties</h1>
        <EmptyState title="Authentication required" message="Sign in to view your properties." />
      </section>
    );
  }

  if (state === 'loading') {
    return (
      <section aria-labelledby="properties-heading">
        <h1 id="properties-heading">Properties</h1>
        <LoadingState label="Loading properties" />
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section aria-labelledby="properties-heading">
        <h1 id="properties-heading">Properties</h1>
        <ErrorState message="Properties could not be loaded." onRetry={() => void reload()} />
      </section>
    );
  }

  if (properties.length === 0) {
    return (
      <section aria-labelledby="properties-heading">
        <div className="page-header">
          <div>
            <h1 id="properties-heading">Your Properties</h1>
            <p className="page-description">
              A read-only view of the properties you own, with only the metrics
              your agency has shared with you.
            </p>
          </div>
        </div>
        <EmptyState
          title="No properties shared with you yet"
          message="Your agency grants owner access from their workspace. Once they do, your property appears here."
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="properties-heading">
      <div className="page-header">
        <div>
          <h1 id="properties-heading">Your Properties</h1>
          <p className="page-description">
            A read-only view of the properties you own, with only the metrics
            your agency has shared with you.
          </p>
        </div>
      </div>

      <div className="property-grid">
        {properties.map((property) => (
          <article key={property.id} className="property-card">
            <header className="property-card-header">
              <div className="property-card-title">
                <h2>{property.name}</h2>
                <p className="property-card-location">
                  {property.island}{property.atoll ? `, ${property.atoll}` : ''}
                </p>
              </div>
              <Badge
                status={property.status}
                tone={
                  property.status === 'active' ? 'success'
                  : property.status === 'paused' ? 'warning'
                  : 'neutral'
                }
              />
            </header>
            <dl className="property-card-meta">
              <dt>Island</dt>
              <dd>{property.island}</dd>
              <dt>Atoll</dt>
              <dd>{property.atoll ?? '—'}</dd>
            </dl>
            <div className="property-card-actions">
              <Link to={`${paths.propertyDetail}/${property.id}`}>
                <Button variant="outline">View details</Button>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}