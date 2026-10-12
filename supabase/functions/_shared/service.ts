import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) {
    throw new Error('Server configuration is missing.');
  }
  return createClient(url, serviceRoleKey);
}
