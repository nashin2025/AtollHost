import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { ErrorState, EmptyState, LoadingState } from '../../components/ui/States';
import { listGuests, createGuest, updateGuest } from '../../lib/guests';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

interface Guest {
  id: string;
  property_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  passport_number: string | null;
  date_of_birth: string | null;
  created_at: string;
}

interface Props {
  propertyId?: string;
  allowedPropertyIds?: string[];
}

export function GuestsPage({ propertyId, allowedPropertyIds }: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    nationality: '',
    passport_number: '',
    date_of_birth: '',
  });

  const targetPropertyId = propertyId ?? allowedPropertyIds?.[0];

  async function load() {
    if (!supabase || !targetPropertyId) {
      setState('ready');
      return;
    }
    setState('loading');
    try {
      const { guests: data, total: count } = await listGuests(supabase, {
        property_id: targetPropertyId,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setGuests(data);
      setTotal(count);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guests');
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
      if (editingGuest) {
        await updateGuest(supabase, editingGuest.id, form);
      } else {
        await createGuest(supabase, { property_id: targetPropertyId, ...form });
      }
      setDialogOpen(false);
      setEditingGuest(null);
      setForm({ first_name: '', last_name: '', email: '', phone: '', nationality: '', passport_number: '', date_of_birth: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save guest');
    }
  }

  function openCreate() {
    setEditingGuest(null);
    setForm({ first_name: '', last_name: '', email: '', phone: '', nationality: '', passport_number: '', date_of_birth: '' });
    setDialogOpen(true);
  }

  function openEdit(guest: Guest) {
    setEditingGuest(guest);
    setForm({
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email ?? '',
      phone: guest.phone ?? '',
      nationality: guest.nationality ?? '',
      passport_number: guest.passport_number ?? '',
      date_of_birth: guest.date_of_birth ?? '',
    });
    setDialogOpen(true);
  }

  if (state === 'loading') return <LoadingState label="Loading guests…" />;
  if (state === 'error') return <ErrorState message={error ?? 'Unknown error'} onRetry={load} />;
  if (!targetPropertyId) {
    return (
      <EmptyState
        title="No property selected"
        message="Select a property to view its guests."
        action={<Link to={paths.properties}><Button>Go to properties</Button></Link>}
      />
    );
  }

  return (
    <section aria-labelledby="page-heading">
      <header className="page-header">
        <h1 id="page-heading">Guests</h1>
        <div>
          <Button onClick={openCreate}>Add Guest</Button>
        </div>
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
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 ? (
              <tr>
                <td colSpan={8} className="state-empty">No guests found.</td>
              </tr>
            ) : (
              guests.map((g) => (
                <tr key={g.id}>
                  <td>{g.first_name} {g.last_name}</td>
                  <td>{g.email ?? '—'}</td>
                  <td>{g.phone ?? '—'}</td>
                  <td>{g.nationality ?? '—'}</td>
                  <td>{g.passport_number ?? '—'}</td>
                  <td>{g.date_of_birth ? new Date(g.date_of_birth).toLocaleDateString() : '—'}</td>
                  <td>{new Date(g.created_at).toLocaleDateString()}</td>
                  <td>
                    <Button variant="ghost" onClick={() => openEdit(g)}>Edit</Button>
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

      <Dialog open={dialogOpen} title={editingGuest ? 'Edit Guest' : 'Add Guest'} onClose={() => { setDialogOpen(false); setEditingGuest(null); }}>
        <form onSubmit={handleSubmit} className="dialog-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="First name" value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} required />
            <Field label="Last name" value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
            <Field label="Phone" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="Nationality" value={form.nationality} onChange={(e) => setForm({...form, nationality: e.target.value})} />
            <Field label="Passport number" value={form.passport_number} onChange={(e) => setForm({...form, passport_number: e.target.value})} />
          </div>
          <Field label="Date of birth" type="date" value={form.date_of_birth} onChange={(e) => setForm({...form, date_of_birth: e.target.value})} />
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit">{editingGuest ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
export { GuestDetailPageWrapper } from './GuestDetailPage';