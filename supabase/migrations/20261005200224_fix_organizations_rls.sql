-- Fix organizations RLS to allow authenticated users to create organizations
drop policy if exists organizations_admin_write on public.organizations;
create policy organizations_admin_write on public.organizations
  for all
  using (
    public.is_org_admin(id)
    or auth.role() = 'service_role'
  )
  with check (
    public.is_org_admin(id)
    or auth.role() = 'service_role'
    or (auth.uid() is not null and current_setting('request.method', true) = 'POST')
  );
