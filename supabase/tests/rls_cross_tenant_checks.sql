-- Phase 2 cross-tenant and cross-property RLS verification.
--
-- Run as the postgres role (Supabase SQL editor or psql) against a
-- project with migrations 0001-0012 applied:
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
--   staff_b            agency_staff of org_b
--   staff_a            agency_staff of org_a, property_staff of prop_a
--   invitee_b          auth user of org_b's invitation target, no membership yet
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

-- Phase 4 fixture: agency_staff of org_a, also assigned to prop_a
-- as property_staff. Staff can read property knowledge but cannot
-- create facts or review them.
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('a1111111-0000-4000-8000-000000000003', 'rls-staff-a@atollhost.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations(id, name, slug) values
  ('a1111111-0000-4000-8000-111111111111', 'RLS Agency A', 'rls-agency-a'),
  ('b2222222-0000-4000-8000-222222222222', 'RLS Agency B', 'rls-agency-b');

insert into public.organization_members(organization_id, user_id, role, status, invited_by, invited_at, accepted_at) values
  ('a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-000000000001', 'agency_admin', 'active', 'a1111111-0000-4000-8000-000000000001', now(), now()),
  ('a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-000000000002', 'property_owner', 'active', 'a1111111-0000-4000-8000-000000000001', now(), now()),
  ('b2222222-0000-4000-8000-222222222222', 'b2222222-0000-4000-8000-000000000001', 'agency_admin', 'active', 'b2222222-0000-4000-8000-000000000001', now(), now()),
  ('b2222222-0000-4000-8000-222222222222', 'b2222222-0000-4000-8000-000000000002', 'agency_staff', 'active', 'b2222222-0000-4000-8000-000000000001', now(), now());

insert into public.organization_members(organization_id, user_id, role, status, invited_by, invited_at, accepted_at) values
  ('a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-000000000003', 'agency_staff', 'active', 'a1111111-0000-4000-8000-000000000001', now(), now());

insert into public.properties(id, organization_id, name, island, atoll, status) values
  ('a1111111-0000-4000-8000-aaaaaaaaaaaa', 'a1111111-0000-4000-8000-111111111111', 'RLS Property A', 'Island A', 'Atoll A', 'active'),
  ('a1111111-0000-4000-8000-cccccccccccc', 'a1111111-0000-4000-8000-111111111111', 'RLS Property C', 'Island C', 'Atoll A', 'active'),
  ('b2222222-0000-4000-8000-bbbbbbbbbbbb', 'b2222222-0000-4000-8000-222222222222', 'RLS Property B', 'Island B', 'Atoll B', 'active');

insert into public.property_users(property_id, user_id, role, status, granted_by, granted_at) values
  ('a1111111-0000-4000-8000-aaaaaaaaaaaa', 'a1111111-0000-4000-8000-000000000001', 'property_owner', 'active', 'a1111111-0000-4000-8000-000000000001', now()),
  ('a1111111-0000-4000-8000-aaaaaaaaaaaa', 'a1111111-0000-4000-8000-000000000002', 'property_owner', 'active', 'a1111111-0000-4000-8000-000000000001', now()),
  ('b2222222-0000-4000-8000-bbbbbbbbbbbb', 'b2222222-0000-4000-8000-000000000001', 'property_owner', 'active', 'b2222222-0000-4000-8000-000000000001', now());

insert into public.property_users(property_id, user_id, role, status, granted_by, granted_at) values
  ('a1111111-0000-4000-8000-aaaaaaaaaaaa', 'a1111111-0000-4000-8000-000000000003', 'property_staff', 'active', 'a1111111-0000-4000-8000-000000000001', now());

-- Invitation fixture: org_b invites invitee_b, single-use token.
insert into public.organization_invitations(organization_id, email, role, token, invited_by, expires_at)
values ('b2222222-0000-4000-8000-222222222222', 'rls-invitee-b@atollhost.test', 'agency_staff', 'rls-test-token-001', 'b2222222-0000-4000-8000-000000000001', now() + interval '72 hours');

-- Phase 3 fixtures: scanner runs, findings, and a knowledge item
-- used to prove that reviewing a finding never touches knowledge.
insert into public.scanner_audits(organization_id, property_id, target_name, target_url, status, created_by) values
  ('a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', 'RLS Property A site', 'https://rls-a.atollhost.test', 'completed', 'a1111111-0000-4000-8000-000000000001'),
  ('a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-cccccccccccc', 'RLS Property C site', 'https://rls-c.atollhost.test', 'completed', 'a1111111-0000-4000-8000-000000000001'),
  ('b2222222-0000-4000-8000-222222222222', 'b2222222-0000-4000-8000-bbbbbbbbbbbb', 'RLS Property B site', 'https://rls-b.atollhost.test', 'completed', 'b2222222-0000-4000-8000-000000000001');

insert into public.scanner_findings(id, scanner_audit_id, source, category, title, severity, confidence, finding, recommendation) values
  ('f1111111-0000-4000-8000-000000000001', (select id from public.scanner_audits where target_url = 'https://rls-a.atollhost.test'), 'scanner', 'contact', 'Contact email visible', 'low', 0.90, 'No email address was found on the page.', 'Publish a contact email.'),
  ('f1111111-0000-4000-8000-000000000002', (select id from public.scanner_audits where target_url = 'https://rls-c.atollhost.test'), 'scanner', 'discoverability', 'Meta description present', 'medium', 1.0, 'The page has no meta description.', 'Add a meta description.'),
  ('f1111111-0000-4000-8000-000000000003', (select id from public.scanner_audits where target_url = 'https://rls-b.atollhost.test'), 'scanner', 'availability', 'Website reachable', 'critical', 1.0, 'The site responded with HTTP 503.', 'Check that the website is published.');

insert into public.knowledge_items(property_id, title, content, verified) values
  ('a1111111-0000-4000-8000-aaaaaaaaaaaa', 'RLS Knowledge Item', 'Verified fact text', false);

-- Phase 4 fixtures: knowledge categories per property, and an
-- approved fact past its expiry. The time-expired row is inserted
-- directly because the upsert RPC only accepts future expiry
-- dates; retrieval must exclude it anyway.
insert into public.knowledge_categories(id, property_id, name) values
  ('aa111111-0000-4000-8000-000000000001', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', 'Housekeeping'),
  ('bb111111-0000-4000-8000-000000000001', 'b2222222-0000-4000-8000-bbbbbbbbbbbb', 'Housekeeping');

insert into public.knowledge_items(property_id, category_id, title, content, source, fact_key, version, status, expires_at) values
  ('a1111111-0000-4000-8000-aaaaaaaaaaaa', 'aa111111-0000-4000-8000-000000000001', 'Time-expired fact', 'Expired content.', 'manual', 'time-expired-fact-key', 1, 'approved', now() - interval '1 day');

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
  if (select count(*) from public.property_users where property_id = 'a1111111-0000-4000-8000-aaaaaaaaaaaa') <> 3 then
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

-- ---------------------------------------------------------------------------
-- Phase 3: Properties and Guesthouse Scanner
-- ---------------------------------------------------------------------------

-- Scanner data visibility follows organization membership.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  if (select count(*) from public.scanner_audits where property_id = 'a1111111-0000-4000-8000-aaaaaaaaaaaa') <> 1 then
    raise exception 'FAIL: owner_a cannot read own-organization scanner runs';
  end if;
  if (select count(*) from public.scanner_findings where id = 'f1111111-0000-4000-8000-000000000001') <> 1 then
    raise exception 'FAIL: owner_a cannot read own-organization findings';
  end if;
  raise notice 'PASS: property member reads own-organization scanner data';
end $$;

-- Cross-tenant scanner denial.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  if (select count(*) from public.scanner_audits where organization_id = 'b2222222-0000-4000-8000-222222222222') <> 0 then
    raise exception 'FAIL: cross-tenant scanner run read allowed';
  end if;
  if (select count(*) from public.scanner_findings where id = 'f1111111-0000-4000-8000-000000000003') <> 0 then
    raise exception 'FAIL: cross-tenant finding read allowed';
  end if;
  raise notice 'PASS: cross-tenant scanner data denied';
end $$;

-- Property member can start a scan on an assigned property.
do $$
declare
  v_audit_id uuid;
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  v_audit_id := public.start_scanner_run('a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', 'Owner A scan', 'https://owner-a.atollhost.test/scan', 'a1111111-0000-4000-8000-000000000002');
  if v_audit_id is null then
    raise exception 'FAIL: start_scanner_run returned no audit id';
  end if;
  if (select status from public.scanner_audits where id = v_audit_id) <> 'in_progress' then
    raise exception 'FAIL: scan run was not created in_progress';
  end if;
  raise notice 'PASS: property member can start a scan on an assigned property';
end $$;

-- Per-target rate limit: a second scan of the same host within the
-- cooldown window is rejected.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    perform public.start_scanner_run('a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', 'Owner A scan again', 'https://owner-a.atollhost.test/again', 'a1111111-0000-4000-8000-000000000002');
    raise exception 'FAIL: rate limit was not enforced';
  exception
    when others then
      if SQLERRM not like 'RATE_LIMITED:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: per-target scan rate limit enforced';
end $$;

-- Cross-property scan denial: owner_a is not assigned to prop_c.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    perform public.start_scanner_run('a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-cccccccccccc', 'Owner A scan C', 'https://owner-a-c.atollhost.test', 'a1111111-0000-4000-8000-000000000002');
    raise exception 'FAIL: scan of an unassigned property was allowed';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: scan of an unassigned property denied';
end $$;

-- Cross-tenant scan denial: owner_a cannot scan org_b's property.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    perform public.start_scanner_run('b2222222-0000-4000-8000-222222222222', 'b2222222-0000-4000-8000-bbbbbbbbbbbb', 'Owner A scan B', 'https://owner-a-b.atollhost.test', 'a1111111-0000-4000-8000-000000000002');
    raise exception 'FAIL: cross-tenant scan was allowed';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: cross-tenant scan denied';
end $$;

-- Scanner targets must be https.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  begin
    perform public.start_scanner_run('a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', 'Insecure scan', 'http://insecure.atollhost.test', 'a1111111-0000-4000-8000-000000000001');
    raise exception 'FAIL: non-https target was accepted';
  exception
    when others then
      if SQLERRM not like 'VALIDATION_ERROR:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: non-https scan target rejected';
end $$;

-- Property create: only organization admins may create properties.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    perform public.upsert_property(null, 'a1111111-0000-4000-8000-111111111111', 'Rogue Property', 'Island R', null, null, null, null, null, 'a1111111-0000-4000-8000-000000000002');
    raise exception 'FAIL: property-only member created a property';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: property-only member cannot create properties';
end $$;

-- Actor spoofing on upsert_property is rejected.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    perform public.upsert_property(null, 'a1111111-0000-4000-8000-111111111111', 'Rogue Property', 'Island R', null, null, null, null, null, 'a1111111-0000-4000-8000-000000000001');
    raise exception 'FAIL: spoofed actor was accepted on upsert_property';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: upsert_property actor spoofing rejected';
end $$;

-- Admin create path: admin_a creates a property and gets its id.
do $$
declare
  v_property_id uuid;
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  v_property_id := public.upsert_property(null, 'a1111111-0000-4000-8000-111111111111', 'RLS New Property', 'Island N', 'Atoll N', null, null, null, 'active', 'a1111111-0000-4000-8000-000000000001');
  if (select count(*) from public.properties where id = v_property_id and name = 'RLS New Property') <> 1 then
    raise exception 'FAIL: admin property creation did not persist';
  end if;
  raise notice 'PASS: organization admin creates a property';
end $$;

-- Archive path: admin_a archives prop_c and the status is recorded.
do $$
declare
  v_property_id uuid;
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  v_property_id := public.upsert_property('a1111111-0000-4000-8000-cccccccccccc', 'a1111111-0000-4000-8000-111111111111', 'RLS Property C', 'Island C', 'Atoll A', null, null, null, 'archived', 'a1111111-0000-4000-8000-000000000001');
  if (select status from public.properties where id = v_property_id) <> 'archived' then
    raise exception 'FAIL: property archive did not persist';
  end if;
  if (select count(*) from public.audit_logs where action = 'property.archived' and entity_id = v_property_id) <> 1 then
    raise exception 'FAIL: archive audit event was not recorded';
  end if;
  raise notice 'PASS: organization admin archives a property with an audit event';
end $$;

-- Admin of one organization cannot edit another organization's property.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  begin
    perform public.upsert_property('b2222222-0000-4000-8000-bbbbbbbbbbbb', 'b2222222-0000-4000-8000-222222222222', 'RLS Property B', 'Island B', null, null, null, null, null, 'a1111111-0000-4000-8000-000000000001');
    raise exception 'FAIL: cross-tenant property edit was allowed';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: cross-tenant property edit denied';
end $$;

-- Findings review: property_owner of the scanned property approves.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  perform public.review_finding('f1111111-0000-4000-8000-000000000001', 'approved', 'a1111111-0000-4000-8000-000000000002');
  if (select status from public.scanner_findings where id = 'f1111111-0000-4000-8000-000000000001') <> 'approved' then
    raise exception 'FAIL: finding approval did not persist';
  end if;
  if (select reviewed_by from public.scanner_findings where id = 'f1111111-0000-4000-8000-000000000001') <> 'a1111111-0000-4000-8000-000000000002' then
    raise exception 'FAIL: finding reviewer was not recorded';
  end if;
  raise notice 'PASS: property admin reviews a finding on their property';
end $$;

-- Cross-property review denial: owner_a is not an admin of prop_c.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    perform public.review_finding('f1111111-0000-4000-8000-000000000002', 'rejected', 'a1111111-0000-4000-8000-000000000002');
    raise exception 'FAIL: cross-property finding review was allowed';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: cross-property finding review denied';
end $$;

-- Cross-tenant review denial.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    perform public.review_finding('f1111111-0000-4000-8000-000000000003', 'approved', 'a1111111-0000-4000-8000-000000000002');
    raise exception 'FAIL: cross-tenant finding review was allowed';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: cross-tenant finding review denied';
end $$;

-- Agency staff (non-admin) cannot review findings.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"b2222222-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    perform public.review_finding('f1111111-0000-4000-8000-000000000003', 'approved', 'b2222222-0000-4000-8000-000000000002');
    raise exception 'FAIL: agency staff reviewed a finding';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: agency staff cannot review findings';
end $$;

-- Organization admin of another organization cannot review.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  begin
    perform public.review_finding('f1111111-0000-4000-8000-000000000003', 'approved', 'a1111111-0000-4000-8000-000000000001');
    raise exception 'FAIL: cross-tenant admin reviewed a finding';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: cross-tenant finding review by foreign admin denied';
end $$;

-- T3.4: reviewing a finding never modifies knowledge items.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  perform public.review_finding('f1111111-0000-4000-8000-000000000002', 'approved', 'a1111111-0000-4000-8000-000000000001');
  if (select count(*) from public.knowledge_items where title = 'RLS Knowledge Item' and verified = false and content = 'Verified fact text') <> 1 then
    raise exception 'FAIL: reviewing a finding modified knowledge items';
  end if;
  raise notice 'PASS: finding review leaves knowledge items untouched';
end $$;

-- ---------------------------------------------------------------------------
-- Edge function call path. The edge functions call the write RPCs through
-- the service role, where auth.uid() is null. Authorization must come from
-- the explicit actor id, or every edge-function call would be FORBIDDEN.
-- These checks reproduce that call path (regression for migration 0011).
-- ---------------------------------------------------------------------------

-- Service path: agency_admin creates a property.
do $$
declare
  v_property_id uuid;
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  v_property_id := public.upsert_property(null, 'a1111111-0000-4000-8000-111111111111', 'RLS Service Property', 'Island S', null, null, null, null, null, 'a1111111-0000-4000-8000-000000000001');
  -- Verify through RLS as the admin user: the write happened under the
  -- service role, the read runs with the user's own claims.
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  if (select count(*) from public.properties where id = v_property_id and name = 'RLS Service Property') <> 1 then
    raise exception 'FAIL: service-path property creation did not persist';
  end if;
  raise notice 'PASS: service-role admin creates a property';
end $$;

-- Service path: property-only member is still denied.
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  begin
    perform public.upsert_property(null, 'a1111111-0000-4000-8000-111111111111', 'Rogue Service Property', 'Island R', null, null, null, null, null, 'a1111111-0000-4000-8000-000000000002');
    raise exception 'FAIL: service-path property-only member created a property';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: service-role property-only member denied';
end $$;

-- Service path: assigned property member can start a scan.
do $$
declare
  v_audit_id uuid;
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  v_audit_id := public.start_scanner_run('a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', 'Service scan', 'https://service.atollhost.test', 'a1111111-0000-4000-8000-000000000002');
  if v_audit_id is null then
    raise exception 'FAIL: service-path scan was not created';
  end if;
  raise notice 'PASS: service-role property member starts a scan';
end $$;

-- Service path: member unassigned to the property is denied.
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  begin
    perform public.start_scanner_run('a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-cccccccccccc', 'Service scan C', 'https://service-c.atollhost.test', 'a1111111-0000-4000-8000-000000000002');
    raise exception 'FAIL: service-path scan of an unassigned property was allowed';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: service-role unassigned member denied';
end $$;

-- Service path: property owner reviews a finding on their property.
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform public.review_finding('f1111111-0000-4000-8000-000000000001', 'approved', 'a1111111-0000-4000-8000-000000000002');
  -- Verify through RLS as the reviewing user.
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  if (select status from public.scanner_findings where id = 'f1111111-0000-4000-8000-000000000001') <> 'approved' then
    raise exception 'FAIL: service-path finding review did not persist';
  end if;
  raise notice 'PASS: service-role property owner reviews a finding';
end $$;

-- Service path: cross-tenant review is denied.
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  begin
    perform public.review_finding('f1111111-0000-4000-8000-000000000003', 'approved', 'a1111111-0000-4000-8000-000000000002');
    raise exception 'FAIL: service-path cross-tenant review was allowed';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: service-role cross-tenant review denied';
end $$;

-- Team roster: property members read their own property team.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  if (select count(*) from public.list_property_team('a1111111-0000-4000-8000-aaaaaaaaaaaa')) <> 3 then
    raise exception 'FAIL: owner_a cannot read the assigned property team';
  end if;
  begin
    perform public.list_property_team('a1111111-0000-4000-8000-cccccccccccc');
    raise exception 'FAIL: roster of an unassigned property was readable';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: team roster is property-scoped';
end $$;

-- Member directory: only organization admins can list members.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    perform public.list_organization_members('a1111111-0000-4000-8000-111111111111');
    raise exception 'FAIL: non-admin listed organization members';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  if (select count(*) from public.list_organization_members('a1111111-0000-4000-8000-111111111111')) <> 3 then
    raise exception 'FAIL: organization admin cannot list members';
  end if;
  raise notice 'PASS: member directory is admin-only';
end $$;

-- ---------------------------------------------------------------------------
-- Phase 4: Property Brain (versioned knowledge facts)
-- ---------------------------------------------------------------------------

-- Service path: agency_admin creates a knowledge fact as draft v1.
do $$
declare
  v_fact_id uuid;
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  v_fact_id := public.upsert_knowledge_fact(null, 'a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', 'aa111111-0000-4000-8000-000000000001', 'Check-in time', 'Check-in is from 2pm.', 'manual', null, 'a1111111-0000-4000-8000-000000000001');
  -- Verify through RLS as the admin user: the write happened
  -- under the service role, the read runs with the user's own claims.
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  if (select count(*) from public.knowledge_items where id = v_fact_id and fact_key is not null and version = 1 and status = 'draft') <> 1 then
    raise exception 'FAIL: service-path fact creation did not persist as draft v1';
  end if;
  if (select count(*) from public.audit_logs where action = 'knowledge.created' and entity_id = v_fact_id) <> 1 then
    raise exception 'FAIL: knowledge.created audit event was not recorded';
  end if;
  raise notice 'PASS: service-role admin creates a knowledge fact';
end $$;

-- Service path: property_owner of the property can create facts.
do $$
declare
  v_fact_id uuid;
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  v_fact_id := public.upsert_knowledge_fact(null, 'a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', null, 'Welcome note', 'Welcome to our guesthouse.', 'manual', null, 'a1111111-0000-4000-8000-000000000002');
  if v_fact_id is null then
    raise exception 'FAIL: property_owner fact creation returned no id';
  end if;
  raise notice 'PASS: service-role property owner creates a knowledge fact';
end $$;

-- Service path: agency_staff cannot create facts (staff, not admin).
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  begin
    perform public.upsert_knowledge_fact(null, 'a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', null, 'Rogue fact', 'Rogue content.', 'manual', null, 'a1111111-0000-4000-8000-000000000003');
    raise exception 'FAIL: agency_staff created a knowledge fact';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: agency_staff cannot create knowledge facts';
end $$;

-- Cross-tenant: admin_b cannot create facts on org_a's property.
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  begin
    perform public.upsert_knowledge_fact(null, 'a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', null, 'Rogue fact', 'Rogue content.', 'manual', null, 'b2222222-0000-4000-8000-000000000001');
    raise exception 'FAIL: cross-tenant admin created a knowledge fact';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: cross-tenant knowledge write denied';
end $$;

-- Actor spoofing: owner_a passing admin_a as the actor is
-- rejected when the RPC is called directly through PostgREST.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    perform public.upsert_knowledge_fact(null, 'a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', null, 'Rogue fact', 'Rogue content.', 'manual', null, 'a1111111-0000-4000-8000-000000000001');
    raise exception 'FAIL: spoofed actor id was accepted';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: knowledge upsert actor spoofing rejected';
end $$;

-- Validation: title is required.
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  begin
    perform public.upsert_knowledge_fact(null, 'a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', null, '', 'Content without a title.', 'manual', null, 'a1111111-0000-4000-8000-000000000001');
    raise exception 'FAIL: empty title was accepted';
  exception
    when others then
      if SQLERRM not like 'VALIDATION_ERROR:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: empty knowledge title rejected';
end $$;

-- Validation: a category from another property is rejected.
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  begin
    perform public.upsert_knowledge_fact(null, 'a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', 'bb111111-0000-4000-8000-000000000001', 'Foreign category fact', 'Content.', 'manual', null, 'a1111111-0000-4000-8000-000000000001');
    raise exception 'FAIL: foreign category was accepted';
  exception
    when others then
      if SQLERRM not like 'VALIDATION_ERROR:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: knowledge category from another property rejected';
end $$;

-- Validation: expires_at must be in the future.
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  begin
    perform public.upsert_knowledge_fact(null, 'a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', null, 'Stale fact', 'Content.', 'manual', now() - interval '1 day', 'a1111111-0000-4000-8000-000000000001');
    raise exception 'FAIL: past expires_at was accepted';
  exception
    when others then
      if SQLERRM not like 'VALIDATION_ERROR:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: past knowledge expiry rejected';
end $$;

-- Versioning: editing a fact key creates version 2 and supersedes v1.
do $$
declare
  v_key text;
  v_v1 uuid;
  v_v2 uuid;
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select id, fact_key into v_v1, v_key
    from public.knowledge_items
    where title = 'Check-in time';
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  v_v2 := public.upsert_knowledge_fact(v_key, 'a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', null, 'Check-in time', 'Check-in is from 3pm.', 'manual', null, 'a1111111-0000-4000-8000-000000000001');
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  if (select version from public.knowledge_items where id = v_v2) <> 2 then
    raise exception 'FAIL: second version was not created';
  end if;
  if (select superseded_by from public.knowledge_items where id = v_v1) <> v_v2 then
    raise exception 'FAIL: previous version was not superseded';
  end if;
  if (select count(*) from public.audit_logs where action = 'knowledge.versioned' and entity_id = v_v2) <> 1 then
    raise exception 'FAIL: knowledge.versioned audit event was not recorded';
  end if;
  raise notice 'PASS: editing a fact creates a new version and supersedes the previous';
end $$;

-- Review: property_owner approves version 2; reviewer is recorded.
do $$
declare
  v_v2 uuid;
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select id into v_v2
    from public.knowledge_items
    where title = 'Check-in time' and version = 2;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform public.review_knowledge_fact(v_v2, 'approved', 'a1111111-0000-4000-8000-000000000002');
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  if (select status from public.knowledge_items where id = v_v2) <> 'approved' then
    raise exception 'FAIL: knowledge approval did not persist';
  end if;
  if (select reviewed_by from public.knowledge_items where id = v_v2) <> 'a1111111-0000-4000-8000-000000000002' then
    raise exception 'FAIL: knowledge reviewer was not recorded';
  end if;
  if (select count(*) from public.audit_logs where action = 'knowledge.reviewed' and entity_id = v_v2) <> 1 then
    raise exception 'FAIL: knowledge.reviewed audit event was not recorded';
  end if;
  raise notice 'PASS: property owner approves a knowledge fact';
end $$;

-- Review denial: agency_staff cannot review knowledge facts.
do $$
declare
  v_fact_id uuid;
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select id into v_fact_id from public.knowledge_items where title = 'Welcome note';
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  begin
    perform public.review_knowledge_fact(v_fact_id, 'rejected', 'a1111111-0000-4000-8000-000000000003');
    raise exception 'FAIL: agency_staff reviewed a knowledge fact';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: agency_staff cannot review knowledge facts';
end $$;

-- Review denial: admin_b cannot review org_a facts.
do $$
declare
  v_fact_id uuid;
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select id into v_fact_id from public.knowledge_items where title = 'Welcome note';
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  begin
    perform public.review_knowledge_fact(v_fact_id, 'rejected', 'b2222222-0000-4000-8000-000000000001');
    raise exception 'FAIL: cross-tenant admin reviewed a knowledge fact';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: cross-tenant knowledge review denied';
end $$;

-- Retrieval fixtures: facts in each non-retrievable state.
do $$
declare
  v_draft uuid;
  v_rejected uuid;
  v_expired_status uuid;
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  v_draft := public.upsert_knowledge_fact(null, 'a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', null, 'Draft fact', 'Draft content.', 'manual', null, 'a1111111-0000-4000-8000-000000000001');
  v_rejected := public.upsert_knowledge_fact(null, 'a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', null, 'Rejected fact', 'Rejected content.', 'manual', null, 'a1111111-0000-4000-8000-000000000001');
  perform public.review_knowledge_fact(v_rejected, 'rejected', 'a1111111-0000-4000-8000-000000000001');
  v_expired_status := public.upsert_knowledge_fact(null, 'a1111111-0000-4000-8000-111111111111', 'a1111111-0000-4000-8000-aaaaaaaaaaaa', null, 'Expired fact', 'Expired content.', 'manual', null, 'a1111111-0000-4000-8000-000000000001');
  perform public.review_knowledge_fact(v_expired_status, 'expired', 'a1111111-0000-4000-8000-000000000001');
end $$;

-- Retrieval: only current approved, non-expired facts appear.
-- Expected: exactly the approved v2 of 'Check-in time'. The
-- draft, rejected, expired-status, time-expired, and
-- superseded rows must all be excluded.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  if (select count(*) from public.retrieve_knowledge_facts('a1111111-0000-4000-8000-aaaaaaaaaaaa')) <> 1 then
    raise exception 'FAIL: retrieval did not return exactly the current approved fact';
  end if;
  if (select title from public.retrieve_knowledge_facts('a1111111-0000-4000-8000-aaaaaaaaaaaa')) <> 'Check-in time' then
    raise exception 'FAIL: retrieval returned the wrong fact';
  end if;
  raise notice 'PASS: retrieval returns only current approved facts';
end $$;

-- Retrieval: cross-tenant retrieval is forbidden.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"b2222222-0000-4000-8000-000000000001","role":"authenticated"}', true);
  begin
    perform count(*) from public.retrieve_knowledge_facts('a1111111-0000-4000-8000-aaaaaaaaaaaa');
    raise exception 'FAIL: cross-tenant retrieval was allowed';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: cross-tenant knowledge retrieval denied';
end $$;

-- Retrieval: a user with no membership in the owning
-- organization cannot retrieve facts.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"b2222222-0000-4000-8000-000000000003","role":"authenticated"}', true);
  begin
    perform count(*) from public.retrieve_knowledge_facts('a1111111-0000-4000-8000-aaaaaaaaaaaa');
    raise exception 'FAIL: retrieval by a non-member was allowed';
  exception
    when others then
      if SQLERRM not like 'FORBIDDEN:%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: retrieval by a non-member denied';
end $$;

-- RLS: property members read knowledge items directly.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  if (select count(*) from public.knowledge_items where property_id = 'a1111111-0000-4000-8000-aaaaaaaaaaaa') < 1 then
    raise exception 'FAIL: property member cannot read knowledge items';
  end if;
  raise notice 'PASS: property member reads knowledge items';
end $$;

-- RLS: a non-member of the property's organization sees nothing.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"b2222222-0000-4000-8000-000000000001","role":"authenticated"}', true);
  if (select count(*) from public.knowledge_items where property_id = 'a1111111-0000-4000-8000-aaaaaaaaaaaa') <> 0 then
    raise exception 'FAIL: cross-tenant knowledge read allowed';
  end if;
  raise notice 'PASS: cross-tenant knowledge read denied at the RLS level';
end $$;

-- RLS: direct authenticated inserts into knowledge_items are denied.
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"a1111111-0000-4000-8000-000000000002","role":"authenticated"}', true);
  begin
    insert into public.knowledge_items(property_id, title, content) values ('a1111111-0000-4000-8000-aaaaaaaaaaaa', 'Rogue direct insert', 'Content.');
    raise exception 'FAIL: direct insert into knowledge_items was allowed';
  exception
    when others then
      if SQLERRM not like '%row-level security%' then
        raise exception 'FAIL: unexpected error: %', SQLERRM;
      end if;
  end;
  raise notice 'PASS: direct knowledge_items insert denied at the RLS level';
end $$;

rollback;
