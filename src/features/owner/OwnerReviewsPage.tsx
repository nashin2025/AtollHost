import { useEffect, useState } from 'react';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { listReviews } from '../../lib/reviews';
import { supabase } from '../../lib/supabase';
import { useOwnerContext } from './OwnerPortalPage';

interface Review {
  id: string;
  property_id: string;
  source: string;
  external_id: string | null;
  rating: number | null;
  review_text: string | null;
  status: string;
  ai_draft: string | null;
  published_response: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export function OwnerReviewsPage() {
  const { allowedPropertyIds } = useOwnerContext();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setState('loading');
    try {
      const results = await Promise.all(
        allowedPropertyIds.map((pid) =>
          listReviews(supabase!, pid),
        ),
      );
      setReviews(results.flat());
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
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
    return <LoadingState label="Loading reviews…" />;
  }
  if (state === 'error') {
    return <ErrorState message={error ?? 'Unknown error'} onRetry={load} />;
  }

  function renderStars(rating: number | null) {
    if (!rating) return '—';
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  return (
    <section aria-labelledby="page-heading">
      <header className="page-header">
        <h1 id="page-heading">Reviews</h1>
        <p className="page-description">
          Guest reviews for your properties. View ratings and draft responses.
        </p>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Rating</th>
              <th scope="col">Source</th>
              <th scope="col">Status</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 ? (
              <tr>
                <td colSpan={4} className="state-empty">
                  No reviews found for your properties.
                </td>
              </tr>
            ) : (
              reviews.map((r) => (
                <tr key={r.id}>
                  <td>{renderStars(r.rating)}</td>
                  <td>{r.source}</td>
                  <td>
                    <span className={`badge badge-${r.status}`}>{r.status}</span>
                  </td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}