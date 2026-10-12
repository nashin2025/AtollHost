-- Phase 2 cross-tenant and cross-property RLS verification.
--
-- Run as the postgres role (Supabase SQL editor or psql) against a
-- project with migrations 0001-0007 applied:
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/rls_cross_tenant_checks.sql
--
-- The script creates two agencies with distinct users and properties,
-- impersonates each user through request.jwt.claims, and asserts the
-- tenant-isolation guarantees. Every check raises on violation and
-- prints PASS on success. The whole run is wrapped in a transaction
-- that is rolled back, so the script is safe to re-run and leaves no
-- fixtures behind.
--
-- Fixtures (fixed ids so the checks read clearly):
--   org_a / org_b        two agencies
--   admin_a              agency_admin of org_a, property_owner of prop_a
--   owner_a              property_owner member of org_a, assigned to prop_a only
--   admin_b              agency_admin of org_b, property_owner of prop_b
--   staff_b              agency_staff of org_b
--   invitee_b            auth user of org_b's invitation target, no membership yet
--   prop_a, prop_c       properties of org_a
--   prop_b               property of org_b

begin;

-- ---------------------------------------------------------------------------
-- Fixtures (postgres role, before impersonation)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a1111111-0000-4000-8000-000000000001', 'rls-admin-a@atollhost.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('a1111111-0000-4000-8000-000000000002', 'rls-owner-a@atollhost.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('b2222222-0000-4000-8000-000000000001', 'rls-admin-b@atollhost.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('b2222222-0000-4000-8000-000000000002', 'rls-staff-b@atollhost.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('b2222222-0000-4000-8000-000000000003', 'rls-invitee-b@atollhost.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations(id, name, slug) values
  ('a1111111-0000-4000-8000-111111111111', 'RLS Agency A', 'rls-agency-a'),
  ('b2222222-0000-4000-8000-222222222222', 'RLS Agency B', 'rls-agency-b');

insert into public.organization_members(organization_id, user_id, role, status, invited_by, invited_at, accepted_at) values
  ('a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-000000000001', 'agency_admin', 'active', 'a1111111-0000-4000-8000-000000000001', now(), now()),
  ('a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-000000000002', 'property_owner', 'active', 'a1111111-0000-4000-8000-000000000001', now(), now()),
  ('b2222222-0000-4000-8000-222222222222', 'b2222222-0000-4000-8000-000000000001', 'agency_admin', 'active', 'b2222222-0000-4000-8000-000000000001', now(), now()),
  ('b2222222-0000-4000-8000-222222222222', 'b2222222-0000-4000-8000-000000000002', 'agency_staff', 'active', 'b2222222-0000-4000-8000-000000000001', now(), now());

insert into public.properties(id, organization_id, name, island, atoll, status) values
  ('a1111111-0000-4000-8000-aaaaaaaaaaaa', 'a1111111-0000-4000-8000-111111111111', 'RLS Property A', 'Island A', 'Atoll A', 'active'),
  ('a1111111-0000-4000-8000-cccccccccccc', 'a1111111-0000-4000-8000-111111111111', 'RLS Property C', 'Island C', 'Atoll A', 'active'),
  ('b2222222-0000-4000-8000-bbbbbbbbbbbb', 'b2222222-0000-4000-8000-222222222222', 'RLS Property B', 'Island B', 'Atoll B', 'active');

insert into public.property_users(property_id, user_id, role, status, granted_by, granted_at) values
  ('a1111111-0000-4000-8000-aaaaaaaaaaaa', 'a1111111-0000-4000-8000-000000000001', 'property_owner', 'active', 'a1111111-0000-4000-8000-000000000001', now()),
  ('a1111111-0000-4000-8000-aaaaaaaaaaaa', 'a1111111-0000-4000-8000-000000000002', 'property_owner', 'active', 'a1111111-0000-4000-8000-000000000001', now()),
  ('b2222222-0000-4000-8000-bbbbbbbbbbbb', 'b2222222-0000-4000-8000-000000000001', 'property_owner', 'active', 'b2222222-0000-4000-8000-000000000001', now());

-- Invitation fixture: org_b invites invitee_b, single-use token.
insert into public.organization_invitations(organization_id, email, role, token, invited_by, expires_at)
values ('b2222222-0000-4000-8000-222222222222', 'rls-invitee-b@atollhost.test', 'agency_staff', 'rls-test-token-001', 'b2222222-0000-4000-8000-000000000001', now() + interval '72 hours');

-- ---------------------------------------------------------------------------
-- Checks. From here on every statement runs as the authenticated role
-- with the impersonated user's claims.
-- ---------------------------------------------------------------------------

set local role authenticated;

-- Positive control: admin_a reads its own organization.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  if (select count(*) from public.organizations where id = 'a1111111-0000-4000-8000-111111111111') <> 1 then
    raise exception 'FAIL: admin_a cannot read its own organization';
  end if;
  raise notice 'PASS: admin_a reads its own organization';
end $$;

-- Cross-tenant: admin_a cannot read org_b.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  if (select count(*) from public.organizations where id = 'b2222222-0000-4000-8000-222222222222') <> 0 then
    raise exception 'FAIL: cross-tenant organization read allowed';
  end if;
  if (select count(*) from public.properties where id = 'b2222222-0000-4000-8000-bbbbbbbbbbbb') <> 0 then
    raise exception 'FAIL: cross-tenant property read allowed';
  end if;
  if (select count(*) from public.organization_members where organization_id = 'b2222222-0000-4000-8000-222222222222') <> 0 then
    raise exception 'FAIL: cross-tenant membership read allowed';
  end if;
  if (select count(*) from public.property_users where property_id = 'b2222222-0000-4000-8000-bbbbbbbbbbbb') <> 0 then
    raise exception 'FAIL: cross-tenant property assignment read allowed';
  end if;
  raise notice 'PASS: admin_a cannot read any org_b data';
end $$;

-- Positive control: owner_a reads property assignments of its assigned property.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  if (select count(*) from public.property_users where property_id = 'a1111111-0000-4000-8000-aaaaaaaaaaaa') <> 2 then
    raise exception 'FAIL: owner_a cannot read its assigned property assignments';
  end if;
  raise notice 'PASS: owner_a reads assignments of its assigned property';
end $$;

-- Cross-property (same organization): owner_a cannot read prop_c assignments.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  if (select count(*) from public.property_users where property_id = 'a1111111-0000-4000-8000-cccccccccccc') <> 0 then
    raise exception 'FAIL: cross-property read allowed for unassigned property';
  end if;
  raise notice 'PASS: owner_a cannot read property assignments of an unassigned property';
end $$;

-- Positive control: org_a agency_admin reads every org_a property assignment.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  if (select count(*) from public.property_users where property_id = 'a1111111-0000-4000-8000-cccccccccccc') <> 0 then
    raise exception 'FAIL: agency_admin should read all organization property assignments';
  end if;
  raise notice 'PASS: agency_admin reads all organization property assignments';
end $$;

-- Property-only member cannot invite: create_invitation with own id.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    perform public.create_invitation('a1111111-0000-4000-8000-111111111111', 'target@atollhost.test', 'agency_staff', 'a1111111-0000-4000-8000-000000000002');
    raise exception 'FAIL: property-only member created an invitation';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: property-only member cannot invite';
end $$;

-- Actor spoofing: owner_a passing admin_a as the actor is rejected.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    perform public.create_invitation('a1111111-0000-4000-8000-111111111111', 'target@atollhost.test', 'agency_staff', 'a1111111-0000-4000-8000-000000000001');
    raise exception 'FAIL: spoofed actor id was accepted';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: actor id spoofing rejected';
end $$;

-- Admin invitation success path: direct call returns a usable token.
-- Regression: the RETURNS TABLE output parameter "token" collided with
-- the organization_invitations.token column in the RETURNING clause,
-- which broke the RPC on every successful invite (the FORBIDDEN-only
-- tests above raise before reaching that statement).
do $$
declare
  v_rec record;
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  select * into v_rec from public.create_invitation('a1111111-0000-4000-8000-111111111111', 'direct@atollhost.test', 'agency_staff', 'a1111111-0000-4000-8000-000000000001');
  if v_rec.invitation_id is null or v_rec.token !~ '^[0-9a-f]{64}$' then
    raise exception 'FAIL: create_invitation did not return a valid token';
  end if;
  raise notice 'PASS: admin invitation returns valid token';
end $$;

-- Client-side organization creation is denied at the database level.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    insert into public.organizations(name, slug) values ('RLS Rogue', 'rls-rogue');
    raise exception 'FAIL: client-side organization insert was allowed';
  exception
    when others then
      if SQLERRM not like '%row-level security%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: client-side organization insert denied';
end $$;

-- Self-insert into organization_members is denied at the database level.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    insert into public.organization_members(organization_id, user_id, role)
    values ('a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-000000000002', 'agency_admin');
    raise exception 'FAIL: membership self-insert was allowed';
  exception
    when others then
      if SQLERRM not like '%row-level security%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: membership self-insert denied';
end $$;

-- audit_logs insert with a different actor is denied.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id)
    values ('a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-000000000001', 'test.event', 'test', gen_random_uuid());
    raise exception 'FAIL: audit log insert with foreign actor was allowed';
  exception
    when others then
      if SQLERRM not like '%row-level security%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: audit log insert with foreign actor denied';
end $$;

-- Invitation email binding: admin_a cannot accept an invitation sent to admin_b.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  begin
    perform public.accept_invitation('rls-test-token-001', 'a1111111-0000-4000-8000-000000000001');
    raise exception 'FAIL: invitation accepted by a different email';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: invitation bound to a different email is rejected';
end $$;

-- Invitation acceptance: invitee_b accepts, then the token is single-use.
do $$
declare
  v_org_id uuid;
begin
  perform set_config('request.jwt.claims', '{"sub":"b2222222-0000-4000-8000-000000000003","role":"authenticated"}', true);
  v_org_id := public.accept_invitation('rls-test-token-001', 'b2222222-0000-4000-8000-000000000003');
  if v_org_id <> 'b2222222-0000-4000-8000-222222222222' then
    raise exception 'FAIL: invitation returned the wrong organization';
  end if;
  if (select count(*) from public.organization_invitations where token = 'rls-test-token-001' and accepted_at is null) <> 0 then
    raise exception 'FAIL: invitation was not marked accepted';
  end if;
  begin
    perform public.accept_invitation('rls-test-token-001', 'b2222222-0000-4000-8000-000000000003');
    raise exception 'FAIL: invitation token was reused';
  exception
    when others then
      if SQLERRM not like 'CONFLICT:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: invitation acceptance is single-use';
end $$;

-- Revocation: admin_b revokes staff_b; staff_b loses access immediately.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"b2222222-0000-4000-8000-000000000001","role":"authenticated"}', true);
  perform public.revoke_membership('b2222222-0000-4000-8000-222222222222', 'b2222222-0000-4000-8000-000000000002', 'b2222222-0000-4000-8000-000000000001');
  perform set_config('request.jwt.claims', '{"sub":"b2222222-0000-4000-8000-000000000002","role":"authenticated"}', true);
  if (select count(*) from public.organizations where id = 'b2222222-0000-4000-8000-222222222222') <> 0 then
    raise exception 'FAIL: revoked member still reads the organization';
  end if;
  if (select count(*) from public.properties where id = 'b2222222-0000-4000-8000-bbbbbbbbbbbb') <> 0 then
    raise exception 'FAIL: revoked member still reads organization properties';
  end if;
  raise notice 'PASS: revocation removes access immediately';
end $$;

-- Self-revocation is denied.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"b2222222-0000-4000-8000-000000000001","role":"authenticated"}', true);
  begin
    perform public.revoke_membership('b2222222-0000-4000-8000-222222222222', 'b2222222-0000-4000-8000-000000000001', 'b2222222-0000-4000-8000-000000000001');
    raise exception 'FAIL: admin revoked their own membership';
  exception
    when others then
      if SQLERRM not like 'CONFLICT:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: self-revocation denied';
end $$;

rollback;
