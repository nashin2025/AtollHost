-- Add missing columns to organizations table
alter table public.organizations
add column if not exists email_notifications boolean not null default true,
add column if not exists push_notifications boolean not null default false,
add column if not exists logo_url text,
add column if not exists primary_color text not null default '#0f172a',
add column if not exists secondary_color text not null default '#64748b';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
