-- 0023: let organization admins read owner access grants for their properties.
-- The table previously allowed each owner to read only their own grants plus
-- service-role access, so an agency admin reviewing who has access to a
-- property got nothing back. Reads only: grants and revocations stay with the
-- grant_owner_access and revoke_owner_access procedures.

create policy owner_access_org_admin_read on public.owner_property_access
  for select
  using (public.is_org_admin(organization_id));
