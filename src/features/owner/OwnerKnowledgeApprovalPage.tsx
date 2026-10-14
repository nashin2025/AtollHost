import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ErrorState, EmptyState, LoadingState } from '../../components/ui/States';
import { listKnowledgeItems, type KnowledgeItem, reviewKnowledgeFact } from '../../lib/knowledge';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';
import { useOwnerContext } from './OwnerPortalPage';

export function OwnerKnowledgeApprovalPage() {
  const { allowedPropertyIds } = useOwnerContext();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  async function load() {
    setState('loading');
    try {
      const all: KnowledgeItem[] = [];
      for (const pid of allowedPropertyIds) {
        const items = await listKnowledgeItems(supabase!, pid);
        all.push(...items);
      }
      const pending = all.filter(i => i.status === 'pending_review');
      setItems(pending);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge items');
      setState('error');
    }
  }

  useEffect(() => {
    if (supabase && allowedPropertyIds.length > 0) {
      load();
    } else {
      setState('ready');
    }
  }, [supabase, allowedPropertyIds]);

  async function handleReview(id: string, action: 'approve' | 'reject') {
    setReviewingId(id);
    try {
      await reviewKnowledgeFact(supabase!, id, action === 'approve' ? 'approved' : 'rejected');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review');
    } finally {
      setReviewingId(null);
    }
  }

  if (state === 'loading') {
    return <LoadingState label="Loading items for review…" />;
  }
  if (state === 'error') {
    return <ErrorState message={error ?? 'Unknown error'} onRetry={load} />;
  }
  if (allowedPropertyIds.length === 0) {
    return (
      <EmptyState
        title="No property access"
        message="You don't have access to any properties yet. Contact your agency administrator."
      />
    );
  }

  return (
    <section aria-labelledby="page-heading">
      <header className="page-header">
        <h1 id="page-heading">Knowledge Approval</h1>
        <p className="page-description">
          Review and approve pending knowledge items for your properties.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="No pending items"
          message="All knowledge items are up to date."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Source</th>
                <th scope="col">Submitted</th>
                <th scope="col">Actions</th>
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
                  <td>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Button
                        variant="outline"
                        loading={reviewingId === item.id}
                        onClick={() => void handleReview(item.id, 'approve')}
                        disabled={reviewingId !== null}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        loading={reviewingId === item.id}
                        onClick={() => void handleReview(item.id, 'reject')}
                        disabled={reviewingId !== null}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}