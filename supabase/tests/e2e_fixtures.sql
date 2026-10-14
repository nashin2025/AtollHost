-- E2E fixtures for the Playwright suite in tests/e2e.
-- Re-runnable: existing rows are left untouched. Run against the target
-- project once (dashboard SQL editor, psql, or the management API):
--   INSERT_USER_PASSWORD below is test-only credential for a dev project.

do $$
declare
  v_user_id uuid := 'e2e00000-0000-4000-8000-000000000001';
  v_org_id uuid := 'e2e00000-0000-4000-8000-0000000000aa';
  v_property_id uuid := 'e2e00000-0000-4000-8000-0000000000bb';
begin
  if not exists (select 1 from auth.users where id = v_user_id) then
    insert into auth.users(
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    )
    values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'e2e-admin@atollhost.test',
      extensions.crypt('E2ePassw0rd!2026', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{}'::jsonb,
      '{"full_name":"E2E Admin"}'::jsonb
    );
  end if;

  -- The handle_new_user trigger creates the profile; keep this as a guard.
  insert into public.profiles(id, full_name)
  values (v_user_id, 'E2E Admin')
  on conflict (id) do nothing;

  if not exists (select 1 from public.organizations where id = v_org_id) then
    insert into public.organizations(id, name, slug)
    values (v_org_id, 'E2E Agency', 'e2e-agency');
  end if;

  insert into public.organization_members(organization_id, user_id, role, status)
  values (v_org_id, v_user_id, 'agency_admin', 'active')
  on conflict (organization_id, user_id)
  do update set role = 'agency_admin', status = 'active';

  if not exists (select 1 from public.properties where id = v_property_id) then
    insert into public.properties(id, organization_id, name, island, atoll, status)
    values (v_property_id, v_org_id, 'Lagoon Villa', 'Thulusdhoo', 'Kaafu', 'active');
  end if;
end;
$$;
