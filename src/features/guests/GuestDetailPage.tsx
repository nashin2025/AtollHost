import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, LoadingState, EmptyState } from '../../components/ui/States';
import { getGuest, type Guest } from '../../lib/guests';
import { listReservations, type Reservation } from '../../lib/reservations';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

interface Props {
  guestId: string;
}

export function GuestDetailPage({ guestId }: Props) {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [guest, setGuest] = useState<Guest | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) return;
    setStatus('loading');
    try {
      const g = await getGuest(supabase, guestId);
      setGuest(g);
      if (g) {
        const { reservations: res } = await listReservations(supabase, {
          property_id: g.property_id,
          limit: 50,
          offset: 0,
        });
        const filtered = res.filter(r => r.guest_id === guestId);
        setReservations(filtered);
      }
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [guestId]);

  useEffect(() => {
    if (hasAuth) void reload();
  }, [hasAuth, reload]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="guest-heading">
        <h1 id="guest-heading">Guest</h1>
        <EmptyState title="Authentication required" message="Sign in to view guest details." />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="guest-heading">
        <h1 id="guest-heading">Guest</h1>
        <LoadingState label="Loading guest details" />
      </section>
    );
  }

  if (status === 'error' || !guest) {
    return (
      <section aria-labelledby="guest-heading">
        <h1 id="guest-heading">Guest</h1>
        <ErrorState message="Guest could not be loaded." onRetry={() => void reload()} />
      </section>
    );
  }

  return (
    <section aria-labelledby="guest-heading">
      <div className="page-header">
        <div>
          <h1 id="guest-heading">{guest.first_name} {guest.last_name}</h1>
          <p className="page-description">
            Created {guest.created_at ? new Date(guest.created_at).toLocaleString() : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link to={paths.guests}>
            <Button variant="outline">Back to guests</Button>
          </Link>
          <Button onClick={() => void reload()}>Refresh</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-6)' }}>
        <aside className="guest-sidebar">
          <div className="card">
            <h3>Contact details</h3>
            <dl className="guest-meta">
              <div>
                <dt>Email</dt>
                <dd>{guest.email ?? '—'}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{guest.phone ?? '—'}</dd>
              </div>
              <div>
                <dt>Nationality</dt>
                <dd>{guest.nationality ?? '—'}</dd>
              </div>
              <div>
                <dt>Passport</dt>
                <dd>{guest.passport_number ?? '—'}</dd>
              </div>
              <div>
                <dt>Date of birth</dt>
                <dd>{guest.date_of_birth ? new Date(guest.date_of_birth).toLocaleDateString() : '—'}</dd>
              </div>
            </dl>
          </div>

          {guest.preferences && Object.keys(guest.preferences).length > 0 && (
            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              <h3>Preferences</h3>
              <pre className="preferences-json">
                {JSON.stringify(guest.preferences, null, 2)}
              </pre>
            </div>
          )}
        </aside>

        <main className="guest-main">
          <div className="card">
            <h2>Stay history</h2>
            {reservations.length === 0 ? (
              <EmptyState title="No reservations" message="This guest has no recorded stays." />
            ) : (
              <ul className="reservation-list">
                {reservations.map((res) => (
                  <li key={res.id} className="reservation-item">
                    <div>
                      <p className="table-primary">
                        {res.room?.name ?? 'Room'} · {res.check_in ? new Date(res.check_in).toLocaleDateString() : ''} – {res.check_out ? new Date(res.check_out).toLocaleDateString() : ''}
                      </p>
                      <p className="table-secondary">
                        {res.adults} adults, {res.children} children · {res.source} · <Badge status={res.status} tone={res.status === 'confirmed' ? 'success' : res.status === 'cancelled' ? 'danger' : 'info'} />
                      </p>
                      {res.total_amount && (
                        <p className="table-secondary">{res.currency} {res.total_amount.toLocaleString()}</p>
                      )}
                      {res.special_requests && (
                        <p className="table-secondary">Requests: {res.special_requests}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}

export function GuestDetailPageWrapper() {
  const { id } = useParams<{ id: string }>();
  return <GuestDetailPage guestId={id ?? ''} />;
}