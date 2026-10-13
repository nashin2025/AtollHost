-- 0020: grant the operator account organization admin (agency_admin) rights.
-- Idempotent: safe to re-run. Requires the auth user to exist already
-- (sign up through the app first so the password is set by the owner).

do $$
declare
  v_email constant text := 'shannashin2018@gmail.com';
  v_user_id uuid;
  v_org record;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower(v_email);

  if v_user_id is null then
    raise exception
      'No auth user with email % exists yet. Sign up through the app first, then re-run this migration.',
      v_email;
  end if;

  -- Ensure there is an organization to administer (reuses the seeded agency when present).
  if not exists (select 1 from public.organizations) then
    insert into public.organizations(name, slug) values ('AtollHost', 'atollhost');
  end if;

  -- Grant active agency_admin membership in every organization. This mirrors the
  -- membership upsert in public.create_organization (migration 0007).
  for v_org in select id from public.organizations loop
    insert into public.organization_members(
      organization_id, user_id, role, status, invited_by, invited_at, accepted_at
    )
    values (
      v_org.id, v_user_id, 'agency_admin', 'active', v_user_id, now(), now()
    )
    on conflict (organization_id, user_id) do update
      set role = 'agency_admin',
          status = 'active',
          invited_by = v_user_id,
          invited_at = now(),
          accepted_at = now();
  end loop;
end;
$$;
