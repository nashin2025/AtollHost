-- 0020: grant the operator account organization admin (agency_admin) rights.
-- Idempotent: safe to re-run. Requires the auth user to exist already
-- (sign up through the app first so the password is set by the owner).
-- Targets the primary organization (the seeded demo-agency when present,
-- otherwise the oldest organization) and deliberately skips E2E test orgs.

do $$
declare
  v_email constant text := 'shannashin2018@gmail.com';
  v_user_id uuid;
  v_org_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower(v_email);

  if v_user_id is null then
    raise exception
      'No auth user with email % exists yet. Sign up through the app first, then re-run this migration.',
      v_email;
  end if;

  -- Resolve the primary organization: the seeded demo-agency when present,
  -- otherwise the oldest organization. E2E test orgs are left untouched.
  select id into v_org_id
  from public.organizations
  where slug = 'demo-agency';

  if v_org_id is null then
    select id into v_org_id
    from public.organizations
    order by created_at
    limit 1;
  end if;

  if v_org_id is null then
    raise exception 'No organization exists to grant membership in.';
  end if;

  -- Grant active agency_admin membership. This mirrors the membership upsert
  -- in public.create_organization (migration 0007).
  insert into public.organization_members(
    organization_id, user_id, role, status, invited_by, invited_at, accepted_at
  )
  values (
    v_org_id, v_user_id, 'agency_admin', 'active', v_user_id, now(), now()
  )
  on conflict (organization_id, user_id) do update
    set role = 'agency_admin',
        status = 'active',
        invited_by = v_user_id,
        invited_at = now(),
        accepted_at = now();
end;
$$;
