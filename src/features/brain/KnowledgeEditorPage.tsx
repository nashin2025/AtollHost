import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { SelectField } from '../../components/ui/Field';
import { ErrorState, EmptyState, LoadingState } from '../../components/ui/States';
import { listKnowledgeItems, listKnowledgeCategories, createKnowledgeFact, reviewKnowledgeFact } from '../../lib/knowledge';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

interface KnowledgeItem {
  id: string;
  property_id: string;
  category_id: string | null;
  title: string;
  content: string;
  source: string | null;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
  category?: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  propertyId?: string;
  allowedPropertyIds?: string[];
}

export function KnowledgeEditorPage({ propertyId, allowedPropertyIds }: Props) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [form, setForm] = useState({
    category_id: '',
    title: '',
    content: '',
    source: '',
    status: 'draft',
  });

  const targetPropertyId = propertyId ?? allowedPropertyIds?.[0];

  async function load() {
    if (!supabase || !targetPropertyId) {
      setState('ready');
      return;
    }
    setState('loading');
    try {
      const [data, cats] = await Promise.all([
        listKnowledgeItems(supabase, targetPropertyId),
        listKnowledgeCategories(supabase, targetPropertyId),
      ]);
      setItems(data);
      setTotal(data.length);
      setCategories(cats);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge');
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
        fact_key: null,
        organization_id: '',
        property_id: targetPropertyId,
        category_id: form.category_id || null,
        title: form.title,
        content: form.content,
        source: form.source,
        expires_at: null,
      };
      if (editingItem) {
        // For editing, use reviewKnowledgeFact to update status, or we'd need an update function
        await reviewKnowledgeFact(supabase, editingItem.id, form.status as 'pending_review' | 'approved' | 'rejected' | 'expired');
      } else {
        await createKnowledgeFact(supabase, input);
      }
      setDialogOpen(false);
      setEditingItem(null);
      setForm({ category_id: '', title: '', content: '', source: '', status: 'draft' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save knowledge');
    }
  }

  function openCreate() {
    setEditingItem(null);
    setForm({ category_id: '', title: '', content: '', source: '', status: 'draft' });
    setDialogOpen(true);
  }

  function openEdit(item: KnowledgeItem) {
    setEditingItem(item);
    setForm({
      category_id: item.category_id ?? '',
      title: item.title,
      content: item.content,
      source: item.source ?? '',
      status: item.status,
    });
    setDialogOpen(true);
  }

  if (state === 'loading') return <LoadingState label="Loading knowledge base…" />;
  if (state === 'error') return <ErrorState message={error ?? 'Unknown error'} onRetry={load} />;
  if (!targetPropertyId) {
    return (
      <EmptyState
        title="No property selected"
        message="Select a property to manage its knowledge base."
        action={<Button onClick={() => window.location.href = paths.properties}>Go to properties</Button>}
      />
    );
  }

  return (
    <section aria-labelledby="page-heading">
      <header className="page-header">
        <h1 id="page-heading">Property Brain — Knowledge Editor</h1>
        <div>
          <Button onClick={openCreate}>Add Knowledge Item</Button>
        </div>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Category</th>
              <th scope="col">Source</th>
              <th scope="col">Status</th>
              <th scope="col">Version</th>
              <th scope="col">Updated</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="state-empty">No knowledge items. Create your first entry.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link to={`${paths.brain}/${item.id}`} className="table-primary">
                      {item.title}
                    </Link>
                  </td>
                  <td>{item.category?.name ?? 'Uncategorized'}</td>
                  <td>{item.source ?? '—'}</td>
                  <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
                  <td>v{item.version}</td>
                  <td>{new Date(item.updated_at).toLocaleDateString()}</td>
                  <td>
                    <Button variant="ghost" onClick={() => openEdit(item)}>Edit</Button>
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

      <Dialog open={dialogOpen} title={editingItem ? 'Edit Knowledge Item' : 'Add Knowledge Item'} onClose={() => { setDialogOpen(false); setEditingItem(null); }}>
        <form onSubmit={handleSubmit} className="dialog-body">
          <SelectField label="Category" value={form.category_id} onChange={(e) => setForm({...form, category_id: e.target.value})}>
            <option value="">Uncategorized</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
          <Field label="Title" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
          <div className="field">
            <label htmlFor="knowledge-content">Content</label>
            <textarea
              id="knowledge-content"
              value={form.content}
              onChange={(e) => setForm({...form, content: e.target.value})}
              required
              style={{ minHeight: '200px', width: '100%' }}
            />
            <p className="field-helper">Markdown supported</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="Source" value={form.source} onChange={(e) => setForm({...form, source: e.target.value})} required helper="e.g. website, brochure, staff input" />
            <SelectField label="Status" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </SelectField>
          </div>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit">{editingItem ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}