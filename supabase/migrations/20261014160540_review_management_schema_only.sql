-- Google Business Profile Review Management - Schema Only
-- Tables, indexes, policies, views only
-- Functions deployed as edge functions

-- GMB location mapping
create table public.gmb_locations(
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  gmb_location_name text not null,
  place_id text,
  display_name text,
  address text,
  is_verified boolean not null default false,
  sync_enabled boolean not null default true,
  last_sync_at timestamptz,
  sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, gmb_location_name)
);

create index idx_gmb_locations_org on public.gmb_locations(organization_id);
create index idx_gmb_locations_property on public.gmb_locations(property_id);

alter table public.gmb_locations enable row level security;

create policy gmb_locations_org_read on public.gmb_locations
  for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = gmb_locations.organization_id
        and m.user_id = auth.uid()
        and m.role in ('agency_admin', 'agency_staff')
        and m.status = 'active'
    )
  );

create policy gmb_locations_org_write on public.gmb_locations
  for all
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = gmb_locations.organization_id
        and m.user_id = auth.uid()
        and m.role in ('agency_admin', 'agency_staff')
        and m.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = gmb_locations.organization_id
        and m.user_id = auth.uid()
        and m.role in ('agency_admin', 'agency_staff')
        and m.status = 'active'
    )
  );

create policy gmb_locations_service_role on public.gmb_locations
  for all to service_role
  using (true)
  with check (true);

-- GMB OAuth credentials (encrypted - service role only)
create table public.gmb_oauth_credentials(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expires_at timestamptz not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

alter table public.gmb_oauth_credentials enable row level security;

create policy gmb_oauth_service_role on public.gmb_oauth_credentials
  for all to service_role
  using (true)
  with check (true);

-- Reviews from GMB (synced)
create table public.gmb_reviews(
  id uuid primary key default gen_random_uuid(),
  gmb_location_id uuid not null references public.gmb_locations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  gmb_review_id text not null,
  reviewer_name text,
  reviewer_profile_photo_url text,
  star_rating int not null check (star_rating between 1 and 5),
  comment text,
  create_time timestamptz not null,
  update_time timestamptz,
  reply_text text,
  reply_time timestamptz,
  reply_by uuid references auth.users(id) on delete set null,
  local_review_id uuid references public.reviews(id) on delete set null,
  is_processed boolean not null default false,
  raw_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gmb_location_id, gmb_review_id)
);

create index idx_gmb_reviews_location on public.gmb_reviews(gmb_location_id, create_time desc);
create index idx_gmb_reviews_org on public.gmb_reviews(organization_id, create_time desc);
create index idx_gmb_reviews_unprocessed on public.gmb_reviews(is_processed, create_time) where is_processed = false;

alter table public.gmb_reviews enable row level security;

create policy gmb_reviews_org_read on public.gmb_reviews
  for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = gmb_reviews.organization_id
        and m.user_id = auth.uid()
        and m.role in ('agency_admin', 'agency_staff')
        and m.status = 'active'
    )
  );

create policy gmb_reviews_service_role on public.gmb_reviews
  for all to service_role
  using (true)
  with check (true);

-- Review response drafts (AI-generated)
create table public.review_response_drafts(
  id uuid primary key default gen_random_uuid(),
  gmb_review_id uuid not null references public.gmb_reviews(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  draft_text text not null,
  confidence numeric(5,4),
  model_used text,
  prompt_tokens int,
  completion_tokens int,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'published', 'failed')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  error text,
  version int not null default 1,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_review_response_drafts_gmb_review on public.review_response_drafts(gmb_review_id, created_at desc);
create index idx_review_response_drafts_org on public.review_response_drafts(organization_id, status, created_at desc);

alter table public.review_response_drafts enable row level security;

create policy review_response_drafts_org_read on public.review_response_drafts
  for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = review_response_drafts.organization_id
        and m.user_id = auth.uid()
        and m.role in ('agency_admin', 'agency_staff')
        and m.status = 'active'
    )
  );

create policy review_response_drafts_org_write on public.review_response_drafts
  for all
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = review_response_drafts.organization_id
        and m.user_id = auth.uid()
        and m.role in ('agency_admin', 'agency_staff')
        and m.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = review_response_drafts.organization_id
        and m.user_id = auth.uid()
        and m.role in ('agency_admin', 'agency_staff')
        and m.status = 'active'
    )
  );

create policy review_response_drafts_service_role on public.review_response_drafts
  for all to service_role
  using (true)
  with check (true);

-- Updated_at triggers
create trigger gmb_locations_updated_at
  before update on public.gmb_locations
  for each row
  execute function public.set_updated_at();

create trigger gmb_reviews_updated_at
  before update on public.gmb_reviews
  for each row
  execute function public.set_updated_at();

create trigger review_response_drafts_updated_at
  before update on public.review_response_drafts
  for each row
  execute function public.set_updated_at();

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';