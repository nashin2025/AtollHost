import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { listContent } from '../../lib/content';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';
import { useOwnerContext } from './OwnerPortalPage';

interface ContentItem {
  id: string;
  property_id: string;
  organization_id: string;
  title: string;
  body: string | null;
  channel: string;
  source: 'manual' | 'integration';
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled';
  scheduled_for: string | null;
  published_at: string | null;
  external_id: string | null;
  external_url: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function OwnerContentPage() {
  const { allowedPropertyIds } = useOwnerContext();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setState('loading');
    try {
      const results = await Promise.all(
        allowedPropertyIds.map((pid) =>
          listContent(supabase!, pid),
        ),
      );
      setContent(results.flat());
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
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

  if (state === 'loading') {
    return <LoadingState label="Loading content…" />;
  }
  if (state === 'error') {
    return <ErrorState message={error ?? 'Unknown error'} onRetry={load} />;
  }

  return (
    <section aria-labelledby="page-heading">
      <header className="page-header">
        <h1 id="page-heading">Content</h1>
        <p className="page-description">
          Marketing content for your properties. View drafts, scheduled posts, and published content.
        </p>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Channel</th>
              <th scope="col">Status</th>
              <th scope="col">Scheduled</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {content.length === 0 ? (
              <tr>
                <td colSpan={5} className="state-empty">
                  No content found for your properties.
                </td>
              </tr>
            ) : (
              content.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`${paths.content}/${c.id}`} className="table-primary">
                      {c.title}
                    </Link>
                  </td>
                  <td>{c.channel}</td>
                  <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                  <td>
                    {c.scheduled_for
                      ? new Date(c.scheduled_for).toLocaleDateString()
                      : '—'}
                  </td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}