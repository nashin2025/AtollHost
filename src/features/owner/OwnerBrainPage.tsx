import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, EmptyState, LoadingState } from '../../components/ui/States';
import { listKnowledgeItems, type KnowledgeItem } from '../../lib/knowledge';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';
import { useOwnerContext } from './OwnerPortalPage';

export function OwnerBrainPage() {
  const { allowedPropertyIds } = useOwnerContext();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error] = useState<string | null>(null);
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

  async function loadData() {
    if (!orgId) return;
    try {
      const itemsData: KnowledgeItem[] = [];
      for (const pid of allowedPropertyIds) {
        const items = await listKnowledgeItems(supabase!, pid);
        itemsData.push(...items);
      }
      setItems(itemsData);
      setState('ready');
    } catch {
      setState('error');
    }
  }

  useEffect(() => {
    loadOrgId().then(() => {
      if (orgId) loadData();
      else setState('ready');
    });
  }, [supabase, allowedPropertyIds]);

  if (state === 'loading') {
    return <LoadingState label="Loading knowledge base…" />;
  }
  if (state === 'error') {
    return <ErrorState message={error ?? 'Unknown error'} onRetry={loadData} />;
  }
  if (allowedPropertyIds.length === 0) {
    return (
      <EmptyState
        title="No property access"
        message="You don't have access to any properties yet. Contact your agency administrator."
        action={<Button onClick={() => window.location.href = paths.owner}>Go to dashboard</Button>}
      />
    );
  }

  return (
    <section aria-labelledby="page-heading">
      <header className="page-header">
        <h1 id="page-heading">Property Brain — Knowledge</h1>
        <p className="page-description">
          Verified facts for your properties. View categories, status, and version history.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="No knowledge items"
          message="No verified facts found for your properties."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Source</th>
                <th scope="col">Status</th>
                <th scope="col">Version</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link to={`${paths.brain}/${item.id}`} className="table-primary">
                      {item.title}
                    </Link>
                  </td>
                  <td>{item.source ?? '—'}</td>
                  <td>
                    <Badge status={item.status.replace(/_/g, ' ')} tone="info" />
                  </td>
                  <td>v{item.version}</td>
                  <td>{new Date(item.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}