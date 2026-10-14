-- AI settings per organization
create table app_config (
  org_id uuid primary key references organizations(id) on delete cascade,
  ai_enabled boolean not null default false,
  ai_model text,
  ai_temperature numeric(3,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app_config enable row level security;

-- Org members can read AI config
create policy "org members can read app_config"
  on app_config for select
  using (
    org_id in (
      select organization_id
      from organization_members
      where user_id = auth.uid()
      and status = 'active'
    )
  );

-- Org admins/owners can update AI config
create policy "org admins can update app_config"
  on app_config for update
  using (
    org_id in (
      select organization_id
      from organization_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
      and status = 'active'
    )
  );

-- Org admins/owners can insert AI config (first time setup)
create policy "org admins can insert app_config"
  on app_config for insert
  with check (
    org_id in (
      select organization_id
      from organization_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
      and status = 'active'
    )
  );

-- Updated_at trigger
create trigger app_config_updated_at
  before update on app_config
  for each row
  execute function update_updated_at_column();