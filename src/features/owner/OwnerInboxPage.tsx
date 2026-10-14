import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { listConversations } from '../../lib/enquiries';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';
import { useOwnerContext } from './OwnerPortalPage';

interface Conversation {
  id: string;
  property_id: string;
  guest_id: string | null;
  enquiry_id: string | null;
  channel: string;
  external_thread_id: string | null;
  human_takeover: boolean;
  automation_paused: boolean;
  created_at: string;
  updated_at: string;
  property?: { name: string };
}

export function OwnerInboxPage() {
  const { allowedPropertyIds } = useOwnerContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setState('loading');
    try {
      const results = await Promise.all(
        allowedPropertyIds.map((pid) =>
          listConversations(supabase!, pid),
        ),
      );
      setConversations(results.flat());
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
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
    return <LoadingState label="Loading conversations…" />;
  }
  if (state === 'error') {
    return <ErrorState message={error ?? 'Unknown error'} onRetry={load} />;
  }

  return (
    <section aria-labelledby="page-heading">
      <header className="page-header">
        <h1 id="page-heading">Inbox</h1>
        <p className="page-description">
          Guest conversations for your properties. Open a conversation to view messages and reply.
        </p>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Guest</th>
              <th scope="col">Channel</th>
              <th scope="col">Status</th>
              <th scope="col">Last message</th>
            </tr>
          </thead>
          <tbody>
            {conversations.length === 0 ? (
              <tr>
                <td colSpan={4} className="state-empty">
                  No conversations found for your properties.
                </td>
              </tr>
            ) : (
              conversations.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`${paths.inbox}/${c.id}`} className="table-primary">
                      {c.guest_id ?? 'Guest'}
                    </Link>
                  </td>
                  <td>{c.channel}</td>
                  <td>
                    <span className={`badge badge-${c.human_takeover ? 'warning' : 'info'}`}>
                      {c.human_takeover ? 'Takeover' : 'Automated'}
                    </span>
                  </td>
                  <td>
                    {new Date(c.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}