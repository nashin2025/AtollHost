import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/States';
import { ErrorState } from '../../components/ui/States';
import { LoadingState } from '../../components/ui/States';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { SelectField } from '../../components/ui/Field';
import { listMyMemberships } from '../../lib/memberships';
import { listProperties, type Property } from '../../lib/properties';
import { listReviews, type Review } from '../../lib/reviews';
import {
  approveReviewResponse,
  createReviewResponse,
  listReviewResponses,
  publishReviewResponse,
  type ReviewResponse,
} from '../../lib/reviewResponses';
import { supabase } from '../../lib/supabase';

const statusTone: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  new: 'info',
  draft: 'warning',
  approved: 'success',
  published: 'success',
  ignored: 'neutral',
};

const responseTone: Record<string, 'success' | 'warning' | 'neutral'> = {
  draft: 'warning',
  approved: 'success',
  published: 'success',
  rejected: 'neutral',
};

function ratingTone(rating: number | null): 'success' | 'info' | 'warning' | 'neutral' {
  if (rating === null) {
    return 'neutral';
  }
  if (rating >= 4) {
    return 'success';
  }
  if (rating >= 3) {
    return 'info';
  }
  return 'warning';
}

function ratingLabel(rating: number | null): string {
  return rating === null ? 'No rating' : rating.toFixed(1);
}

export function ReviewsPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [properties, setProperties] = useState<Property[]>([]);
  const [memberships, setMemberships] = useState<{ organization_id: string; role: string }[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewResponses, setReviewResponses] = useState<ReviewResponse[]>([]);
  const [responding, setResponding] = useState<Review | null>(null);
  const [draftBody, setDraftBody] = useState('');
  const [detailsFor, setDetailsFor] = useState<Review | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) {
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const [propertyRows, membershipRows] = await Promise.all([
        listProperties(supabase),
        listMyMemberships(supabase),
      ]);
      setProperties(propertyRows);
      setMemberships(membershipRows);
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

  useEffect(() => {
    if (status === 'ready' && selectedPropertyId === '' && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [status, selectedPropertyId, properties]);

  const reloadReviews = useCallback(async () => {
    if (!supabase || selectedPropertyId === '') {
      setReviews([]);
      setReviewResponses([]);
      return;
    }
    const client = supabase;
    try {
      const rows = await listReviews(client, selectedPropertyId);
      setReviews(rows);
      const responses = await Promise.all(
        rows.map((row) => listReviewResponses(client, row.id)),
      );
      setReviewResponses(responses.flat());
    } catch {
      setReviews([]);
      setReviewResponses([]);
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    if (status !== 'ready' || selectedPropertyId === '') {
      return;
    }
    void reloadReviews();
  }, [status, selectedPropertyId, reloadReviews]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="reviews-heading">
        <h1 id="reviews-heading">Reviews</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to manage reviews."
        />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="reviews-heading">
        <h1 id="reviews-heading">Reviews</h1>
        <LoadingState label="Loading reviews" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="reviews-heading">
        <h1 id="reviews-heading">Reviews</h1>
        <ErrorState
          message="Reviews could not be loaded. Check your connection and try again."
          onRetry={() => void reload()}
        />
      </section>
    );
  }

  const manageableOrgIds = new Set(
    memberships
      .filter((membership) => membership.role === 'agency_admin')
      .map((membership) => membership.organization_id),
  );
  const selectedProperty =
    properties.find((row) => row.id === selectedPropertyId) ?? null;
  const canManage =
    selectedProperty !== null &&
    manageableOrgIds.has(selectedProperty.organization_id);

  function responsesFor(reviewId: string): ReviewResponse[] {
    return reviewResponses.filter((row) => row.review_id === reviewId);
  }

  function openRespond(review: Review) {
    setResponding(review);
    setDraftBody('');
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || responding === null) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createReviewResponse(supabase, {
        review_id: responding.id,
        property_id: responding.property_id,
        organization_id:
          properties.find((row) => row.id === responding.property_id)
            ?.organization_id ?? '',
        draft_body: draftBody,
        confidence: null,
        source_references: [],
      });
      setResponding(null);
      await reloadReviews();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(response: ReviewResponse) {
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await approveReviewResponse(supabase, response.id);
      await reloadReviews();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish(response: ReviewResponse) {
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await publishReviewResponse(supabase, response.id);
      await reloadReviews();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<Review>[] = [
    {
      key: 'review',
      header: 'Review',
      sortValue: (row) => row.review_text ?? '',
      render: (row) => (
        <div>
          <p className="table-primary">{row.review_text ?? 'No review text'}</p>
          <p className="table-secondary">
            {row.source}
            {row.external_id ? ` · ref ${row.external_id}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      sortValue: (row) => row.rating ?? -1,
      render: (row) => (
        <Badge status={ratingLabel(row.rating)} tone={ratingTone(row.rating)} />
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
      key: 'responses',
      header: 'Responses',
      sortValue: (row) => responsesFor(row.id).length,
      render: (row) => String(responsesFor(row.id).length),
    },
    {
      key: 'created_at',
      header: 'Received',
      sortValue: (row) => row.created_at,
      render: (row) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="dialog-actions">
          {canManage && row.status !== 'ignored' && (
            <Button variant="outline" onClick={() => openRespond(row)}>
              Respond
            </Button>
          )}
          {responsesFor(row.id).length > 0 && (
            <Button variant="outline" onClick={() => setDetailsFor(row)}>
              View responses
            </Button>
          )}
        </div>
      ),
    },
  ];

  const detailResponses = detailsFor ? responsesFor(detailsFor.id) : [];

  return (
    <section aria-labelledby="reviews-heading">
      <div className="page-header">
        <div>
          <h1 id="reviews-heading">Reviews</h1>
          <p className="page-description">
            Guest reviews with response drafts. Drafts are approved before they
            are marked published, and nothing is posted to the review platform
            from here.
          </p>
        </div>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          message="Create a property before tracking reviews."
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

          <DataTable
            columns={columns}
            rows={reviews}
            rowKey={(row) => row.id}
            emptyMessage="No reviews yet for this property."
          />
        </>
      )}

      <Dialog
        open={responding !== null}
        title="Draft a response"
        onClose={() => setResponding(null)}
        describedBy="respond-dialog-description"
      >
        <p id="respond-dialog-description">
          Drafts stay private until approved. Published marks the response as
          posted on your side; it does not post to the review platform.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <Field
            label="Response draft"
            value={draftBody}
            onChange={(event) => setDraftBody(event.target.value)}
            required
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setResponding(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save draft
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={detailsFor !== null}
        title="Response drafts"
        onClose={() => setDetailsFor(null)}
      >
        {detailResponses.length === 0 ? (
          <p>No response drafts yet.</p>
        ) : (
          <ul className="findings-list">
            {detailResponses.map((response) => (
              <li key={response.id} className="finding-card">
                <div className="finding-header">
                  <Badge
                    status={response.status}
                    tone={responseTone[response.status] ?? 'neutral'}
                  />
                  <span className="table-secondary">
                    v{response.version}
                    {response.confidence !== null
                      ? ` · ${Math.round(response.confidence * 100)}% confidence`
                      : ''}
                  </span>
                </div>
                <p>{response.draft_body}</p>
                {canManage && response.status === 'draft' && (
                  <div className="dialog-actions">
                    <Button
                      variant="outline"
                      disabled={submitting}
                      onClick={() => void handleApprove(response)}
                    >
                      Approve
                    </Button>
                  </div>
                )}
                {canManage && response.status === 'approved' && (
                  <div className="dialog-actions">
                    <Button
                      disabled={submitting}
                      onClick={() => void handlePublish(response)}
                    >
                      Mark published
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
      </Dialog>
    </section>
  );
}
