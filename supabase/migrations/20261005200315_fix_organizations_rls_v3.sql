-- Fix organizations RLS: allow authenticated users to create orgs, admins to update/delete
drop policy if exists organizations_admin_write on public.organizations;

-- Allow authenticated users to create organizations (they become admin via onboarding)
create policy organizations_create on public.organizations
  for insert
  to authenticated
  with check (true);

-- Allow org admins and service role to update
create policy organizations_update on public.organizations
  for update
  using (
    public.is_org_admin(id)
    or auth.role() = 'service_role'
  )
  with check (
    public.is_org_admin(id)
    or auth.role() = 'service_role'
  );

-- Allow org admins and service role to delete
create policy organizations_delete on public.organizations
  for delete
  using (
    public.is_org_admin(id)
    or auth.role() = 'service_role'
  );
