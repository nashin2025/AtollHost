-- AI Budget Enforcement - Schema Only
-- Tables, indexes, policies, views only
-- Functions deployed as edge functions

-- Extend app_config with budget settings
alter table public.app_config
  add column if not exists ai_budget_cents int not null default 50000,
  add column if not exists ai_budget_alert_80_sent boolean not null default false,
  add column if not exists ai_budget_alert_95_sent boolean not null default false,
  add column if not exists ai_budget_reset_at timestamptz not null default (date_trunc('month', now()) + interval '1 month');

-- AI usage tracking table
create table public.ai_usage(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  model text not null,
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  total_tokens int not null default 0,
  estimated_cost_cents int not null default 0,
  operation text not null,
  request_id text,
  created_at timestamptz not null default now(),
  month timestamptz not null default date_trunc('month', now())
);

create index idx_ai_usage_org_month on public.ai_usage(organization_id, month);
create index idx_ai_usage_created on public.ai_usage(created_at desc);

alter table public.ai_usage enable row level security;

create policy ai_usage_org_read on public.ai_usage
  for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = ai_usage.organization_id
        and m.user_id = auth.uid()
        and m.role in ('agency_admin', 'agency_staff')
        and m.status = 'active'
    )
  );

create policy ai_usage_service_role on public.ai_usage
  for all to service_role
  using (true)
  with check (true);

-- Monthly AI budget aggregation view
create view public.ai_budget_monthly as
select
  u.organization_id,
  u.month,
  sum(u.estimated_cost_cents) as total_cost_cents,
  sum(u.total_tokens) as total_tokens,
  count(*) as request_count,
  max(c.ai_budget_cents) as budget_cents,
  case 
    when max(c.ai_budget_cents) > 0 
    then round(sum(u.estimated_cost_cents)::numeric / max(c.ai_budget_cents) * 100, 2)
    else 0
  end as budget_usage_pct,
  bool_or(c.ai_budget_alert_80_sent) as alert_80_sent,
  bool_or(c.ai_budget_alert_95_sent) as alert_95_sent
from public.ai_usage u
join public.app_config c on c.org_id = u.organization_id
group by u.organization_id, u.month;

-- Trigger to set month on insert
create or replace function public.set_ai_usage_month()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.month := date_trunc('month', new.created_at);
  return new;
end;
$$;

create trigger ai_usage_set_month
  before insert on public.ai_usage
  for each row
  execute function public.set_ai_usage_month();

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';