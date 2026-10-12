-- Phase 9/10: Scanner & Reviews tables + Integrations enhancements
-- RLS policies for new tables + Security tables

-- New enums
create type public.scanner_status as enum ('draft','in_progress','completed','archived');
create type public.review_publish_status as enum ('pending_approval','approved','published','failed','rejected');

-- Scanner audits table
create table public.scanner_audits(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  target_name text not null,
  target_url text,
  status public.scanner_status not null default 'draft',
  score int,
  summary text,
  metadata jsonb not null default '{}',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Review publish records table
create table public.review_publish_records(
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  response text not null,
  status public.review_publish_status not null default 'pending_approval',
  provider text not null,
  provider_config jsonb not null default '{}',
  provider_response jsonb,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  retry_count int not null default 0,
  last_error text,
  audit_log jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add columns to integrations table
alter table public.integrations add column if not exists credentials jsonb not null default '{}';
alter table public.integrations add column if not exists connection_id text;

-- Security tables
-- Rate limits table for distributed rate limiting
create table public.rate_limits(
  key text primary key,
  count int not null default 1,
  window_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotency keys table for safe retries
create table public.idempotency_keys(
  key text primary key,
  status text not null check (status in ('pending','completed','failed')),
  response jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null
);

-- Enable RLS on new tables
alter table public.scanner_audits enable row level security;
alter table public.review_publish_records enable row level security;
alter table public.rate_limits enable row level security;
alter table public.idempotency_keys enable row level security;

-- RLS Policies for scanner_audits
create policy scanner_audits_org_member_read on public.scanner_audits
  for select using(public.is_org_member(organization_id));
create policy scanner_audits_org_member_write on public.scanner_audits
  for all using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));

-- RLS Policies for review_publish_records
create policy review_publish_property_member_read on public.review_publish_records
  for select using(public.is_property_member(property_id));
create policy review_publish_property_member_write on public.review_publish_records
  for all using(public.is_property_member(property_id)) with check(public.is_property_member(property_id));

-- RLS Policies for rate_limits (service role only - edge functions use service key)
create policy rate_limits_service_role on public.rate_limits
  for all using(auth.role() = 'service_role') with check(auth.role() = 'service_role');

-- RLS Policies for idempotency_keys (service role only)
create policy idempotency_service_role on public.idempotency_keys
  for all using(auth.role() = 'service_role') with check(auth.role() = 'service_role');

-- Update integrations policy - existing policy already covers org_member access
-- Credentials are stored in JSONB and only accessible to org members via the existing policy
