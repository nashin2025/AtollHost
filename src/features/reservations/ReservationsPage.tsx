import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { ErrorState, EmptyState, LoadingState } from '../../components/ui/States';
import { listReservations, createReservation, updateReservation } from '../../lib/reservations';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

interface Reservation {
  id: string;
  property_id: string;
  guest_id: string | null;
  room_id: string | null;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  source: string;
  status: string;
  total_amount: number | null;
  currency: string | null;
  special_requests: string | null;
  created_at: string;
  guest?: { first_name: string; last_name: string; email: string | null } | null;
  room?: { name: string; type: string } | null;
}

interface Props {
  propertyId?: string;
  allowedPropertyIds?: string[];
}

export function ReservationsPage({ propertyId, allowedPropertyIds }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [form, setForm] = useState({
    guest_id: '',
    room_id: '',
    check_in: '',
    check_out: '',
    adults: 2,
    children: 0,
    source: 'manual',
    status: 'confirmed',
    total_amount: '',
    currency: 'USD',
    special_requests: '',
  });

  const targetPropertyId = propertyId ?? allowedPropertyIds?.[0];

  async function load() {
    if (!supabase || !targetPropertyId) {
      setState('ready');
      return;
    }
    setState('loading');
    try {
      const { reservations: data, total: count } = await listReservations(supabase, {
        property_id: targetPropertyId,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setReservations(data);
      setTotal(count);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservations');
      setState('error');
    }
  }

  useEffect(() => {
    load();
  }, [supabase, targetPropertyId, page]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !targetPropertyId) return;
    try {
      const input = {
        property_id: targetPropertyId,
        guest_id: form.guest_id || null,
        room_id: form.room_id || null,
        check_in: form.check_in,
        check_out: form.check_out,
        adults: form.adults,
        children: form.children,
        source: form.source,
        status: form.status,
        total_amount: form.total_amount ? Number(form.total_amount) : null,
        currency: form.currency,
        special_requests: form.special_requests || null,
      };
      if (editingReservation) {
        await updateReservation(supabase, editingReservation.id, input);
      } else {
        await createReservation(supabase, input);
      }
      setDialogOpen(false);
      setEditingReservation(null);
      setForm({ guest_id: '', room_id: '', check_in: '', check_out: '', adults: 2, children: 0, source: 'manual', status: 'confirmed', total_amount: '', currency: 'USD', special_requests: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reservation');
    }
  }

  function openCreate() {
    setEditingReservation(null);
    setForm({ guest_id: '', room_id: '', check_in: '', check_out: '', adults: 2, children: 0, source: 'manual', status: 'confirmed', total_amount: '', currency: 'USD', special_requests: '' });
    setDialogOpen(true);
  }

  function openEdit(res: Reservation) {
    setEditingReservation(res);
    setForm({
      guest_id: res.guest_id ?? '',
      room_id: res.room_id ?? '',
      check_in: res.check_in,
      check_out: res.check_out,
      adults: res.adults,
      children: res.children,
      source: res.source,
      status: res.status,
      total_amount: res.total_amount?.toString() ?? '',
      currency: res.currency ?? 'USD',
      special_requests: res.special_requests ?? '',
    });
    setDialogOpen(true);
  }

  if (state === 'loading') return <LoadingState label="Loading reservations…" />;
  if (state === 'error') return <ErrorState message={error ?? 'Unknown error'} onRetry={load} />;
  if (!targetPropertyId) {
    return (
      <EmptyState
        title="No property selected"
        message="Select a property to view its reservations."
        action={<Button onClick={() => window.location.href = paths.properties}>Go to properties</Button>}
      />
    );
  }

  return (
    <section aria-labelledby="page-heading">
      <header className="page-header">
        <h1 id="page-heading">Reservations</h1>
        <div>
          <Button onClick={openCreate}>Add Reservation</Button>
        </div>
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
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={9} className="state-empty">No reservations found.</td>
              </tr>
            ) : (
              reservations.map((r) => (
                <tr key={r.id}>
                  <td>{r.guest ? `${r.guest.first_name} ${r.guest.last_name}` : '—'}</td>
                  <td>{r.room?.name ?? '—'}</td>
                  <td>{new Date(r.check_in).toLocaleDateString()}</td>
                  <td>{new Date(r.check_out).toLocaleDateString()}</td>
                  <td>{r.adults} adults, {r.children} children</td>
                  <td>{r.source}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td>{r.total_amount ? `${r.currency} ${r.total_amount.toLocaleString()}` : '—'}</td>
                  <td>
                    <Button variant="ghost" onClick={() => openEdit(r)}>Edit</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {total > pageSize && (
          <div className="table-pagination">
            <p>Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}</p>
            <div className="table-pagination-actions">
              <Button variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="ghost" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} title={editingReservation ? 'Edit Reservation' : 'Add Reservation'} onClose={() => { setDialogOpen(false); setEditingReservation(null); }}>
        <form onSubmit={handleSubmit} className="dialog-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="Guest ID" value={form.guest_id} onChange={(e) => setForm({...form, guest_id: e.target.value})} helper="Enter existing guest UUID" />
            <Field label="Room ID" value={form.room_id} onChange={(e) => setForm({...form, room_id: e.target.value})} helper="Enter existing room UUID" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="Check-in" type="date" value={form.check_in} onChange={(e) => setForm({...form, check_in: e.target.value})} required />
            <Field label="Check-out" type="date" value={form.check_out} onChange={(e) => setForm({...form, check_out: e.target.value})} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="Adults" type="number" value={form.adults} onChange={(e) => setForm({...form, adults: Number(e.target.value)})} required />
            <Field label="Children" type="number" value={form.children} onChange={(e) => setForm({...form, children: Number(e.target.value)})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="Source" value={form.source} onChange={(e) => setForm({...form, source: e.target.value})} />
            <Field label="Status" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="Total amount" type="number" value={form.total_amount} onChange={(e) => setForm({...form, total_amount: e.target.value})} step="0.01" />
            <Field label="Currency" value={form.currency} onChange={(e) => setForm({...form, currency: e.target.value})} />
          </div>
          <div className="field">
            <label htmlFor="special-requests">Special requests</label>
            <textarea
              id="special-requests"
              value={form.special_requests}
              onChange={(e) => setForm({...form, special_requests: e.target.value})}
              style={{ minHeight: '80px', width: '100%' }}
            />
          </div>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit">{editingReservation ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
export { ReservationDetailPageWrapper } from './ReservationDetailPage';