-- Fix organization_members RLS to allow users to add themselves as admin after creating org
drop policy if exists org_admin_write on public.organization_members;
create policy org_member_insert_self on public.organization_members
  for insert
  to authenticated
  with check (user_id = auth.uid());
create policy org_admin_write on public.organization_members
  for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
