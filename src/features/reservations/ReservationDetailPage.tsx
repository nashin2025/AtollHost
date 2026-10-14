import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingState, EmptyState } from '../../components/ui/States';
import { getReservation, type Reservation } from '../../lib/reservations';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

interface Props {
  reservationId: string;
}

export function ReservationDetailPage({ reservationId }: Props) {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reservation, setReservation] = useState<Reservation | null>(null);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) return;
    setStatus('loading');
    try {
      const res = await getReservation(supabase, reservationId);
      setReservation(res);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [reservationId]);

  useEffect(() => {
    if (hasAuth) void reload();
  }, [hasAuth, reload]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="reservation-heading">
        <h1 id="reservation-heading">Reservation</h1>
        <EmptyState title="Authentication required" message="Sign in to view reservation details." />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="reservation-heading">
        <h1 id="reservation-heading">Reservation</h1>
        <LoadingState label="Loading reservation details" />
      </section>
    );
  }

  if (status === 'error' || !reservation) {
    return (
      <section aria-labelledby="reservation-heading">
        <h1 id="reservation-heading">Reservation</h1>
        <EmptyState title="Not found" message="Reservation could not be loaded." action={<Button variant="secondary" onClick={() => void reload()}>Retry</Button>} />
      </section>
    );
  }

  return (
    <section aria-labelledby="reservation-heading">
      <div className="page-header">
        <div>
          <h1 id="reservation-heading">Reservation</h1>
          <p className="page-description">
            {reservation.check_in ? new Date(reservation.check_in).toLocaleDateString() : ''} – {reservation.check_out ? new Date(reservation.check_out).toLocaleDateString() : ''}
            {' · '}
            <Badge status={reservation.status} tone={reservation.status === 'confirmed' ? 'success' : reservation.status === 'cancelled' ? 'danger' : 'info'} />
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link to={paths.reservations}>
            <Button variant="outline">Back to reservations</Button>
          </Link>
          <Button onClick={() => void reload()}>Refresh</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-6)' }}>
        <aside className="reservation-sidebar">
          <div className="card">
            <h3>Guest</h3>
            <p className="table-primary">
              {reservation.guest
                ? `${reservation.guest.first_name} ${reservation.guest.last_name}`
                : '—'}
            </p>
            <p className="table-secondary">{reservation.guest?.email ?? 'No email'}</p>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-4)' }}>
            <h3>Room</h3>
            <p className="table-primary">{reservation.room?.name ?? '—'}</p>
            <p className="table-secondary">{reservation.room?.type ?? 'No type'}</p>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-4)' }}>
            <h3>Dates</h3>
            <dl className="reservation-meta">
              <div>
                <dt>Check-in</dt>
                <dd>{reservation.check_in ? new Date(reservation.check_in).toLocaleString() : '—'}</dd>
              </div>
              <div>
                <dt>Check-out</dt>
                <dd>{reservation.check_out ? new Date(reservation.check_out).toLocaleString() : '—'}</dd>
              </div>
              <div>
                <dt>Nights</dt>
                <dd>
                  {reservation.check_in && reservation.check_out
                    ? Math.ceil((new Date(reservation.check_out).getTime() - new Date(reservation.check_in).getTime()) / (1000 * 60 * 60 * 24))
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-4)' }}>
            <h3>Occupancy</h3>
            <dl className="reservation-meta">
              <div>
                <dt>Adults</dt>
                <dd>{reservation.adults}</dd>
              </div>
              <div>
                <dt>Children</dt>
                <dd>{reservation.children}</dd>
              </div>
            </dl>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-4)' }}>
            <h3>Financial</h3>
            <dl className="reservation-meta">
              <div>
                <dt>Source</dt>
                <dd>{reservation.source}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>
                  {reservation.total_amount !== null && reservation.currency
                    ? `${reservation.currency} ${reservation.total_amount.toLocaleString()}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Currency</dt>
                <dd>{reservation.currency ?? '—'}</dd>
              </div>
            </dl>
          </div>

          {reservation.special_requests && (
            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              <h3>Special requests</h3>
              <p>{reservation.special_requests}</p>
            </div>
          )}
        </aside>

        <main className="reservation-main">
          <div className="card">
            <h2>Timeline</h2>
            <ul className="timeline">
              <li>
                <time>{reservation.created_at ? new Date(reservation.created_at).toLocaleString() : ''}</time>
                <span>Reservation created</span>
              </li>
              <li>
                <time>{reservation.updated_at ? new Date(reservation.updated_at).toLocaleString() : ''}</time>
                <span>Last updated</span>
              </li>
            </ul>
          </div>
        </main>
      </div>
    </section>
  );
}

export function ReservationDetailPageWrapper() {
  const { id } = useParams<{ id: string }>();
  return <ReservationDetailPage reservationId={id ?? ''} />;
}