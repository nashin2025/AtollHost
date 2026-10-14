import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { listEnquiries } from '../../lib/enquiries';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';
import { useOwnerContext } from './OwnerPortalPage';

interface Enquiry {
  id: string;
  property_id: string;
  guest_id: string | null;
  reservation_id: string | null;
  channel: string;
  source: string | null;
  topic: string | null;
  subject: string | null;
  status: string;
  assigned_to: string | null;
  follow_up_at: string | null;
  outcome: string | null;
  external_id: string | null;
  unread: boolean;
  urgent: boolean;
  created_at: string;
  updated_at: string;
  property?: { name: string };
}

export function OwnerEnquiriesPage() {
  const { allowedPropertyIds } = useOwnerContext();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setState('loading');
    try {
      const results = await Promise.all(
        allowedPropertyIds.map((pid) =>
          listEnquiries(supabase!, pid),
        ),
      );
      setEnquiries(results.flat());
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load enquiries');
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
    return <LoadingState label="Loading enquiries…" />;
  }
  if (state === 'error') {
    return <ErrorState message={error ?? 'Unknown error'} onRetry={load} />;
  }

  return (
    <section aria-labelledby="page-heading">
      <header className="page-header">
        <h1 id="page-heading">Enquiries</h1>
        <p className="page-description">
          Enquiries for your properties. Filter by status and follow up on pending leads.
        </p>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Guest</th>
              <th scope="col">Source</th>
              <th scope="col">Status</th>
              <th scope="col">Follow-up</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {enquiries.length === 0 ? (
              <tr>
                <td colSpan={5} className="state-empty">
                  No enquiries found for your properties.
                </td>
              </tr>
            ) : (
              enquiries.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link to={`${paths.enquiries}/${e.id}`} className="table-primary">
                      {e.subject ?? e.topic ?? 'Enquiry'}
                    </Link>
                  </td>
                  <td>{e.source ?? e.channel}</td>
                  <td>
                    <span className={`badge badge-${e.status}`}>{e.status}</span>
                  </td>
                  <td>
                    {e.follow_up_at
                      ? new Date(e.follow_up_at).toLocaleDateString()
                      : '—'}
                  </td>
                  <td>
                    {new Date(e.created_at).toLocaleDateString()}
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