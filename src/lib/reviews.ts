import type { SupabaseClient } from './supabase';

export interface Review {
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

export async function listReviews(
  client: SupabaseClient,
  propertyId: string,
): Promise<Review[]> {
  const { data, error } = await client
    .from('reviews')
    .select(
      'id, property_id, source, external_id, rating, review_text, status, ai_draft, published_response, reviewed_at, created_at',
    )
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as Review[];
}
