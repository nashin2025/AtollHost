-- Phase 3: Properties and Guesthouse Scanner
--
-- Adds:
--   1. 'archived' property status (archive workflow, T3.1).
--   2. scanner_findings: per-run findings with source, category, severity,
--      confidence, recommendation, and a review status (T3.2, T3.4).
--   3. start_scanner_run: server-mediated manual scan entry point with
--      authorization, https-only targets, and a per-target rate limit
--      (T3.3).
--   4. upsert_property: server-mediated property create/edit/archive with
--      audit events (T3.1).
--   5. review_finding: findings review workflow. Reviewing a finding never
--      touches knowledge_items; applying a finding to the Property Brain
--      is an explicit, separate action (T3.4).

alter type public.property_status add value 'archived';

create type public.finding_status as enum ('pending_review', 'approved', 'rejected');

create table public.scanner_findings(
  id uuid primary key default gen_random_uuid(),
  scanner_audit_id uuid not null references public.scanner_audits(id) on delete cascade,
  source text not null,
  category text not null,
  title text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  confidence numeric(5,4) not null check (confidence >= 0 and confidence <= 1),
  finding text not null,
  recommendation text not null,
  status public.finding_status not null default 'pending_review',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.scanner_findings enable row level security;

-- Members of the owning organization read findings through the parent run.
create policy scanner_findings_org_member_read on public.scanner_findings
  for select
  using (exists (
    select 1 from public.scanner_audits a
    where a.id = scanner_audit_id
      and public.is_org_member(a.organization_id)
  ));

-- Findings are produced only by the scanner edge function and updated only
-- through the review_finding procedure, both of which use the service role.
create policy scanner_findings_service_role on public.scanner_findings
  for all to service_role
  using (true)
  with check (true);

create index idx_scanner_findings_audit on public.scanner_findings(scanner_audit_id);
create index idx_scanner_findings_status on public.scanner_findings(status);
create index idx_scanner_audits_org_created on public.scanner_audits(organization_id, created_at desc);

-- Manual scan entry point. Authorization: organization admins, or members
-- explicitly assigned to the target property. Targets must be https and are
-- rate limited per host (60 second cooldown) so scans respect site
-- policies and load.
create or replace function public.start_scanner_run(
  p_organization_id uuid,
  p_property_id uuid,
  p_target_name text,
  p_target_url text,
  p_actor_id uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_org_id uuid;
  v_rate_key text;
  v_window timestamptz;
  v_audit_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  select organization_id into v_org_id
    from public.properties
    where id = p_property_id;
  if not found then
    raise exception 'NOT_FOUND: property not found';
  end if;
  if v_org_id <> p_organization_id then
    raise exception 'VALIDATION_ERROR: property does not belong to this organization';
  end if;
  if not (
    public.is_org_admin(p_organization_id)
    or public.is_property_member(p_property_id)
  ) then
    raise exception 'FORBIDDEN: only admins or assigned property members can start a scan';
  end if;
  if p_target_name is null or length(trim(p_target_name)) = 0 then
    raise exception 'VALIDATION_ERROR: target name is required';
  end if;
  if p_target_url is null
    or p_target_url !~ '^https://[a-z0-9.-]+(:[0-9]+)?(/.*)?$' then
    raise exception 'VALIDATION_ERROR: target must be an https URL';
  end if;
  -- Per-host cooldown. Small race window is acceptable for the MVP; the
  -- fetch itself is the real throttle.
  v_rate_key := 'scanner:' || substring(p_target_url from '^https://([^/:]+)');
  select window_start into v_window
    from public.rate_limits
    where key = v_rate_key;
  if found and v_window > now() - interval '60 seconds' then
    raise exception 'RATE_LIMITED: this target was scanned recently. Wait before scanning again.';
  end if;
  insert into public.rate_limits(key, count, window_start)
    values (v_rate_key, 1, now())
    on conflict (key) do update
      set count = public.rate_limits.count + 1,
          window_start = now();
  insert into public.scanner_audits(
    organization_id, property_id, target_name, target_url, status, created_by
  )
  values (p_organization_id, p_property_id, trim(p_target_name), p_target_url, 'in_progress', p_actor_id)
  returning id into v_audit_id;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
  values (p_organization_id, p_actor_id, 'scanner.started', 'scanner_audit', v_audit_id, p_property_id,
    jsonb_build_object('target_name', p_target_name, 'target_url', p_target_url));
  return v_audit_id;
end;
$$;

-- Property create/edit/archive. Organization admins only, matching the
-- properties_admin_write RLS policy. Archiving is an update to the
-- 'archived' status and is audited as its own event.
create or replace function public.upsert_property(
  p_property_id uuid,
  p_organization_id uuid,
  p_name text,
  p_island text,
  p_atoll text,
  p_phone text,
  p_email text,
  p_address text,
  p_status public.property_status,
  p_actor_id uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_property_id uuid;
  v_previous_status public.property_status;
  v_action text;
begin
  perform public.assert_actor(p_actor_id);
  if not public.is_org_admin(p_organization_id) then
    raise exception 'FORBIDDEN: only organization admins can create or edit properties';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'VALIDATION_ERROR: property name is required';
  end if;
  if p_island is null or length(trim(p_island)) = 0 then
    raise exception 'VALIDATION_ERROR: island is required';
  end if;
  if p_property_id is null then
    insert into public.properties(
      organization_id, name, island, atoll, phone, email, address, status
    )
    values (p_organization_id, trim(p_name), trim(p_island), p_atoll, p_phone, p_email, p_address, coalesce(p_status, 'onboarding'))
    returning id into v_property_id;
    v_action := 'property.created';
  else
    select id, status into v_property_id, v_previous_status
      from public.properties
      where id = p_property_id and organization_id = p_organization_id;
    if not found then
      raise exception 'NOT_FOUND: property not found';
    end if;
    update public.properties
      set name = trim(p_name),
          island = trim(p_island),
          atoll = p_atoll,
          phone = p_phone,
          email = p_email,
          address = p_address,
          status = coalesce(p_status, status)
      where id = v_property_id;
    if p_status = 'archived' and v_previous_status is distinct from 'archived' then
      v_action := 'property.archived';
    else
      v_action := 'property.updated';
    end if;
  end if;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
  values (p_organization_id, p_actor_id, v_action, 'property', v_property_id, v_property_id,
    jsonb_build_object('name', p_name, 'island', p_island, 'status', coalesce(p_status, 'onboarding')::text));
  return v_property_id;
end;
$$;

-- Findings review. Approval or rejection records the reviewer and
-- timestamp only. It never writes to knowledge_items: knowledge changes
-- are explicit actions in the Property Brain (Phase 4), so a scan can
-- never silently overwrite verified facts.
create or replace function public.review_finding(
  p_finding_id uuid,
  p_status public.finding_status,
  p_actor_id uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_audit record;
begin
  perform public.assert_actor(p_actor_id);
  if p_status not in ('approved', 'rejected') then
    raise exception 'VALIDATION_ERROR: a finding must be approved or rejected';
  end if;
  select a.organization_id, a.property_id into v_audit
    from public.scanner_findings f
    join public.scanner_audits a on a.id = f.scanner_audit_id
    where f.id = p_finding_id;
  if not found then
    raise exception 'NOT_FOUND: finding not found';
  end if;
  if not (
    public.is_org_admin(v_audit.organization_id)
    or (
      v_audit.property_id is not null
      and public.is_property_admin(v_audit.property_id)
    )
  ) then
    raise exception 'FORBIDDEN: only admins can review findings';
  end if;
  update public.scanner_findings
    set status = p_status,
        reviewed_by = p_actor_id,
        reviewed_at = now()
    where id = p_finding_id;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
  values (v_audit.organization_id, p_actor_id, 'finding.reviewed', 'scanner_finding', p_finding_id, v_audit.property_id,
    jsonb_build_object('status', p_status::text));
end;
$$;

-- Read-only rosters for the properties UI. Direct PostgREST callers
-- are authorized inside the function; SECURITY DEFINER bypasses RLS,
-- so the checks are mandatory.
create or replace function public.list_property_team(p_property_id uuid)
returns table (user_id uuid, role public.app_role, full_name text, status public.assignment_status)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_property_member(p_property_id) then
    raise exception 'FORBIDDEN: only property members can view the team';
  end if;
  return query
    select pu.user_id, pu.role, pr.full_name, pu.status
    from public.property_users pu
    left join public.profiles pr on pr.id = pu.user_id
    where pu.property_id = p_property_id;
end;
$$;

create or replace function public.list_organization_members(p_organization_id uuid)
returns table (user_id uuid, role public.app_role, full_name text, email text)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_org_admin(p_organization_id) then
    raise exception 'FORBIDDEN: only organization admins can list members';
  end if;
  return query
    select m.user_id, m.role, pr.full_name, u.email
    from public.organization_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles pr on pr.id = m.user_id
    where m.organization_id = p_organization_id
      and m.status = 'active';
end;
$$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
