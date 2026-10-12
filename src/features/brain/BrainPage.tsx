import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/States';
import { ErrorState } from '../../components/ui/States';
import { LoadingState } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';
import { SelectField } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { listMyMemberships, type Membership } from '../../lib/memberships';
import { listProperties, type Property } from '../../lib/properties';
import {
  createKnowledgeFact,
  listKnowledgeCategories,
  listKnowledgeItems,
  retrieveKnowledgeFacts,
  reviewKnowledgeFact,
  type KnowledgeCategory,
  type KnowledgeFact,
  type KnowledgeItem,
} from '../../lib/knowledge';
import { supabase } from '../../lib/supabase';

const statusTone: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  draft: 'neutral',
  pending_review: 'warning',
  approved: 'success',
  rejected: 'danger',
  expired: 'neutral',
};

const transitionLabels: Record<string, string> = {
  pending_review: 'Submit for review',
  approved: 'Approve',
  rejected: 'Reject',
  expired: 'Expire',
};

type ReviewStatus = 'pending_review' | 'approved' | 'rejected' | 'expired';

function transitionsFor(item: KnowledgeItem): ReviewStatus[] {
  if (item.status === 'draft') {
    return ['pending_review', 'approved', 'rejected', 'expired'];
  }
  if (item.status === 'pending_review') {
    return ['approved', 'rejected', 'expired'];
  }
  if (item.status === 'approved') {
    return ['expired'];
  }
  return [];
}

interface FactForm {
  title: string;
  content: string;
  categoryId: string;
  source: string;
  expiresAt: string;
}

const emptyForm: FactForm = {
  title: '',
  content: '',
  categoryId: '',
  source: 'manual',
  expiresAt: '',
};

export function BrainPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [userPropertyRoles, setUserPropertyRoles] = useState<
    Record<string, string>
  >({});
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [form, setForm] = useState<FactForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedFacts, setVerifiedFacts] = useState<KnowledgeFact[] | null>(
    null,
  );
  const [verifiedLoading, setVerifiedLoading] = useState(false);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) {
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const [membershipRows, propertyRows] = await Promise.all([
        listMyMemberships(supabase),
        listProperties(supabase),
      ]);
      setMemberships(membershipRows);
      setProperties(propertyRows);
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: assignments } = await supabase
          .from('property_users')
          .select('property_id, role')
          .eq('user_id', userData.user.id)
          .eq('status', 'active');
        const roles: Record<string, string> = {};
        for (const row of (assignments ?? []) as Array<{
          property_id: string;
          role: string;
        }>) {
          roles[row.property_id] = row.role;
        }
        setUserPropertyRoles(roles);
      }
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (hasAuth) {
      void reload();
    }
  }, [hasAuth, reload]);

  const reloadPropertyData = useCallback(async () => {
    if (!supabase || selectedPropertyId === '') {
      setItems([]);
      setCategories([]);
      setVerifiedFacts(null);
      return;
    }
    try {
      const [itemRows, categoryRows] = await Promise.all([
        listKnowledgeItems(supabase, selectedPropertyId),
        listKnowledgeCategories(supabase, selectedPropertyId),
      ]);
      setItems(itemRows);
      setCategories(categoryRows);
      setVerifiedFacts(null);
    } catch {
      setItems([]);
      setCategories([]);
      setVerifiedFacts(null);
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    if (status === 'ready' && selectedPropertyId === '' && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [status, selectedPropertyId, properties]);

  useEffect(() => {
    if (status !== 'ready' || selectedPropertyId === '') {
      return;
    }
    void reloadPropertyData();
  }, [status, selectedPropertyId, reloadPropertyData]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="brain-heading">
        <h1 id="brain-heading">Property Brain</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to manage property knowledge."
        />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="brain-heading">
        <h1 id="brain-heading">Property Brain</h1>
        <LoadingState label="Loading property knowledge" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="brain-heading">
        <h1 id="brain-heading">Property Brain</h1>
        <ErrorState
          message="Property knowledge could not be loaded. Check your connection and try again."
          onRetry={() => void reload()}
        />
      </section>
    );
  }

  const adminOrgIds = new Set(
    memberships
      .filter((membership) => membership.role === 'agency_admin')
      .map((membership) => membership.organization_id),
  );

  const selectedProperty =
    properties.find((row) => row.id === selectedPropertyId) ?? null;

  const canReview =
    selectedProperty !== null &&
    (adminOrgIds.has(selectedProperty.organization_id) ||
      ['property_owner', 'property_manager'].includes(
        userPropertyRoles[selectedProperty.id] ?? '',
      ));

  const visibleItems = items.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const query = searchQuery.trim().toLowerCase();
      if (
        !item.title.toLowerCase().includes(query) &&
        !item.content.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  function openCreateDialog() {
    setForm(emptyForm);
    setError(null);
    setCreateDialogOpen(true);
  }

  function openEditDialog(item: KnowledgeItem) {
    setEditingItem(item);
    setForm({
      title: item.title,
      content: item.content,
      categoryId: item.category_id ?? '',
      source: item.source ?? 'manual',
      expiresAt: item.expires_at
        ? new Date(item.expires_at).toISOString().slice(0, 16)
        : '',
    });
    setError(null);
    setEditDialogOpen(true);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !selectedProperty) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createKnowledgeFact(supabase, {
        fact_key: null,
        organization_id: selectedProperty.organization_id,
        property_id: selectedProperty.id,
        category_id: form.categoryId || null,
        title: form.title,
        content: form.content,
        source: form.source,
        expires_at: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : null,
      });
      setCreateDialogOpen(false);
      await reloadPropertyData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !selectedProperty || !editingItem) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createKnowledgeFact(supabase, {
        fact_key: editingItem.fact_key,
        organization_id: selectedProperty.organization_id,
        property_id: selectedProperty.id,
        category_id: form.categoryId || null,
        title: form.title,
        content: form.content,
        source: form.source,
        expires_at: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : null,
      });
      setEditDialogOpen(false);
      setEditingItem(null);
      await reloadPropertyData();
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(item: KnowledgeItem, verdict: ReviewStatus) {
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await reviewKnowledgeFact(supabase, item.id, verdict);
      setSelectedItem(null);
      await reloadPropertyData();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoadVerified() {
    if (!supabase || selectedPropertyId === '') {
      return;
    }
    setVerifiedLoading(true);
    setError(null);
    try {
      const facts = await retrieveKnowledgeFacts(supabase, selectedPropertyId);
      setVerifiedFacts(facts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : null);
    } finally {
      setVerifiedLoading(false);
    }
  }

  const columns: Column<KnowledgeItem>[] = [
    {
      key: 'fact',
      header: 'Fact',
      sortValue: (row) => row.title,
      render: (row) => (
        <div>
          <p className="table-primary">{row.title}</p>
          <p className="table-secondary">{row.content}</p>
        </div>
      ),
    },
    {
      key: 'version',
      header: 'Version',
      sortValue: (row) => row.version,
      render: (row) => (
        <span>
          v{row.version}{' '}
          {row.superseded_by ? (
            <Badge status="superseded" tone="neutral" />
          ) : (
            <Badge status="current" tone="info" />
          )}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => (
        <Badge
          status={row.status.replace(/_/g, ' ')}
          tone={statusTone[row.status] ?? 'neutral'}
        />
      ),
    },
    {
      key: 'source',
      header: 'Source',
      sortValue: (row) => row.source ?? '',
      render: (row) => row.source ?? '—',
    },
    {
      key: 'expires',
      header: 'Expires',
      sortValue: (row) => row.expires_at ?? '',
      render: (row) =>
        row.expires_at
          ? new Date(row.expires_at).toLocaleString()
          : '—',
    },
    {
      key: 'created',
      header: 'Created',
      sortValue: (row) => row.created_at,
      render: (row) => new Date(row.created_at).toLocaleString(),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button variant="outline" onClick={() => setSelectedItem(row)}>
          Details
        </Button>
      ),
    },
  ];

  const editingTransitions =
    selectedItem !== null ? transitionsFor(selectedItem) : [];

  return (
    <section aria-labelledby="brain-heading">
      <div className="page-header">
        <div>
          <h1 id="brain-heading">Property Brain</h1>
          <p className="page-description">
            Versioned, verified knowledge facts per property. Facts
            start as drafts and only approved, non-expired facts are
            eligible for guest-facing AI context.
          </p>
        </div>
        {properties.length > 0 && (
          <Button onClick={openCreateDialog}>Add fact</Button>
        )}
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          message="Create a property before adding knowledge facts."
        />
      ) : (
        <>
          <div className="field">
            <SelectField
              label="Property"
              value={selectedPropertyId}
              onChange={(event) => setSelectedPropertyId(event.target.value)}
            >
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="field">
            <Field
              label="Search facts"
              type="search"
              placeholder="Title or content"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              optional
            />
          </div>

          <div className="field">
            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_review">Pending review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </SelectField>
          </div>

          <DataTable
            columns={columns}
            rows={visibleItems}
            rowKey={(row) => row.id}
            emptyMessage="No knowledge facts match. Add a fact to build the property brain."
            emptyAction={
              <Button onClick={openCreateDialog}>Add fact</Button>
            }
          />

          <h2>Verified facts</h2>
          <p className="page-description">
            Current approved facts eligible for guest-facing AI
            context. Drafts, rejected facts, expired facts, and
            superseded versions are excluded.
          </p>
          {verifiedFacts === null ? (
            <Button
              variant="outline"
              onClick={() => void handleLoadVerified()}
              loading={verifiedLoading}
            >
              Load verified facts
            </Button>
          ) : verifiedFacts.length === 0 ? (
            <EmptyState
              title="No verified facts"
              message="Approve a fact to make it eligible for guest-facing AI context."
            />
          ) : (
            <ul className="findings-list">
              {verifiedFacts.map((fact) => (
                <li key={fact.id} className="finding-card">
                  <div className="finding-header">
                    <p className="finding-title">{fact.title}</p>
                    <Badge status={`v${fact.version}`} tone="info" />
                  </div>
                  <p>{fact.content}</p>
                  <p className="finding-category">
                    {fact.source ?? 'unknown'} source
                    {fact.expires_at
                      ? ` · expires ${new Date(
                          fact.expires_at,
                        ).toLocaleString()}`
                      : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Dialog
        open={createDialogOpen}
        title="Add a fact"
        onClose={() => setCreateDialogOpen(false)}
        describedBy="create-fact-description"
      >
        <p id="create-fact-description">
          Facts start as drafts. A reviewer approves them before they
          become eligible for guest-facing AI context.
        </p>
        <form onSubmit={handleCreate} noValidate>
          <Field
            label="Title"
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            required
          />
          <Field
            label="Content"
            value={form.content}
            onChange={(event) =>
              setForm({ ...form, content: event.target.value })
            }
            required
          />
          <SelectField
            label="Category"
            value={form.categoryId}
            onChange={(event) =>
              setForm({ ...form, categoryId: event.target.value })
            }
            optional
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Source"
            value={form.source}
            onChange={(event) =>
              setForm({ ...form, source: event.target.value })
            }
          >
            <option value="manual">Manual</option>
            <option value="scanner">Scanner</option>
            <option value="import">Import</option>
          </SelectField>
          <Field
            label="Expires at"
            type="datetime-local"
            value={form.expiresAt}
            onChange={(event) =>
              setForm({ ...form, expiresAt: event.target.value })
            }
            optional
            helper="Leave empty for facts that do not expire."
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save fact
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        title="Edit fact as a new version"
        onClose={() => setEditDialogOpen(false)}
        describedBy="edit-fact-description"
      >
        <p id="edit-fact-description">
          Saving creates a new draft version. The current version is
          removed from guest-facing AI context until the new draft is
          approved.
        </p>
        {editingItem && (
          <p className="page-description">
            Editing version {editingItem.version} of{' '}
            {editingItem.title}.
          </p>
        )}
        <form onSubmit={handleEdit} noValidate>
          <Field
            label="Title"
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            required
          />
          <Field
            label="Content"
            value={form.content}
            onChange={(event) =>
              setForm({ ...form, content: event.target.value })
            }
            required
          />
          <SelectField
            label="Category"
            value={form.categoryId}
            onChange={(event) =>
              setForm({ ...form, categoryId: event.target.value })
            }
            optional
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Source"
            value={form.source}
            onChange={(event) =>
              setForm({ ...form, source: event.target.value })
            }
          >
            <option value="manual">Manual</option>
            <option value="scanner">Scanner</option>
            <option value="import">Import</option>
          </SelectField>
          <Field
            label="Expires at"
            type="datetime-local"
            value={form.expiresAt}
            onChange={(event) =>
              setForm({ ...form, expiresAt: event.target.value })
            }
            optional
            helper="Leave empty for facts that do not expire."
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save new version
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={selectedItem !== null}
        title={selectedItem?.title ?? ''}
        onClose={() => setSelectedItem(null)}
      >
        {selectedItem && (
          <div className="scanner-detail">
            <p>{selectedItem.content}</p>
            <p className="finding-category">
              Version {selectedItem.version}{' '}
              {selectedItem.superseded_by ? '· superseded' : '· current'} ·{' '}
              {selectedItem.source ?? 'no source'}
              {selectedItem.category_id
                ? ` · ${
                    categories.find(
                      (category) => category.id === selectedItem.category_id,
                    )?.name ?? 'uncategorized'
                  }`
                : ''}
              {selectedItem.expires_at
                ? ` · expires ${new Date(
                    selectedItem.expires_at,
                  ).toLocaleString()}`
                : ''}
            </p>
            <p className="table-secondary">
              Created {new Date(selectedItem.created_at).toLocaleString()} ·
              Updated {new Date(selectedItem.updated_at).toLocaleString()}
              {selectedItem.reviewed_at
                ? ` · reviewed ${new Date(
                    selectedItem.reviewed_at,
                  ).toLocaleString()}`
                : ''}
            </p>
            <Badge
              status={selectedItem.status.replace(/_/g, ' ')}
              tone={statusTone[selectedItem.status] ?? 'neutral'}
            />
            {selectedItem.superseded_by === null &&
              editingTransitions.length > 0 &&
              canReview && (
                <div className="dialog-actions">
                  <Button
                    variant="secondary"
                    disabled={submitting}
                    onClick={() => openEditDialog(selectedItem)}
                  >
                    Edit as new version
                  </Button>
                  {editingTransitions.map((transition) => (
                    <Button
                      key={transition}
                      variant={
                        transition === 'approved' ? 'primary' : 'secondary'
                      }
                      disabled={submitting}
                      onClick={() =>
                        void handleReview(selectedItem, transition)
                      }
                    >
                      {transitionLabels[transition]}
                    </Button>
                  ))}
                </div>
              )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </Dialog>
    </section>
  );
}
