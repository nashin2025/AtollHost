import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, EmptyState, LoadingState } from '../../components/ui/States';
import { listIntegrations, type Integration } from '../../lib/integrations';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';
import { useOwnerContext } from './OwnerPortalPage';

export function OwnerIntegrationsPage() {
  const { allowedPropertyIds } = useOwnerContext();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) return;
    setState('loading');
    try {
      const results = await Promise.all(
        allowedPropertyIds.map((pid) =>
          listIntegrations(supabase!, pid),
        ),
      );
      setIntegrations(results.flat());
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
      <section aria-labelledby="integrations-heading">
        <h1 id="integrations-heading">Integrations</h1>
        <EmptyState title="Authentication required" message="Sign in to view integrations." />
      </section>
    );
  }

  if (state === 'loading') {
    return (
      <section aria-labelledby="integrations-heading">
        <h1 id="integrations-heading">Integrations</h1>
        <LoadingState label="Loading integrations" />
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section aria-labelledby="integrations-heading">
        <h1 id="integrations-heading">Integrations</h1>
        <ErrorState message="Integrations could not be loaded." onRetry={() => void reload()} />
      </section>
    );
  }

  if (integrations.length === 0) {
    return (
      <EmptyState
        title="No integrations"
        message="No integrations configured for your properties."
      />
    );
  }

  return (
    <section aria-labelledby="integrations-heading">
      <header className="page-header">
        <h1 id="integrations-heading">Integrations</h1>
        <p className="page-description">
          Third-party integrations for your properties. View connection status and health.
        </p>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Provider</th>
              <th scope="col">Status</th>
              <th scope="col">Last check</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((integration) => (
              <tr key={integration.id}>
                <td>
                  <Link to={`${paths.integrations}/${integration.id}`} className="table-primary">
                    {integration.provider}
                  </Link>
                </td>
                <td>
                  <Badge
                    status={integration.status}
                    tone={
                      integration.status === 'connected' ? 'success'
                      : integration.status === 'error' ? 'danger'
                      : 'warning'
                    }
                  />
                </td>
                <td>
                  {integration.last_health_check
                    ? new Date(integration.last_health_check).toLocaleString()
                    : 'Never'}
                </td>
                <td>
                  <Link to={`${paths.integrations}/${integration.id}`}>
                    <Button variant="ghost">View</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}