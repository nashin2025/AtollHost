import type { SupabaseClient } from './supabase';

export interface Reservation {
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
  updated_at: string;
  guest?: { first_name: string; last_name: string; email: string | null } | null;
  room?: { name: string; type: string } | null;
}

export interface ReservationListParams {
  property_id: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listReservations(
  client: SupabaseClient,
  params: ReservationListParams,
): Promise<{ reservations: Reservation[]; total: number }> {
  let query = client
    .from('reservations')
    .select(
      '*, guest:guests(first_name,last_name,email), room:rooms(name,type)',
      { count: 'exact' },
    )
    .eq('property_id', params.property_id)
    .order('check_in', { ascending: false });

  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.date_from) {
    query = query.gte('check_out', params.date_from);
  }
  if (params.date_to) {
    query = query.lte('check_in', params.date_to);
  }
  if (params.search) {
    query = query.or(
      `guest.first_name.ilike.%${params.search}%,guest.last_name.ilike.%${params.search}%,guest.email.ilike.%${params.search}%,room.name.ilike.%${params.search}%`,
    );
  }

  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return { reservations: (data ?? []) as unknown as Reservation[], total: count ?? 0 };
}

export async function getReservation(
  client: SupabaseClient,
  reservationId: string,
): Promise<Reservation | null> {
  const { data, error } = await client
    .from('reservations')
    .select('*, guest:guests(first_name,last_name,email), room:rooms(name,type)')
    .eq('id', reservationId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(error.message);
  }
  return data as unknown as Reservation;
}

export interface CreateReservationInput {
  property_id: string;
  guest_id?: string | null;
  room_id?: string | null;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  source: string;
  status: string;
  total_amount?: number | null;
  currency?: string | null;
  special_requests?: string | null;
}

export async function createReservation(
  client: SupabaseClient,
  input: CreateReservationInput,
): Promise<Reservation> {
  const { data, error } = await client
    .from('reservations')
    .insert(input)
    .select('*, guest:guests(first_name,last_name,email), room:rooms(name,type)')
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as Reservation;
}

export interface UpdateReservationInput {
  guest_id?: string | null;
  room_id?: string | null;
  check_in?: string;
  check_out?: string;
  adults?: number;
  children?: number;
  source?: string;
  status?: string;
  total_amount?: number | null;
  currency?: string | null;
  special_requests?: string | null;
}

export async function updateReservation(
  client: SupabaseClient,
  reservationId: string,
  input: UpdateReservationInput,
): Promise<Reservation> {
  const { data, error } = await client
    .from('reservations')
    .update(input)
    .eq('id', reservationId)
    .select('*, guest:guests(first_name,last_name,email), room:rooms(name,type)')
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as Reservation;
}