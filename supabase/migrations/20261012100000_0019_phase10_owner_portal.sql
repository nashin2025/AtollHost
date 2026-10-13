-- Phase 10: Owner portal and hardening
--
-- Adds:
--   1. owner_portals: owner-facing portal configuration per property.
--   2. owner_property_access: explicit owner-to-property permissions (separate from property_users).
--   3. owner_notifications: owner-specific notification preferences.
--   4. security_audit_log: security review tracking.
--   5. backup_jobs: backup/restore tracking.
--   6. Enhanced RLS for owner isolation.
--   7. RPCs for owner dashboard, permissions, security audit.

-- Owner portals: configuration per property for owner-facing view
create table public.owner_portals(
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  is_enabled boolean not null default true,
  show_revenue boolean not null default true,
  show_occupancy boolean not null default true,
  show_reviews boolean not null default true,
  show_tasks boolean not null default true,
  show_knowledge boolean not null default true,
  branding jsonb not null default '{}'::jsonb, -- logo, colors, custom domain
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, owner_id)
);

create index idx_owner_portals_property on public.owner_portals(property_id);
create index idx_owner_portals_owner on public.owner_portals(owner_id);

alter table public.owner_portals enable row level security;

create policy owner_portals_owner_read on public.owner_portals
  for select
  using (owner_id = auth.uid());

create policy owner_portals_service_role on public.owner_portals
  for all to service_role
  using (true)
  with check (true);

-- Owner property access: explicit permissions for owners (separate from property_users)
create table public.owner_property_access(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  granted_by uuid not null references auth.users(id) on delete cascade,
  can_view_revenue boolean not null default true,
  can_view_occupancy boolean not null default true,
  can_view_reviews boolean not null default true,
  can_view_tasks boolean not null default true,
  can_view_knowledge boolean not null default true,
  can_view_reports boolean not null default true,
  can_manage_portal boolean not null default false,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (owner_id, property_id)
);

create index idx_owner_property_access_owner on public.owner_property_access(owner_id);
create index idx_owner_property_access_property on public.owner_property_access(property_id);

alter table public.owner_property_access enable row level security;

create policy owner_access_owner_read on public.owner_property_access
  for select
  using (owner_id = auth.uid());

create policy owner_access_service_role on public.owner_property_access
  for all to service_role
  using (true)
  with check (true);

-- Owner notifications: preferences per owner
create table public.owner_notifications(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  event_type text not null,
  channel text not null check (channel in ('email', 'push', 'in_app')),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, property_id, event_type, channel)
);

create index idx_owner_notifications_owner on public.owner_notifications(owner_id);

alter table public.owner_notifications enable row level security;

create policy owner_notifications_owner_read on public.owner_notifications
  for select
  using (owner_id = auth.uid());

create policy owner_notifications_owner_write on public.owner_notifications
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy owner_notifications_service_role on public.owner_notifications
  for all to service_role
  using (true)
  with check (true);

-- Security audit log: track security reviews
create table public.security_audit_log(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  audit_type text not null check (audit_type in ('dependency_scan', 'secrets_scan', 'backup_restore', 'privacy_review', 'penetration_test', 'access_review')),
  status text not null check (status in ('scheduled', 'in_progress', 'completed', 'failed')),
  findings jsonb not null default '[]'::jsonb,
  severity text check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  scheduled_for timestamptz,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_security_audit_org on public.security_audit_log(organization_id, created_at desc);

alter table public.security_audit_log enable row level security;

create policy security_audit_org_read on public.security_audit_log
  for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = security_audit_log.organization_id
        and m.user_id = auth.uid()
        and m.role in ('agency_admin','agency_staff')
        and m.status = 'active'
    )
  );

create policy security_audit_service_role on public.security_audit_log
  for all to service_role
  using (true)
  with check (true);

-- Backup jobs: track backup/restore operations
create type public.backup_type as enum ('full', 'incremental', 'schema_only', 'data_only');
create type public.backup_status as enum ('scheduled', 'running', 'completed', 'failed');

create table public.backup_jobs(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  backup_type public.backup_type not null,
  status public.backup_status not null default 'scheduled',
  storage_path text,
  size_bytes bigint,
  tables text[],
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  triggered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_backup_jobs_org on public.backup_jobs(organization_id, created_at desc);

alter table public.backup_jobs enable row level security;

create policy backup_jobs_org_read on public.backup_jobs
  for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = backup_jobs.organization_id
        and m.user_id = auth.uid()
        and m.role in ('agency_admin','agency_staff')
        and m.status = 'active'
    )
  );

create policy backup_jobs_service_role on public.backup_jobs
  for all to service_role
  using (true)
  with check (true);

-- RPC: Get owner dashboard data
create or replace function public.get_owner_dashboard(
  p_owner_id uuid,
  p_property_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_access record;
  v_result jsonb;
begin
  -- Verify owner has access to this property
  select * into v_access from public.owner_property_access
  where owner_id = p_owner_id and property_id = p_property_id and revoked_at is null;
  if not found then
    raise exception 'FORBIDDEN: owner does not have access to this property';
  end if;

  -- Aggregate dashboard data
  select jsonb_build_object(
    'revenue', jsonb_build_object(
      'total', coalesce(sum(r.total_amount) filter (where r.total_amount is not null), 0),
      'last_30d', coalesce(sum(r.total_amount) filter (where r.total_amount is not null and r.check_in >= now() - interval '30 days'), 0),
      'currency', 'MVR'
    ),
    'occupancy', jsonb_build_object(
      'total_rooms', count(distinct rm.id),
      'occupied_last_30d', count(distinct r.id) filter (where r.check_in <= now() and r.check_out >= now() - interval '30 days')
    ),
    'enquiries', jsonb_build_object(
      'total', count(distinct e.id),
      'open', count(distinct e.id) filter (where e.status in ('new','open','waiting')),
      'won', count(distinct e.id) filter (where e.status = 'won'),
      'conversion_rate', case when count(distinct e.id) > 0
        then round(count(distinct e.id) filter (where e.status = 'won')::numeric / count(distinct e.id) * 100, 2)
        else 0 end
    ),
    'reviews', jsonb_build_object(
      'total', count(distinct rv.id),
      'published', count(distinct rv.id) filter (where rv.status = 'published'),
      'avg_rating', round(avg(rv.rating) filter (where rv.rating is not null)::numeric, 2)
    ),
    'tasks', jsonb_build_object(
      'total', count(distinct t.id),
      'completed', count(distinct t.id) filter (where t.status = 'done'),
      'overdue', count(distinct t.id) filter (where t.status in ('todo','in_progress') and t.due_at < now())
    ),
    'knowledge', jsonb_build_object(
      'total_facts', count(distinct k.id),
      'approved', count(distinct k.id) filter (where k.status = 'approved')
    )
  ) into v_result
  from public.properties p
  left join public.rooms rm on rm.property_id = p.id
  left join public.reservations r on r.property_id = p.id
  left join public.enquiries e on e.property_id = p.id
  left join public.reviews rv on rv.property_id = p.id
  left join public.tasks t on t.property_id = p.id
  left join public.knowledge_items k on k.property_id = p.id
  where p.id = p_property_id;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

-- RPC: Grant owner property access
create or replace function public.grant_owner_access(
  p_owner_id uuid,
  p_property_id uuid,
  p_organization_id uuid,
  p_granted_by uuid,
  p_permissions jsonb default '{}'::jsonb
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_access_id uuid;
  v_granter record;
begin
  perform public.assert_actor(p_granted_by);
  -- Only agency admins can grant owner access
  if not (
    exists (select 1 from public.organization_members m
      where m.organization_id = p_organization_id and m.user_id = p_granted_by
        and m.role = 'agency_admin' and m.status = 'active')
  ) then
    raise exception 'FORBIDDEN: only agency admins can grant owner access';
  end if;
  if not exists (select 1 from public.properties where id = p_property_id and organization_id = p_organization_id) then
    raise exception 'VALIDATION_ERROR: property does not belong to this organization';
  end if;
  insert into public.owner_property_access(owner_id, property_id, organization_id, granted_by,
    can_view_revenue, can_view_occupancy, can_view_reviews,
    can_view_tasks, can_view_knowledge, can_view_reports, can_manage_portal)
  values (p_owner_id, p_property_id, p_organization_id, p_granted_by,
    coalesce(p_permissions->>'can_view_revenue', 'true')::boolean,
    coalesce(p_permissions->>'can_view_occupancy', 'true')::boolean,
    coalesce(p_permissions->>'can_view_reviews', 'true')::boolean,
    coalesce(p_permissions->>'can_view_tasks', 'true')::boolean,
    coalesce(p_permissions->>'can_view_knowledge', 'true')::boolean,
    coalesce(p_permissions->>'can_view_reports', 'true')::boolean,
    coalesce(p_permissions->>'can_manage_portal', 'false')::boolean)
  on conflict (owner_id, property_id) do update set
    revoked_at = null,
    granted_by = excluded.granted_by,
    can_view_revenue = excluded.can_view_revenue,
    can_view_occupancy = excluded.can_view_occupancy,
    can_view_reviews = excluded.can_view_reviews,
    can_view_tasks = excluded.can_view_tasks,
    can_view_knowledge = excluded.can_view_knowledge,
    can_view_reports = excluded.can_view_reports,
    can_manage_portal = excluded.can_manage_portal,
    granted_at = now()
  returning id into v_access_id;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
  values (p_organization_id, p_granted_by, 'owner_access.granted', 'owner_property_access', v_access_id, p_property_id,
    jsonb_build_object('owner_id', p_owner_id, 'permissions', p_permissions));
  return v_access_id;
end;
$$;

-- RPC: Revoke owner property access
create or replace function public.revoke_owner_access(
  p_owner_id uuid,
  p_property_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_org_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  if not (
    exists (select 1 from public.owner_property_access opa
      join public.properties p on p.id = opa.property_id
      where opa.owner_id = p_owner_id and opa.property_id = p_property_id
        and opa.revoked_at is null)
  ) then
    raise exception 'NOT_FOUND: owner access not found';
  end if;
  -- Only agency admins can revoke
  select organization_id into v_org_id from public.properties where id = p_property_id;
  if not (
    exists (select 1 from public.organization_members m
      where m.organization_id = v_org_id and m.user_id = p_actor_id
        and m.role = 'agency_admin' and m.status = 'active')
  ) then
    raise exception 'FORBIDDEN: only agency admins can revoke owner access';
  end if;
  update public.owner_property_access
    set revoked_at = now()
    where owner_id = p_owner_id and property_id = p_property_id and revoked_at is null;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
  values (v_org_id, p_actor_id, 'owner_access.revoked', 'owner_property_access', null, p_property_id,
    jsonb_build_object('owner_id', p_owner_id));
end;
$$;

-- RPC: Record security audit
create or replace function public.record_security_audit(
  p_organization_id uuid,
  p_property_id uuid,
  p_audit_type text,
  p_status text,
  p_severity text,
  p_scheduled_for timestamptz,
  p_created_by uuid,
  p_findings jsonb default '[]'::jsonb
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_audit_id uuid;
begin
  perform public.assert_actor(p_created_by);
  if p_status not in ('scheduled', 'in_progress', 'completed', 'failed') then
    raise exception 'VALIDATION_ERROR: invalid status';
  end if;
  if p_severity is not null and p_severity not in ('critical', 'high', 'medium', 'low', 'info') then
    raise exception 'VALIDATION_ERROR: invalid severity';
  end if;
  insert into public.security_audit_log(organization_id, property_id, audit_type, status, findings, severity, scheduled_for, created_by)
  values (p_organization_id, p_property_id, p_audit_type, p_status, p_findings, p_severity, p_scheduled_for, p_created_by)
  returning id into v_audit_id;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
  values (p_organization_id, p_created_by, 'security_audit.recorded', 'security_audit', v_audit_id, p_property_id,
    jsonb_build_object('audit_type', p_audit_type, 'status', p_status, 'severity', p_severity));
  return v_audit_id;
end;
$$;

-- RPC: Update security audit status
create or replace function public.update_security_audit(
  p_audit_id uuid,
  p_status text,
  p_findings jsonb,
  p_severity text,
  p_reviewed_by uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public.assert_actor(p_reviewed_by);
  if p_status not in ('scheduled', 'in_progress', 'completed', 'failed') then
    raise exception 'VALIDATION_ERROR: invalid status';
  end if;
  if p_severity is not null and p_severity not in ('critical', 'high', 'medium', 'low', 'info') then
    raise exception 'VALIDATION_ERROR: invalid severity';
  end if;
  update public.security_audit_log
    set status = p_status,
        findings = p_findings,
        severity = p_severity,
        reviewed_by = p_reviewed_by,
        reviewed_at = case when p_status = 'completed' then now() else reviewed_by end,
        completed_at = case when p_status in ('completed', 'failed') then now() else null end
    where id = p_audit_id;
  if not found then
    raise exception 'NOT_FOUND: security audit not found';
  end if;
end;
$$;

-- RPC: Schedule backup job
create or replace function public.schedule_backup_job(
  p_organization_id uuid,
  p_backup_type text,
  p_tables text[],
  p_triggered_by uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_job_id uuid;
begin
  perform public.assert_actor(p_triggered_by);
  if not (
    exists (select 1 from public.organization_members m
      where m.organization_id = p_organization_id and m.user_id = p_triggered_by
        and m.role in ('agency_admin','agency_staff') and m.status = 'active')
  ) then
    raise exception 'FORBIDDEN: only agency admins or staff can schedule backups';
  end if;
  if p_backup_type not in ('full', 'incremental', 'schema_only', 'data_only') then
    raise exception 'VALIDATION_ERROR: invalid backup type';
  end if;
  insert into public.backup_jobs(organization_id, backup_type, tables, triggered_by)
  values (p_organization_id, p_backup_type, p_tables, p_triggered_by)
  returning id into v_job_id;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, p_triggered_by, 'backup.scheduled', 'backup_job', v_job_id,
    jsonb_build_object('backup_type', p_backup_type, 'tables', p_tables));
  return v_job_id;
end;
$$;

-- RPC: Complete backup job
create or replace function public.complete_backup_job(
  p_job_id uuid,
  p_status text,
  p_storage_path text,
  p_size_bytes bigint,
  p_error text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_status not in ('completed', 'failed') then
    raise exception 'VALIDATION_ERROR: invalid status';
  end if;
  update public.backup_jobs
    set status = p_status,
        storage_path = p_storage_path,
        size_bytes = p_size_bytes,
        error = p_error,
        completed_at = now()
    where id = p_job_id;
  if not found then
    raise exception 'NOT_FOUND: backup job not found';
  end if;
end;
$$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';