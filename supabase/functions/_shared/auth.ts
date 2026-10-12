import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface Caller {
  uid: string;
  email: string | null;
}

export async function verifyCaller(req: Request): Promise<Caller | null> {
  const authorization = req.headers.get('Authorization');
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization || !url || !anonKey) {
    return null;
  }
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return { uid: data.user.id, email: data.user.email ?? null };
}
