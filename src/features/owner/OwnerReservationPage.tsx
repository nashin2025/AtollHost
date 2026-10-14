import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, EmptyState, LoadingState } from '../../components/ui/States';
import { listReservations, type Reservation } from '../../lib/reservations';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';
import { useOwnerContext } from './OwnerPortalPage';

export function OwnerReservationPage() {
  const { allowedPropertyIds } = useOwnerContext();
  const [reservations, setReservations] = useState<Reservation[]>([]);
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
          listReservations(supabase!, {
            property_id: pid,
            limit: pageSize,
            offset: (page - 1) * pageSize,
          }),
        ),
      );
      const all = results.flatMap((r) => r.reservations);
      setReservations(all);
      setTotal(results.reduce((sum, r) => sum + r.total, 0));
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservations');
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
    return <LoadingState label="Loading reservations…" />;
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
        <h1 id="page-heading">Reservations</h1>
        <p className="page-description">
          Reservations for your properties. View guest details, dates, and amounts.
        </p>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Guest</th>
              <th scope="col">Room</th>
              <th scope="col">Check-in</th>
              <th scope="col">Check-out</th>
              <th scope="col">Guests</th>
              <th scope="col">Source</th>
              <th scope="col">Status</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={8} className="state-empty">
                  No reservations found for your properties.
                </td>
              </tr>
            ) : (
              reservations.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`${paths.ownerReservations}/${r.id}`} className="table-primary">
                      {r.guest
                        ? `${r.guest.first_name} ${r.guest.last_name}`
                        : '—'}
                    </Link>
                  </td>
                  <td>{r.room?.name ?? '—'}</td>
                  <td>{new Date(r.check_in).toLocaleDateString()}</td>
                  <td>{new Date(r.check_out).toLocaleDateString()}</td>
                  <td>{r.adults} adults, {r.children} children</td>
                  <td>{r.source}</td>
                  <td>
                    <Badge
                      status={r.status}
                      tone={
                        r.status === 'confirmed' ? 'success'
                        : r.status === 'cancelled' ? 'danger'
                        : 'info'
                      }
                    />
                  </td>
                  <td>
                    {r.total_amount !== null && r.currency
                      ? `${r.currency} ${r.total_amount.toLocaleString()}`
                      : '—'}
                  </td>
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