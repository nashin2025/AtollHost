-- Phase 2: Identity, organization, and tenant isolation
--
-- Adds the membership/assignment lifecycle required by DATA_MODEL.md section 2
-- (status, inviter, invitation/acceptance timestamps, granted-by metadata),
-- the organization invitation flow (random, single-use, expiring tokens bound to
-- the recipient email), and fixes three tenant-isolation defects found in the
-- applied baseline:
--   1. organizations_member_read allowed ANY authenticated user to read every
--      organization row (cross-tenant information leak).
--   2. org_member_insert_self allowed any authenticated user to insert
--      themselves into any organization with any role (privilege escalation).
--   3. organizations_create allowed direct client-side org creation with no
--      transactional membership creation.
-- Role helpers are tightened: revocation (status) now revokes access promptly,
-- agency_admin is the only organization-admin role, and property-level roles
-- (property_owner/property_manager/property_staff) only reach properties they
-- are explicitly assigned to.

-- Lifecycle states
create type public.membership_status as enum ('active', 'revoked');
create type public.assignment_status as enum ('active', 'revoked');

-- organization_members: invitation and acceptance lifecycle
alter table public.organization_members
  add column if not exists status public.membership_status not null default 'active',
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists invited_at timestamptz,
  add column if not exists accepted_at timestamptz;

update public.organization_members
  set invited_at = created_at, accepted_at = created_at
  where invited_at is null;

-- property_users (property_members): assignment lifecycle
alter table public.property_users
  add column if not exists status public.assignment_status not null default 'active',
  add column if not exists granted_by uuid references auth.users(id) on delete set null,
  add column if not exists granted_at timestamptz not null default now();

-- Invitations: random, single-use, expiring, bound to the expected recipient email
create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.app_role not null,
  token text not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  constraint organization_invitations_expiry check (expires_at > created_at)
);

alter table public.organization_invitations enable row level security;

create policy invitations_admin on public.organization_invitations
  for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy invitations_service_role on public.organization_invitations
  for all to service_role
  using (true)
  with check (true);

create unique index idx_invitations_pending_email
  on public.organization_invitations (organization_id, lower(email))
  where accepted_at is null and revoked_at is null;

create index idx_invitations_org on public.organization_invitations (organization_id, created_at desc);

-- Tightened role helpers.
-- is_org_admin: only agency_admin (agency_staff is staff, not an administrator).
create or replace function public.is_org_admin(target_org uuid) returns boolean
  language sql security definer set search_path = public as $$
    select exists (
      select 1 from public.organization_members m
      where m.organization_id = target_org
        and m.user_id = auth.uid()
        and m.role = 'agency_admin'
        and m.status = 'active'
    );
  $$;

-- is_org_staff: organization-level employees (agency_admin and agency_staff).
create or replace function public.is_org_staff(target_org uuid) returns boolean
  language sql security definer set search_path = public as $$
    select exists (
      select 1 from public.organization_members m
      where m.organization_id = target_org
        and m.user_id = auth.uid()
        and m.role in ('agency_admin', 'agency_staff')
        and m.status = 'active'
    );
  $$;

-- is_org_member: any active member (revoked members lose all access promptly).
create or replace function public.is_org_member(target_org uuid) returns boolean
  language sql security definer set search_path = public as $$
    select exists (
      select 1 from public.organization_members m
      where m.organization_id = target_org
        and m.user_id = auth.uid()
        and m.status = 'active'
    );
  $$;

-- is_property_member: explicitly assigned property users, plus organization-level
-- staff who manage every property in the organization. Property-level roles
-- (property_owner/property_manager/property_staff) reach only assigned properties.
create or replace function public.is_property_member(target_property uuid) returns boolean
  language sql security definer set search_path = public as $$
    select exists (
      select 1 from public.property_users pu
      where pu.property_id = target_property
        and pu.user_id = auth.uid()
        and pu.status = 'active'
    ) or exists (
      select 1 from public.properties p
      join public.organization_members m on m.organization_id = p.organization_id
      where p.id = target_property
        and m.user_id = auth.uid()
        and m.role in ('agency_admin', 'agency_staff')
        and m.status = 'active'
    );
  $$;

-- is_property_admin: organization admins, or property_owner/property_manager
-- assignments on the specific property.
create or replace function public.is_property_admin(target_property uuid) returns boolean
  language sql security definer set search_path = public as $$
    select exists (
      select 1 from public.properties p
      join public.organization_members m on m.organization_id = p.organization_id
      where p.id = target_property
        and m.user_id = auth.uid()
        and m.role = 'agency_admin'
        and m.status = 'active'
    ) or exists (
      select 1 from public.property_users pu
      where pu.property_id = target_property
        and pu.user_id = auth.uid()
        and pu.role in ('property_owner', 'property_manager')
        and pu.status = 'active'
    );
  $$;

-- RLS fix 1: close the cross-tenant read leak. Only active organization
-- members (and the service role) can read organization rows.
drop policy if exists organizations_member_read on public.organizations;
create policy organizations_member_read on public.organizations
  for select
  using (public.is_org_member(id) or auth.role() = 'service_role');

-- RLS fix 2: close the self-insert privilege escalation. Membership rows are
-- created only by privileged server code (edge functions and the SECURITY
-- DEFINER procedures below).
drop policy if exists org_member_insert_self on public.organization_members;

-- RLS fix 3: organization creation is server-mediated. The create-organization
-- edge function creates the organization and the first agency_admin membership
-- transactionally. Remove the client-side insert policy.
drop policy if exists organizations_create on public.organizations;

-- Service-role policies for the privileged server paths used by edge functions.
create policy organizations_service_role on public.organizations
  for all to service_role
  using (true)
  with check (true);

create policy org_members_service_role on public.organization_members
  for all to service_role
  using (true)
  with check (true);

create policy property_users_service_role on public.property_users
  for all to service_role
  using (true)
  with check (true);

-- Audit events: edge functions (service role) and self-authored client events.
drop policy if exists audit_logs_member_insert on public.audit_logs;
create policy audit_logs_member_insert on public.audit_logs
  for insert
  with check (
    auth.role() = 'service_role'
    or (
      actor_user_id = auth.uid()
      and (organization_id is null or public.is_org_member(organization_id))
    )
  );

-- Transactional privileged procedures called by the edge functions. The edge
-- function verifies the caller's JWT server-side and passes the verified user
-- id; these procedures enforce authorization against that id.
--
-- Actor verification: an authenticated caller can invoke these RPCs directly
-- through PostgREST, so every procedure rejects an actor id that does not
-- match the authenticated user. The service role bypasses the check because
-- it has no auth.uid(); only the edge functions, which verify the JWT
-- themselves, use the service path.

create or replace function public.assert_actor(p_actor_id uuid)
  returns void
  language plpgsql security definer set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and p_actor_id is distinct from auth.uid() then
    raise exception 'FORBIDDEN: actor id must match the authenticated user';
  end if;
end;
$$;

create or replace function public.create_organization(p_name text, p_slug text, p_user_id uuid)
  returns uuid
  language plpgsql security definer set search_path = public
as $$
declare
  v_org_id uuid;
begin
  perform public.assert_actor(p_user_id);
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'VALIDATION_ERROR: organization name is required';
  end if;
  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'VALIDATION_ERROR: slug must use lowercase letters, numbers, and single hyphens';
  end if;
  insert into public.organizations(name, slug)
    values (trim(p_name), p_slug)
    returning id into v_org_id;
  insert into public.organization_members(organization_id, user_id, role, status, invited_by, invited_at, accepted_at)
    values (v_org_id, p_user_id, 'agency_admin', 'active', p_user_id, now(), now())
    on conflict (organization_id, user_id) do update
      set role = 'agency_admin',
          status = 'active',
          invited_by = p_user_id,
          invited_at = now(),
          accepted_at = now();
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, metadata)
    values (v_org_id, p_user_id, 'organization.created', 'organization', v_org_id,
      jsonb_build_object('name', p_name, 'slug', p_slug));
  return v_org_id;
end;
$$;

create or replace function public.create_invitation(p_organization_id uuid, p_email text, p_role public.app_role, p_actor_id uuid)
  returns table (invitation_id uuid, token text)
  language plpgsql security definer set search_path = public
as $$
declare
  v_token text;
  v_org_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = p_actor_id
      and m.role = 'agency_admin'
      and m.status = 'active'
  ) then
    raise exception 'FORBIDDEN: only organization admins can invite members';
  end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'VALIDATION_ERROR: a valid recipient email is required';
  end if;
  if exists (
    select 1 from public.organization_invitations i
    where i.organization_id = p_organization_id
      and lower(i.email) = lower(p_email)
      and i.accepted_at is null
      and i.revoked_at is null
  ) then
    raise exception 'CONFLICT: a pending invitation already exists for this email';
  end if;
  if exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id in (select id from auth.users where lower(email) = lower(p_email))
      and m.status = 'active'
  ) then
    raise exception 'CONFLICT: this user is already an active member';
  end if;
  v_token := replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '');
  insert into public.organization_invitations(organization_id, email, role, token, invited_by, expires_at)
    values (p_organization_id, lower(p_email), p_role, v_token, p_actor_id, now() + interval '72 hours')
    returning id into invitation_id;
  token := v_token;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, metadata)
    values (p_organization_id, p_actor_id, 'invitation.created', 'organization_invitation', invitation_id,
      jsonb_build_object('email', lower(p_email), 'role', p_role::text));
  return next;
end;
$$;

create or replace function public.accept_invitation(p_token text, p_user_id uuid)
  returns uuid
  language plpgsql security definer set search_path = public
as $$
declare
  v_invitation record;
  v_org_id uuid;
  v_user_email text;
begin
  perform public.assert_actor(p_user_id);
  select * into v_invitation
    from public.organization_invitations
    where token = p_token;
  if not found then
    raise exception 'NOT_FOUND: invitation not found';
  end if;
  if v_invitation.revoked_at is not null then
    raise exception 'CONFLICT: invitation was revoked';
  end if;
  if now() > v_invitation.expires_at then
    raise exception 'CONFLICT: invitation expired';
  end if;
  select lower(email) into v_user_email from auth.users where id = p_user_id;
  if v_user_email is null or v_user_email <> v_invitation.email then
    raise exception 'FORBIDDEN: invitation is bound to a different email address';
  end if;
  -- Atomic claim: the conditional update serializes concurrent accept attempts
  -- and enforces single use.
  update public.organization_invitations
    set accepted_at = now(), accepted_by = p_user_id
    where id = v_invitation.id
      and accepted_at is null
      and revoked_at is null
    returning organization_id into v_org_id;
  if not found then
    raise exception 'CONFLICT: invitation was already used';
  end if;
  insert into public.organization_members(organization_id, user_id, role, status, invited_by, invited_at, accepted_at)
    values (v_org_id, p_user_id, v_invitation.role, 'active', v_invitation.invited_by, v_invitation.created_at, now())
    on conflict (organization_id, user_id) do update
      set role = excluded.role,
          status = 'active',
          invited_by = excluded.invited_by,
          invited_at = excluded.invited_at,
          accepted_at = now();
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, metadata)
    values (v_org_id, p_user_id, 'invitation.accepted', 'organization_invitation', v_invitation.id, '{}'::jsonb);
  return v_org_id;
end;
$$;

create or replace function public.revoke_membership(p_organization_id uuid, p_user_id uuid, p_actor_id uuid)
  returns void
  language plpgsql security definer set search_path = public
as $$
begin
  perform public.assert_actor(p_actor_id);
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = p_actor_id
      and m.role = 'agency_admin'
      and m.status = 'active'
  ) then
    raise exception 'FORBIDDEN: only organization admins can revoke memberships';
  end if;
  if p_actor_id = p_user_id then
    raise exception 'CONFLICT: admins cannot revoke their own membership';
  end if;
  if (
    select count(*) from public.organization_members m
    where m.organization_id = p_organization_id
      and m.role = 'agency_admin'
      and m.status = 'active'
  ) = 1 and exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = p_user_id
      and m.role = 'agency_admin'
      and m.status = 'active'
  ) then
    raise exception 'CONFLICT: cannot revoke the only organization admin';
  end if;
  update public.organization_members
    set status = 'revoked'
    where organization_id = p_organization_id and user_id = p_user_id;
  if not found then
    raise exception 'NOT_FOUND: membership not found';
  end if;
  -- Revocation cascades to property assignments in this organization.
  update public.property_users pu
    set status = 'revoked'
    where pu.user_id = p_user_id
      and pu.property_id in (select id from public.properties where organization_id = p_organization_id);
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, metadata)
    values (p_organization_id, p_actor_id, 'membership.revoked', 'organization_member', p_user_id, '{}'::jsonb);
end;
$$;

create or replace function public.assign_property_member(p_property_id uuid, p_user_id uuid, p_role public.app_role, p_actor_id uuid)
  returns void
  language plpgsql security definer set search_path = public
as $$
declare
  v_org_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  select organization_id into v_org_id from public.properties where id = p_property_id;
  if not found then
    raise exception 'NOT_FOUND: property not found';
  end if;
  if not (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = v_org_id
        and m.user_id = p_actor_id
        and m.role = 'agency_admin'
        and m.status = 'active'
    ) or exists (
      select 1 from public.property_users pu
      where pu.property_id = p_property_id
        and pu.user_id = p_actor_id
        and pu.role in ('property_owner', 'property_manager')
        and pu.status = 'active'
    )
  ) then
    raise exception 'FORBIDDEN: only admins can assign property members';
  end if;
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = v_org_id
      and m.user_id = p_user_id
      and m.status = 'active'
  ) then
    raise exception 'CONFLICT: user is not an active organization member';
  end if;
  if p_role in ('agency_admin', 'agency_staff') then
    raise exception 'VALIDATION_ERROR: organization roles cannot be assigned to a property';
  end if;
  insert into public.property_users(property_id, user_id, role, status, granted_by, granted_at)
    values (p_property_id, p_user_id, p_role, 'active', p_actor_id, now())
    on conflict (property_id, user_id) do update
      set role = excluded.role,
          status = 'active',
          granted_by = excluded.granted_by,
          granted_at = now();
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
    values (v_org_id, p_actor_id, 'property_member.assigned', 'property_user', p_user_id, p_property_id,
      jsonb_build_object('role', p_role::text));
end;
$$;

create or replace function public.revoke_property_member(p_property_id uuid, p_user_id uuid, p_actor_id uuid)
  returns void
  language plpgsql security definer set search_path = public
as $$
declare
  v_org_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  select organization_id into v_org_id from public.properties where id = p_property_id;
  if not found then
    raise exception 'NOT_FOUND: property not found';
  end if;
  if not (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = v_org_id
        and m.user_id = p_actor_id
        and m.role = 'agency_admin'
        and m.status = 'active'
    ) or exists (
      select 1 from public.property_users pu
      where pu.property_id = p_property_id
        and pu.user_id = p_actor_id
        and pu.role in ('property_owner', 'property_manager')
        and pu.status = 'active'
    )
  ) then
    raise exception 'FORBIDDEN: only admins can revoke property assignments';
  end if;
  update public.property_users
    set status = 'revoked'
    where property_id = p_property_id and user_id = p_user_id;
  if not found then
    raise exception 'NOT_FOUND: property assignment not found';
  end if;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
    values (v_org_id, p_actor_id, 'property_member.revoked', 'property_user', p_user_id, p_property_id, '{}'::jsonb);
end;
$$;

-- Maintain updated_at on every table that carries the column.
create or replace function public.set_updated_at() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.properties for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.guests for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.reservations for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.enquiries for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.knowledge_items for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.automations for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.integrations for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.guest_journey_events for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tax_profiles for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.mgis_records for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.scanner_audits for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.review_publish_records for each row execute function public.set_updated_at();

create index idx_org_members_org_status on public.organization_members(organization_id, status);
create index idx_property_users_property_status on public.property_users(property_id, status);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
