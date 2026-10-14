import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ErrorState, EmptyState, LoadingState } from '../../components/ui/States';
import { listGuests, type Guest } from '../../lib/guests';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';
import { useOwnerContext } from './OwnerPortalPage';

export function OwnerGuestPage() {
  const { allowedPropertyIds } = useOwnerContext();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  async function load() {
    setState('loading');
    try {
      const results = await Promise.all(
        allowedPropertyIds.map((pid) =>
          listGuests(supabase!, {
            property_id: pid,
            limit: pageSize,
            offset: (page - 1) * pageSize,
          }),
        ),
      );
      const all = results.flatMap((r) => r.guests);
      setGuests(all);
      setTotal(results.reduce((sum, r) => sum + r.total, 0));
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guests');
      setState('error');
    }
  }

  useEffect(() => {
    if (supabase && allowedPropertyIds.length > 0) {
      load();
    } else {
      setState('ready');
    }
  }, [supabase, allowedPropertyIds, page]);

  if (state === 'loading') {
    return <LoadingState label="Loading guests…" />;
  }
  if (state === 'error') {
    return <ErrorState message={error ?? 'Unknown error'} onRetry={load} />;
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
        <h1 id="page-heading">Guests</h1>
        <p className="page-description">
          Guest profiles for your properties. View contact details, preferences, and stay history.
        </p>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Phone</th>
              <th scope="col">Nationality</th>
              <th scope="col">Passport</th>
              <th scope="col">DOB</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 ? (
              <tr>
                <td colSpan={7} className="state-empty">
                  No guests found for your properties.
                </td>
              </tr>
            ) : (
              guests.map((g) => (
                <tr key={g.id}>
                  <td>
                    <Link to={`${paths.ownerGuests}/${g.id}`} className="table-primary">
                      {g.first_name} {g.last_name}
                    </Link>
                  </td>
                  <td>{g.email ?? '—'}</td>
                  <td>{g.phone ?? '—'}</td>
                  <td>{g.nationality ?? '—'}</td>
                  <td>{g.passport_number ?? '—'}</td>
                  <td>{g.date_of_birth ? new Date(g.date_of_birth).toLocaleDateString() : '—'}</td>
                  <td>{new Date(g.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {total > pageSize && (
          <div className="table-pagination">
            <p>
              Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="table-pagination-actions">
              <Button
                variant="ghost"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                disabled={page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}