import type { SupabaseClient } from './supabase';

export interface Guest {
  id: string;
  property_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  passport_number: string | null;
  date_of_birth: string | null;
  preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface GuestListParams {
  property_id: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listGuests(
  client: SupabaseClient,
  params: GuestListParams,
): Promise<{ guests: Guest[]; total: number }> {
  let query = client
    .from('guests')
    .select('*', { count: 'exact' })
    .eq('property_id', params.property_id)
    .order('created_at', { ascending: false });

  if (params.search) {
    query = query.or(
      `first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%`,
    );
  }

  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return { guests: (data ?? []) as unknown as Guest[], total: count ?? 0 };
}

export async function getGuest(
  client: SupabaseClient,
  guestId: string,
): Promise<Guest | null> {
  const { data, error } = await client
    .from('guests')
    .select('*')
    .eq('id', guestId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(error.message);
  }
  return data as unknown as Guest;
}

export interface CreateGuestInput {
  property_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  passport_number?: string | null;
  date_of_birth?: string | null;
  preferences?: Record<string, unknown> | null;
}

export async function createGuest(
  client: SupabaseClient,
  input: CreateGuestInput,
): Promise<Guest> {
  const { data, error } = await client
    .from('guests')
    .insert(input)
    .select('*')
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as Guest;
}

export interface UpdateGuestInput {
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  passport_number?: string | null;
  date_of_birth?: string | null;
  preferences?: Record<string, unknown> | null;
}

export async function updateGuest(
  client: SupabaseClient,
  guestId: string,
  input: UpdateGuestInput,
): Promise<Guest> {
  const { data, error } = await client
    .from('guests')
    .update(input)
    .eq('id', guestId)
    .select('*')
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as Guest;
}