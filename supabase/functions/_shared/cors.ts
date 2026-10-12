export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

export function newRequestId(): string {
  return crypto.randomUUID();
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function methodNotAllowed(): Response {
  return new Response('Method not allowed', {
    status: 405,
    headers: corsHeaders,
  });
}

export function optionsResponse(): Response {
  return new Response('ok', { headers: corsHeaders });
}
